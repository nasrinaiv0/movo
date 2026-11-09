-- Deploy before the matching handlers. No production data is deleted.
begin;
alter table public.movo_store_entitlements
  add column if not exists store_event_at timestamptz,
  add column if not exists purchased_at timestamptz;
create unique index if not exists movo_iap_apple_original_unique
  on public.movo_store_entitlements(original_transaction_id) where platform='apple';
-- Tokens are SHA-256 digests, never plaintext. Existing composite unique index remains.
create unique index if not exists movo_iap_google_token_unique
  on public.movo_store_entitlements(purchase_token_hash) where platform='google';
alter table public.movo_store_entitlements add constraint movo_iap_identity_check check (
  (platform='apple' and original_transaction_id=store_subscription_key and original_transaction_id is not null and purchase_token_hash is null)
  or (platform='google' and purchase_token_hash is not null and purchase_token_hash=store_subscription_key and purchase_token_hash ~ '^[a-f0-9]{64}$' and original_transaction_id is null)
) not valid;
-- Validate explicitly: inconsistent historical rows must be reviewed, not silently repaired.
alter table public.movo_store_entitlements validate constraint movo_iap_identity_check;
create table public.movo_iap_events (
  platform text not null check(platform in ('apple','google')),
  event_id text not null check(length(event_id) between 1 and 200),
  processed_at timestamptz not null default now(),
  primary key(platform,event_id)
);
create table public.movo_iap_leases (
  platform text not null check(platform in ('apple','google')),
  subscription_key text not null,
  fence uuid not null,
  expires_at timestamptz not null,
  primary key(platform,subscription_key)
);
-- Durable negative facts survive notifications arriving before the first client verification.
-- Apple scope is a transaction; Google scope is the entire purchase token.
create table public.movo_iap_revocations (
  platform text not null check(platform in ('apple','google')),
  identity_key text not null,
  revoked_at timestamptz not null,
  primary key(platform,identity_key)
);
create table public.movo_iap_ack_jobs (
  purchase_token_hash text primary key check(purchase_token_hash ~ '^[a-f0-9]{64}$'),
  product_id text not null,
  encrypted_token text not null,
  created_at timestamptz not null default now(),
  next_attempt_at timestamptz not null default now(),
  completed_at timestamptz
);
create index movo_iap_ack_pending on public.movo_iap_ack_jobs(next_attempt_at) where completed_at is null;
create table public.movo_iap_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  requests integer not null check(requests>0)
);
alter table public.movo_iap_events enable row level security;
alter table public.movo_iap_leases enable row level security;
alter table public.movo_iap_revocations enable row level security;
alter table public.movo_iap_ack_jobs enable row level security;
alter table public.movo_iap_rate_limits enable row level security;
revoke all on public.movo_iap_events,public.movo_iap_leases,public.movo_iap_revocations,public.movo_iap_ack_jobs,public.movo_iap_rate_limits from public,anon,authenticated;
grant all on public.movo_iap_events,public.movo_iap_leases,public.movo_iap_revocations,public.movo_iap_ack_jobs,public.movo_iap_rate_limits to service_role;

create function public.movo_iap_rate_limit(p_user_id uuid) returns boolean
language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
  insert into public.movo_iap_rate_limits as r values(p_user_id,clock_timestamp(),1)
  on conflict(user_id) do update set
    window_start=case when r.window_start < clock_timestamp()-interval '1 minute' then clock_timestamp() else r.window_start end,
    requests=case when r.window_start < clock_timestamp()-interval '1 minute' then 1 else r.requests+1 end
  returning requests into n;
  return n<=10;
end $$;
create function public.movo_iap_acquire(p_platform text,p_key text) returns uuid
language plpgsql security invoker set search_path='' as $$
declare f uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_platform||':'||p_key,0));
  insert into public.movo_iap_leases as l values(p_platform,p_key,gen_random_uuid(),clock_timestamp()+interval '90 seconds')
    on conflict(platform,subscription_key) do update set fence=excluded.fence,expires_at=excluded.expires_at
    where l.expires_at<clock_timestamp() returning fence into f;
  if f is null then raise exception 'iap_busy'; end if;
  return f;
end $$;

create function public.movo_iap_commit(p_user_id uuid,p_verified jsonb,p_fence uuid,p_event_id text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  v_platform text:=p_verified->>'platform'; v_key text:=p_verified->>'storeSubscriptionKey';
  v_link text:=p_verified->>'linkedPurchaseTokenHash'; v_status text:=p_verified->>'status';
  v_tx text:=p_verified->>'storeTransactionId'; v_event timestamptz:=(p_verified->>'eventAt')::timestamptz;
  v_purchase timestamptz:=(p_verified->>'purchasedAt')::timestamptz;
  old public.movo_store_entitlements; v_id uuid; k text; v_duplicate boolean:=false; v_blocked boolean;
begin
  -- Sorted locks prevent upgrade/deadlock cycles; the lease fences network calls across requests.
  for k in select distinct x from unnest(array[v_key,v_link]) x where x is not null order by x loop
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_platform||':'||k,0));
  end loop;
  if not exists(select 1 from public.movo_iap_leases where platform=v_platform and subscription_key=v_key
    and fence=p_fence and expires_at>clock_timestamp() for update) then raise exception 'iap_lease_expired'; end if;
  if p_event_id is not null then
    insert into public.movo_iap_events(platform,event_id) values(v_platform,p_event_id) on conflict do nothing;
    v_duplicate:=not found;
  end if;
  if v_duplicate then
    delete from public.movo_iap_leases where platform=v_platform and subscription_key=v_key and fence=p_fence;
    return jsonb_build_object('duplicate',true);
  end if;
  if p_verified->>'environment' <> 'production' or v_event is null or v_event>clock_timestamp()+interval '5 minutes' then raise exception 'invalid_store_state'; end if;
  select * into old from public.movo_store_entitlements where platform=v_platform and store_subscription_key=v_key for update;
  if old.id is not null and old.user_id is distinct from p_user_id then raise exception 'purchase_already_linked'; end if;
  if v_status='revoked' then
    insert into public.movo_iap_revocations values(v_platform,case when v_platform='apple' then v_tx else v_key end,v_event)
      on conflict(platform,identity_key) do update set revoked_at=greatest(public.movo_iap_revocations.revoked_at,excluded.revoked_at);
  end if;
  -- Unknown-owner revocations must still be saved; positive unknown-owner events retry instead.
  if p_user_id is null then
    if v_status<>'revoked' then raise exception 'iap_owner_unknown'; end if;
    delete from public.movo_iap_leases where platform=v_platform and subscription_key=v_key and fence=p_fence;
    return jsonb_build_object('status','revoked');
  end if;
  if v_link is not null and v_link<>v_key then
    if exists(select 1 from public.movo_store_entitlements where platform='google' and store_subscription_key=v_link and user_id<>p_user_id) then raise exception 'purchase_already_linked'; end if;
    -- A pending replacement does not invalidate the paid predecessor.
    if coalesce((p_verified->>'replaceLinked')::boolean, v_status in ('active','grace_period')) then
      insert into public.movo_iap_revocations values('google',v_link,v_event) on conflict do nothing;
      update public.movo_store_entitlements set status='revoked',paid_verified=false,updated_at=now()
        where platform='google' and store_subscription_key=v_link;
    end if;
  end if;
  select exists(select 1 from public.movo_iap_revocations where platform=v_platform
    and identity_key=case when v_platform='apple' then v_tx else v_key end) into v_blocked;
  if v_blocked then v_status:='revoked'; end if;
  if old.id is not null and (
    (v_platform='apple' and old.store_transaction_id<>v_tx and (v_status='revoked' or v_purchase is null or old.purchased_at>v_purchase or old.expires_at>(p_verified->>'expiresAt')::timestamptz))
    or (not v_blocked and old.store_event_at>v_event)
  ) then
    v_id:=old.id;
  else
    insert into public.movo_store_entitlements as e(user_id,platform,product_id,tier,store_subscription_key,store_transaction_id,
      original_transaction_id,purchase_token_hash,status,expires_at,environment,store_event_at,purchased_at,paid_verified)
    values(p_user_id,v_platform,p_verified->>'productId',p_verified->>'tier',v_key,v_tx,p_verified->>'originalTransactionId',
      p_verified->>'purchaseTokenHash',v_status,(p_verified->>'expiresAt')::timestamptz,'production',v_event,v_purchase,
      coalesce((p_verified->>'paidVerified')::boolean,false) and v_status in ('active','grace_period'))
    on conflict(platform,store_subscription_key) do update set product_id=excluded.product_id,tier=excluded.tier,
      store_transaction_id=excluded.store_transaction_id,status=excluded.status,expires_at=excluded.expires_at,
      store_event_at=excluded.store_event_at,purchased_at=excluded.purchased_at,paid_verified=excluded.paid_verified,
      verified_at=now(),updated_at=now() returning id into v_id;
  end if;
  select * into old from public.movo_store_entitlements where id=v_id;
  if v_platform='google' and old.status in ('active','grace_period') and (p_verified->>'needsAcknowledgement')::boolean then
    if p_verified->>'encryptedToken' is null then raise exception 'iap_ack_not_configured'; end if;
    insert into public.movo_iap_ack_jobs(purchase_token_hash,product_id,encrypted_token)
      values(v_key,old.product_id,p_verified->>'encryptedToken') on conflict do nothing;
  end if;
  if old.paid_verified and old.status in ('active','grace_period') then
    perform public.record_movo_paid_referral(old.id,old.user_id);
    if coalesce((p_verified->>'referralPointsEnabled')::boolean,false) then
      perform public.movo_award_referral_upgrade(old.id,old.user_id);
    end if;
  end if;
  if old.status='revoked' and coalesce((p_verified->>'referralPointsEnabled')::boolean,false) then
    perform public.movo_reverse_referral_upgrade(old.user_id);
  end if;
  delete from public.movo_iap_leases where platform=v_platform and subscription_key=v_key and fence=p_fence;
  return jsonb_build_object('entitlementId',old.id,'status',old.status,'tier',old.tier,'expiresAt',old.expires_at);
end $$;
revoke all on function public.movo_iap_rate_limit(uuid),public.movo_iap_acquire(text,text),public.movo_iap_commit(uuid,jsonb,uuid,text) from public,anon,authenticated;
grant execute on function public.movo_iap_rate_limit(uuid),public.movo_iap_acquire(text,text),public.movo_iap_commit(uuid,jsonb,uuid,text) to service_role;
-- Remove the old write path so a stale deployed handler fails closed.
revoke execute on function public.upsert_movo_store_entitlement(uuid,text,text,text,text,text,text,text,text,timestamptz,text) from service_role;
-- Cancelled Play states must not grant access under this release's strict policy.
update public.movo_store_entitlements set status='expired' where platform='google' and status='canceled';
create or replace function public.movo_plan_status(p_user_id uuid default auth.uid()) returns jsonb
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
      from public.movo_store_entitlements e where e.user_id = p_user_id and e.environment = 'production'
      and e.status in ('active','grace_period') and e.expires_at > now()
    union all select mg.tier, mg.expires_at, 'manual'::text from public.movo_manual_plan_grants mg
      where mg.user_id = p_user_id and mg.revoked_at is null and mg.expires_at > now()
    union all select 'pro', g.trial_expires_at, 'trial' where g.trial_expires_at > now()
    union all select 'pro', g.reward_expires_at, 'referral' where g.reward_started_at <= now() and g.reward_expires_at > now() and v_count >= 10
    union all select 'pro', pr.expires_at, 'points' from public.movo_referral_point_redemptions pr
      where pr.user_id = p_user_id and pr.starts_at <= now() and pr.expires_at > now()
  ) a order by (tier = 'pro_plus') desc, expires_at desc limit 1;
  return jsonb_build_object('tier',coalesce(v_tier,'free'),'active',v_tier is not null,'expiresAt',v_expiry,'source',v_source,
    'trialEligible',g.trial_started_at is null and not exists(select 1 from public.movo_store_entitlements where user_id=p_user_id and environment='production'),
    'trialExpiresAt',g.trial_expires_at,'referralCode',g.referral_code,'qualifiedReferrals',v_count,
    'rewardStartsAt',g.reward_started_at,'rewardExpiresAt',g.reward_expires_at);
end $$;
revoke all on function public.movo_plan_status(uuid) from public, anon;
grant execute on function public.movo_plan_status(uuid) to authenticated, service_role;

commit;
