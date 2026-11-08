-- MOVO plans: Free, Pro and Pro+ (owner spec 2026-11-03).
--
-- A person's plan comes only from rows in movo_plan_grants, which no app user can write:
--   * the one-month Pro trial (claim_pro_trial, once per account and once per device),
--   * the referral reward (three months of Pro once 10 people the person referred have subscribed),
--   * App Store / Google Play subscriptions (written by the billing server with the service role).
-- The plan is checked on the server wherever it matters: cloud writes (Free keeps data on the device; cloud data
-- already stored stays readable and exportable, never deleted), the premium card styles in Storage, phone
-- automation (Pro+) and full NasrinAI (Pro and Pro+), the last two in the API.

-- 1. Grants ------------------------------------------------------------------------------------------------
create table if not exists public.movo_plan_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('pro', 'pro_plus')),
  source text not null check (source in ('trial', 'referral', 'app_store', 'google_play')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  external_id text unique check (external_id is null or char_length(external_id) between 1 and 200),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check ((source in ('app_store', 'google_play')) = (external_id is not null))
);
create index if not exists movo_plan_grants_user_ends_idx on public.movo_plan_grants(user_id, ends_at desc);
alter table public.movo_plan_grants enable row level security;
revoke all on public.movo_plan_grants from public, anon, authenticated;
grant select on public.movo_plan_grants to authenticated;
drop policy if exists movo_plan_grants_select_own on public.movo_plan_grants;
create policy movo_plan_grants_select_own on public.movo_plan_grants for select to authenticated using (user_id = (select auth.uid()));

-- One trial per account, and one per device (a salted hash of a random per-install id; it survives account deletion
-- so deleting and re-creating an account on the same device does not give a second trial).
create table if not exists public.movo_trial_claims (
  user_id uuid primary key references auth.users(id) on delete cascade,
  claimed_at timestamptz not null default now()
);
create table if not exists public.movo_trial_devices (
  device_hash text primary key check (device_hash ~ '^[a-f0-9]{64}$'),
  claimed_at timestamptz not null default now()
);

-- Referrals: every person gets a shareable code; a new person can enter one code before their first subscription.
create table if not exists public.movo_referral_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  created_at timestamptz not null default now()
);
create table if not exists public.movo_referrals (
  referee_id uuid primary key references auth.users(id) on delete cascade,
  referrer_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  qualified_at timestamptz,
  check (referee_id <> referrer_id)
);
create index if not exists movo_referrals_referrer_idx on public.movo_referrals(referrer_id, qualified_at);
create table if not exists public.movo_referral_rewards (
  referrer_id uuid primary key references auth.users(id) on delete cascade,
  grant_id uuid references public.movo_plan_grants(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists movo_referral_rewards_grant_idx on public.movo_referral_rewards(grant_id);

do $$
declare t text;
begin
  foreach t in array array['movo_trial_claims', 'movo_trial_devices', 'movo_referral_codes', 'movo_referrals', 'movo_referral_rewards'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    -- No client policies: these rows are read and written only by the functions below.
  end loop;
end $$;

-- 2. Reading the plan ----------------------------------------------------------------------------------------
create or replace function public.movo_active_plan(p_user uuid)
returns text language sql stable security definer set search_path = public, pg_temp as $$
  select case when bool_or(g.plan = 'pro_plus') then 'pro_plus' when count(*) > 0 then 'pro' else 'free' end
  from public.movo_plan_grants g
  where g.user_id = p_user and g.starts_at <= now() and g.ends_at > now()
$$;
revoke execute on function public.movo_active_plan(uuid) from public, anon, authenticated;
grant execute on function public.movo_active_plan(uuid) to service_role;

-- The caller's own plan (Storage policy, triggers). Signed out is always Free.
create or replace function public.movo_current_plan()
returns text language sql stable security definer set search_path = public, pg_temp as $$
  select case when auth.uid() is null then 'free' else public.movo_active_plan(auth.uid()) end
$$;
revoke execute on function public.movo_current_plan() from public, anon, authenticated;
grant execute on function public.movo_current_plan() to authenticated, service_role;

create or replace function public.movo_referral_code_for(p_user uuid)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare v_code text; alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  select code into v_code from public.movo_referral_codes where user_id = p_user;
  if found then return v_code; end if;
  loop
    -- Codes are meant to be shared, so they need to be unique, not secret.
    select string_agg(substr(alphabet, 1 + floor(random() * 32)::int, 1), '') into v_code from generate_series(1, 8);
    begin
      insert into public.movo_referral_codes (user_id, code) values (p_user, v_code);
      return v_code;
    exception when unique_violation then
      select code into v_code from public.movo_referral_codes where user_id = p_user;
      if found then return v_code; end if; -- a concurrent call created it
    end;
  end loop;
end $$;
revoke execute on function public.movo_referral_code_for(uuid) from public, anon, authenticated;

-- What the app shows: plan, when it ends, trial availability and referral progress.
create or replace function public.my_movo_plan()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_plan text; v_ends timestamptz; v_source text; v_joined int; v_qualified int;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  v_plan := public.movo_active_plan(v_user);
  select g.ends_at, g.source into v_ends, v_source from public.movo_plan_grants g
  where g.user_id = v_user and g.starts_at <= now() and g.ends_at > now() and (v_plan = 'pro' or g.plan = 'pro_plus')
  order by g.ends_at desc limit 1;
  select count(*), count(qualified_at) into v_joined, v_qualified from public.movo_referrals where referrer_id = v_user;
  return jsonb_build_object(
    'plan', v_plan, 'ends_at', v_ends, 'source', v_source,
    'trial_available', not exists (select 1 from public.movo_trial_claims where user_id = v_user)
                       and not exists (select 1 from public.movo_plan_grants where user_id = v_user),
    'referral_code', public.movo_referral_code_for(v_user),
    'referred_by', exists (select 1 from public.movo_referrals where referee_id = v_user),
    'referrals_joined', v_joined, 'referrals_subscribed', v_qualified, 'referral_goal', 10,
    'referral_reward_granted', exists (select 1 from public.movo_referral_rewards where referrer_id = v_user)
  );
end $$;
revoke execute on function public.my_movo_plan() from public, anon, authenticated;
grant execute on function public.my_movo_plan() to authenticated;

-- 3. Claiming the trial and entering a referral code ----------------------------------------------------------
create or replace function public.claim_pro_trial(p_device_hash text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_device_hash is null or p_device_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_device' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('movo_trial:' || v_user::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('movo_trial_device:' || p_device_hash, 0));
  if exists (select 1 from public.movo_trial_claims where user_id = v_user) then raise exception 'trial_already_claimed' using errcode = 'P0001'; end if;
  if exists (select 1 from public.movo_plan_grants where user_id = v_user) then raise exception 'trial_not_available' using errcode = 'P0001'; end if;
  if exists (select 1 from public.movo_trial_devices where device_hash = p_device_hash) then raise exception 'trial_device_used' using errcode = 'P0001'; end if;
  insert into public.movo_trial_claims (user_id) values (v_user);
  insert into public.movo_trial_devices (device_hash) values (p_device_hash);
  insert into public.movo_plan_grants (user_id, plan, source, starts_at, ends_at) values (v_user, 'pro', 'trial', now(), now() + interval '30 days');
  return public.my_movo_plan();
end $$;
revoke execute on function public.claim_pro_trial(text) from public, anon, authenticated;
grant execute on function public.claim_pro_trial(text) to authenticated;

create or replace function public.apply_referral_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_referrer uuid; v_code text := upper(btrim(coalesce(p_code, '')));
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if v_code !~ '^[A-HJ-NP-Z2-9]{8}$' then raise exception 'referral_code_invalid' using errcode = 'P0001'; end if;
  select user_id into v_referrer from public.movo_referral_codes where code = v_code;
  if not found then raise exception 'referral_code_invalid' using errcode = 'P0001'; end if;
  if v_referrer = v_user then raise exception 'referral_self' using errcode = 'P0001'; end if;
  perform pg_advisory_xact_lock(hashtextextended('movo_referral:' || v_user::text, 0));
  if exists (select 1 from public.movo_referrals where referee_id = v_user) then raise exception 'referral_already_applied' using errcode = 'P0001'; end if;
  -- A referral counts only for people who had not subscribed yet.
  if exists (select 1 from public.movo_plan_grants where user_id = v_user and source in ('app_store', 'google_play')) then
    raise exception 'referral_too_late' using errcode = 'P0001';
  end if;
  insert into public.movo_referrals (referee_id, referrer_id) values (v_user, v_referrer);
  return public.my_movo_plan();
end $$;
revoke execute on function public.apply_referral_code(text) from public, anon, authenticated;
grant execute on function public.apply_referral_code(text) to authenticated;

-- 4. Referral reward: a referred person's first App Store / Google Play subscription qualifies the referral; at 10
--    the referrer gets three months of Pro once, starting when their current plan time ends.
create or replace function public.movo_qualify_referral()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_referrer uuid; v_count int; v_start timestamptz; v_grant uuid;
begin
  if new.source not in ('app_store', 'google_play') then return new; end if;
  update public.movo_referrals set qualified_at = now() where referee_id = new.user_id and qualified_at is null returning referrer_id into v_referrer;
  if v_referrer is null then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended('movo_referral_reward:' || v_referrer::text, 0));
  select count(*) into v_count from public.movo_referrals where referrer_id = v_referrer and qualified_at is not null;
  if v_count >= 10 and not exists (select 1 from public.movo_referral_rewards where referrer_id = v_referrer) then
    select greatest(now(), coalesce(max(ends_at), now())) into v_start from public.movo_plan_grants where user_id = v_referrer and ends_at > now();
    insert into public.movo_plan_grants (user_id, plan, source, starts_at, ends_at) values (v_referrer, 'pro', 'referral', v_start, v_start + interval '3 months') returning id into v_grant;
    insert into public.movo_referral_rewards (referrer_id, grant_id) values (v_referrer, v_grant);
  end if;
  return new;
end $$;
revoke execute on function public.movo_qualify_referral() from public, anon, authenticated;
drop trigger if exists movo_plan_grants_qualify_referral on public.movo_plan_grants;
create trigger movo_plan_grants_qualify_referral after insert on public.movo_plan_grants
for each row execute function public.movo_qualify_referral();

-- 5. Cloud writes need Pro or Pro+. Signed-in Free users keep reading (and exporting or deleting) what is already in
--    the cloud. The server (service role, no auth.uid()) is not blocked here: the automation API checks the plan itself.
create or replace function public.movo_require_cloud_plan()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  -- Writes made by another trigger or by a foreign-key action (deleting an account clears account_id on loans and
  -- bills) are part of an already-checked statement or of a delete, which Free users may always do.
  if pg_trigger_depth() > 1 then return new; end if;
  if auth.uid() is not null and public.movo_active_plan(auth.uid()) = 'free' then
    raise exception 'plan_required' using errcode = '42501', hint = 'MOVO cloud storage is part of Pro and Pro+.';
  end if;
  return new;
end $$;
revoke execute on function public.movo_require_cloud_plan() from public, anon, authenticated;
do $$
declare t text;
begin
  foreach t in array array['financial_accounts', 'transactions', 'budgets', 'savings_goals', 'financial_loans', 'financial_receivables',
                           'financial_bills', 'loan_events', 'receivable_events', 'goal_allocations', 'bill_payments', 'user_preferences'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_cloud_plan_guard', t);
    execute format('create trigger %I before insert or update on public.%I for each row execute function public.movo_require_cloud_plan()', t || '_cloud_plan_guard', t);
  end loop;
end $$;

-- 6. Premium card styles in Storage: Pro and Pro+ only (was: any signed-in user).
do $$
begin
  if to_regclass('storage.objects') is not null then
    drop policy if exists "Authenticated users can read premium card styles" on storage.objects;
    drop policy if exists "Paid plans can read premium card styles" on storage.objects;
    create policy "Paid plans can read premium card styles" on storage.objects for select to authenticated
      using (bucket_id = 'premium-stickers' and (select public.movo_current_plan()) <> 'free');
  end if;
end $$;

-- 7. People who already keep records in the cloud start the one-month Pro trial now, so nothing they use stops
--    working today; after it ends their cloud records stay readable and exportable.
insert into public.movo_trial_claims (user_id)
select distinct u.user_id from (select user_id from public.financial_accounts union select user_id from public.transactions) u
where not exists (select 1 from public.movo_trial_claims c where c.user_id = u.user_id)
on conflict do nothing;
insert into public.movo_plan_grants (user_id, plan, source, starts_at, ends_at)
select c.user_id, 'pro', 'trial', now(), now() + interval '30 days' from public.movo_trial_claims c
where not exists (select 1 from public.movo_plan_grants g where g.user_id = c.user_id);
