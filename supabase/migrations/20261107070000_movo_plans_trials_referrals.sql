begin;

alter table public.movo_store_entitlements drop constraint if exists movo_store_entitlements_tier_check;
alter table public.movo_store_entitlements add constraint movo_store_entitlements_tier_check check (tier in ('pro','pro_plus','max','ultra'));
alter table public.movo_store_entitlements add column if not exists paid_verified boolean not null default false;

-- Sandbox purchases grant access only to explicitly configured, verified test accounts.
create table public.movo_store_test_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.movo_store_test_users enable row level security;
revoke all on public.movo_store_test_users from public, anon, authenticated;
grant all on public.movo_store_test_users to service_role;

create table public.movo_plan_grants (
  user_id uuid primary key references auth.users(id) on delete cascade,
  referral_code text unique not null default substring(replace(gen_random_uuid()::text, '-', '') from 1 for 24),
  trial_started_at timestamptz,
  trial_expires_at timestamptz,
  referred_by uuid references auth.users(id) on delete set null,
  reward_started_at timestamptz,
  reward_expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (referred_by is null or referred_by <> user_id),
  check ((trial_started_at is null) = (trial_expires_at is null)),
  check ((reward_started_at is null) = (reward_expires_at is null))
);
create index movo_plan_grants_referrer_idx on public.movo_plan_grants(referred_by);
alter table public.movo_plan_grants enable row level security;
revoke all on public.movo_plan_grants from public, anon, authenticated;
grant select on public.movo_plan_grants to authenticated;
grant all on public.movo_plan_grants to service_role;
create policy own_plan_grants on public.movo_plan_grants for select to authenticated using (user_id = (select auth.uid()));

-- Existing cloud customers receive the migration month before writes become read-only.
insert into public.movo_plan_grants(user_id, trial_started_at, trial_expires_at)
select u.id, now(), now() + interval '1 month' from auth.users u
where exists(select 1 from public.financial_accounts a where a.user_id = u.id)
   or exists(select 1 from public.transactions t where t.user_id = u.id)
   or exists(select 1 from public.user_preferences p where p.user_id = u.id);

create function public.movo_plan_status(p_user_id uuid default auth.uid()) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare g public.movo_plan_grants; v_tier text; v_expiry timestamptz; v_source text; v_count integer;
begin
  if p_user_id is null or ((select auth.jwt()->>'role') is distinct from 'service_role' and p_user_id is distinct from (select auth.uid())) then
    raise exception 'sign_in_required' using errcode = '42501';
  end if;
  select * into g from public.movo_plan_grants where user_id = p_user_id;
  select count(*) into v_count from public.movo_plan_grants r where r.referred_by = p_user_id
    and exists(select 1 from public.movo_store_entitlements e where e.user_id = r.user_id
      and e.environment = 'production' and e.paid_verified and e.status <> 'revoked');
  select tier, expires_at, source into v_tier, v_expiry, v_source from (
    select case when e.tier in ('max','ultra') then 'pro_plus' else e.tier end as tier, e.expires_at, 'store'::text as source
      from public.movo_store_entitlements e where e.user_id = p_user_id and (e.environment = 'production' or exists(select 1 from public.movo_store_test_users where user_id=p_user_id))
      and e.status in ('active','canceled','grace_period') and e.expires_at > now()
    union all select 'pro', g.trial_expires_at, 'trial' where g.trial_expires_at > now()
    union all select 'pro', g.reward_expires_at, 'referral' where g.reward_started_at <= now() and g.reward_expires_at > now() and v_count >= 10
  ) a order by (tier = 'pro_plus') desc, expires_at desc limit 1;
  return jsonb_build_object('tier',coalesce(v_tier,'free'),'active',v_tier is not null,'expiresAt',v_expiry,'source',v_source,
    'trialEligible',g.trial_started_at is null and not exists(select 1 from public.movo_store_entitlements where user_id=p_user_id and environment='production'),
    'trialExpiresAt',g.trial_expires_at,'referralCode',g.referral_code,'qualifiedReferrals',v_count,
    'rewardStartsAt',g.reward_started_at,'rewardExpiresAt',g.reward_expires_at);
end $$;
revoke all on function public.movo_plan_status(uuid) from public, anon;
grant execute on function public.movo_plan_status(uuid) to authenticated, service_role;

create function public.claim_movo_trial(p_referral_code text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); referrer uuid; g public.movo_plan_grants;
begin
  if uid is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  -- Serializes simultaneous claims, including the first insert.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('movo-trial:'||uid::text,0));
  if not exists(select 1 from auth.users where id=uid and (email_confirmed_at is not null or phone_confirmed_at is not null)) then
    raise exception 'verified_account_required';
  end if;
  insert into public.movo_plan_grants(user_id) values(uid) on conflict do nothing;
  select * into g from public.movo_plan_grants where user_id=uid for update;
  if g.trial_started_at is not null then return public.movo_plan_status(uid); end if;
  if exists(select 1 from public.movo_store_entitlements where user_id=uid and environment='production') then raise exception 'trial_not_eligible'; end if;
  if p_referral_code is not null then
    select user_id into referrer from public.movo_plan_grants where referral_code=p_referral_code and user_id<>uid;
    if referrer is null then raise exception 'invalid_referral_code'; end if;
  end if;
  update public.movo_plan_grants set trial_started_at=now(), trial_expires_at=now()+interval '1 month', referred_by=referrer where user_id=uid;
  return public.movo_plan_status(uid);
end $$;
revoke all on function public.claim_movo_trial(text) from public, anon;
grant execute on function public.claim_movo_trial(text) to authenticated;

-- Called only with authenticated store evidence, never by a client claim.
create function public.record_movo_paid_referral(p_entitlement_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare referrer uuid; v_count integer; starts timestamptz;
begin
  if (select auth.jwt()->>'role') is distinct from 'service_role' then raise exception 'service_role_required'; end if;
  update public.movo_store_entitlements set paid_verified=true where id=p_entitlement_id and user_id=p_user_id
    and environment='production' and status in ('active','canceled','grace_period');
  if not found then return; end if;
  select referred_by into referrer from public.movo_plan_grants where user_id=p_user_id;
  if referrer is null then return; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('movo-reward:'||referrer::text,0));
  select count(*) into v_count from public.movo_plan_grants r where r.referred_by=referrer
    and exists(select 1 from public.movo_store_entitlements e where e.user_id=r.user_id and e.environment='production' and e.paid_verified and e.status<>'revoked');
  if v_count < 10 then return; end if;
  select greatest(now(), coalesce(g.trial_expires_at,now()),coalesce((select max(expires_at) from public.movo_store_entitlements where user_id=referrer and environment='production' and status in ('active','canceled','grace_period')),now()))
    into starts from public.movo_plan_grants g where g.user_id=referrer;
  update public.movo_plan_grants set reward_started_at=starts, reward_expires_at=starts+interval '3 months'
    where user_id=referrer and reward_started_at is null;
end $$;
revoke all on function public.record_movo_paid_referral(uuid,uuid) from public, anon, authenticated;
grant execute on function public.record_movo_paid_referral(uuid,uuid) to service_role;

-- Triggers also cover SECURITY DEFINER financial RPCs, which can bypass RLS.
-- Service-role deletion remains available for account erasure and store callbacks.
create function public.enforce_movo_cloud_plan() returns trigger
language plpgsql security definer set search_path = '' as $$
declare uid uuid; tier text;
begin
  if (select auth.jwt()->>'role') = 'service_role' then return coalesce(new,old); end if;
  uid := auth.uid();
  if uid is null then raise exception 'sign_in_required' using errcode='42501'; end if;
  tier := public.movo_plan_status(uid)->>'tier';
  if tier not in ('pro','pro_plus') then raise exception 'cloud_read_only_upgrade_required' using errcode='42501'; end if;
  if tg_table_name in ('movo_automation_tokens','scheduled_transactions') and tier <> 'pro_plus' then
    raise exception 'pro_plus_required' using errcode='42501';
  end if;
  if tg_table_name='transactions' and tg_op='INSERT' and (to_jsonb(new)->>'source') in ('applepay','googlepay','bank','notification','siri_shortcut','android_assistant','bank_sync') and tier <> 'pro_plus' then
    raise exception 'pro_plus_required' using errcode='42501';
  end if;
  return coalesce(new,old);
end $$;
revoke all on function public.enforce_movo_cloud_plan() from public, anon, authenticated;
do $$ declare t text; begin
  foreach t in array array['financial_accounts','transactions','budgets','financial_bills','bill_occurrences','bill_payments',
    'accounting_postings','financial_loans','loan_events','financial_receivables','receivable_events','savings_goals','goal_allocations',
    'plan_funding_allocations','allocation_events','scheduled_transactions','user_preferences','payment_attempts',
    'payment_reminder_preferences','payment_reminder_events','movo_automation_tokens','movo_automation_inbox',
    'movo_ai_conversations','movo_ai_messages','movo_ai_upstream_conversations'] loop
    execute format('create trigger enforce_movo_plan before insert or update or delete on public.%I for each row execute function public.enforce_movo_cloud_plan()',t);
  end loop;
end $$;

-- Restrictive policies cannot be OR-ed around by existing permissive storage policies.
update storage.buckets set public=false where id='premium-stickers';
create policy premium_stickers_paid_read on storage.objects as restrictive for select to authenticated
  using (bucket_id <> 'premium-stickers' or (public.movo_plan_status(auth.uid())->>'tier') in ('pro','pro_plus'));
create policy premium_stickers_no_anonymous on storage.objects as restrictive for select to anon using (bucket_id <> 'premium-stickers');
create policy movo_paid_storage_insert on storage.objects as restrictive for insert to authenticated
  with check (bucket_id not in ('premium-stickers','movo-receipts','movo-account-qrs') or (public.movo_plan_status(auth.uid())->>'tier') in ('pro','pro_plus'));
create policy movo_paid_storage_update on storage.objects as restrictive for update to authenticated
  using (bucket_id not in ('premium-stickers','movo-receipts','movo-account-qrs') or (public.movo_plan_status(auth.uid())->>'tier') in ('pro','pro_plus'))
  with check (bucket_id not in ('premium-stickers','movo-receipts','movo-account-qrs') or (public.movo_plan_status(auth.uid())->>'tier') in ('pro','pro_plus'));
create policy movo_paid_storage_delete on storage.objects as restrictive for delete to authenticated
  using (bucket_id not in ('premium-stickers','movo-receipts','movo-account-qrs') or (public.movo_plan_status(auth.uid())->>'tier') in ('pro','pro_plus'));
commit;
