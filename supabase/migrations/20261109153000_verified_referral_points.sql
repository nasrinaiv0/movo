begin;
-- Referral codes and referral points.
--
-- Every person has ONE short, reusable referral code: "M" followed by five digits (for example M78038). Once
-- the 100,000 digit codes run short, codes continue with five characters from 0-9 and A-Z without I and O.
-- A code only links a new account to the person who invited it. Points live in a separate ledger and are never
-- money, plan credit, cashback or a loyalty-card balance.

create function public.movo_new_referral_code() returns text
language plpgsql volatile security definer set search_path = '' as $$
declare v_code text; v_bytes bytea; v_letters constant text := '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
begin
  for v_attempt in 1..60 loop
    -- The first six bytes of a version 4 UUID are random (gen_random_uuid uses a secure random source).
    v_bytes := pg_catalog.decode(pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''), 'hex');
    if v_attempt <= 40 then
      v_code := 'M' || pg_catalog.lpad((((pg_catalog.get_byte(v_bytes, 0) << 16) | (pg_catalog.get_byte(v_bytes, 1) << 8)
        | pg_catalog.get_byte(v_bytes, 2)) % 100000)::text, 5, '0');
    else
      v_code := 'M';
      for v_i in 0..4 loop
        v_code := v_code || pg_catalog.substr(v_letters, 1 + pg_catalog.get_byte(v_bytes, v_i) % 34, 1);
      end loop;
    end if;
    if not exists(select 1 from public.movo_plan_grants where referral_code = v_code) then return v_code; end if;
  end loop;
  raise exception 'referral_code_unavailable';
end $$;
revoke all on function public.movo_new_referral_code() from public, anon, authenticated;
grant execute on function public.movo_new_referral_code() to service_role;

-- Existing 24-character codes become short codes (one statement per row, so each new code sees the previous ones).
do $$ declare v_user uuid; begin
  for v_user in select user_id from public.movo_plan_grants where referral_code !~ '^M[0-9A-HJ-NP-Z]{5}$' loop
    update public.movo_plan_grants set referral_code = public.movo_new_referral_code() where user_id = v_user;
  end loop;
end $$;
alter table public.movo_plan_grants alter column referral_code set default public.movo_new_referral_code();
alter table public.movo_plan_grants add constraint movo_plan_grants_referral_code_format
  check (referral_code ~ '^M[0-9A-HJ-NP-Z]{5}$');

-- A referred account that can earn points for the person who invited it (new, verified, never bought a plan).
create table public.movo_referral_claims (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_id uuid not null unique references auth.users(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  native_verified_at timestamptz,
  platform text check (platform in ('ios','android')),
  native_key_hash text unique check (native_key_hash ~ '^[0-9a-f]{64}$'),
  review_required boolean not null default false,
  check (referrer_id <> referred_id)
);
create index movo_referral_claims_owner_idx on public.movo_referral_claims(referrer_id, claimed_at desc);
-- Every code entry counts, so short codes cannot be guessed in bulk.
create table public.movo_referral_code_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index movo_referral_code_attempts_user_idx on public.movo_referral_code_attempts(user_id, attempted_at desc);
create table public.movo_referral_challenges (
  id uuid primary key default gen_random_uuid(),
  referred_id uuid not null references auth.users(id) on delete cascade,
  challenge_hash text not null unique check (challenge_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  created_at timestamptz not null default now(),
  used_at timestamptz
);
create index movo_referral_challenges_owner_idx on public.movo_referral_challenges(referred_id, created_at desc);
create table public.movo_referral_points_ledger (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.movo_referral_claims(id) on delete cascade,
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_id uuid not null references auth.users(id) on delete cascade,
  event_kind text not null check (event_kind in ('native_signup','paid_upgrade','paid_reversal')),
  points integer not null check (
    (event_kind = 'native_signup' and points = 5)
    or (event_kind = 'paid_upgrade' and points = 100)
    or (event_kind = 'paid_reversal' and points = -100)),
  source_entitlement_id uuid references public.movo_store_entitlements(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (claim_id, event_kind),
  check (referrer_id <> referred_id)
);
create index movo_referral_points_owner_idx on public.movo_referral_points_ledger(referrer_id, created_at desc);
do $$ declare v_table text; begin
  foreach v_table in array array['movo_referral_claims','movo_referral_code_attempts','movo_referral_challenges','movo_referral_points_ledger'] loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('revoke all on public.%I from public, anon, authenticated', v_table);
    execute format('grant all on public.%I to service_role', v_table);
  end loop;
end $$;

-- Internal: count the attempt, then resolve a code to the person who owns it. Returns {referrer} or {error};
-- it never raises, so the attempt is kept even when the code is wrong.
create function public.movo_referral_lookup(p_user_id uuid, p_code text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v_code text := pg_catalog.upper(pg_catalog.btrim(coalesce(p_code, ''))); v_referrer uuid;
begin
  if (select count(*) from public.movo_referral_code_attempts
      where user_id = p_user_id and attempted_at > now() - interval '1 hour') >= 10 then
    return jsonb_build_object('error', 'too_many_attempts');
  end if;
  insert into public.movo_referral_code_attempts(user_id) values (p_user_id);
  if v_code !~ '^M[0-9A-HJ-NP-Z]{5}$' then return jsonb_build_object('error', 'invalid_referral_code'); end if;
  select user_id into v_referrer from public.movo_plan_grants where referral_code = v_code;
  if v_referrer is null then return jsonb_build_object('error', 'invalid_referral_code'); end if;
  if v_referrer = p_user_id then return jsonb_build_object('error', 'own_referral_code'); end if;
  return jsonb_build_object('referrer', v_referrer);
end $$;
revoke all on function public.movo_referral_lookup(uuid, text) from public, anon, authenticated;
grant execute on function public.movo_referral_lookup(uuid, text) to service_role;

-- Internal: a referred account can earn points only when it is new (7 days), verified and has never bought a plan.
create function public.movo_link_referral_claim(p_user_id uuid, p_referrer uuid) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
begin
  if p_referrer is null or p_referrer = p_user_id then return false; end if;
  if not exists(select 1 from auth.users where id = p_user_id and created_at >= now() - interval '7 days'
      and (email_confirmed_at is not null or phone_confirmed_at is not null)) then return false; end if;
  if exists(select 1 from public.movo_store_entitlements where user_id = p_user_id and environment = 'production') then return false; end if;
  insert into public.movo_referral_claims(referrer_id, referred_id) values (p_referrer, p_user_id) on conflict (referred_id) do nothing;
  return found;
end $$;
revoke all on function public.movo_link_referral_claim(uuid, uuid) from public, anon, authenticated;
grant execute on function public.movo_link_referral_claim(uuid, uuid) to service_role;

-- The free month accepts the short code. A referral, once linked, is never replaced or cleared.
create or replace function public.claim_movo_trial(p_referral_code text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); referrer uuid; g public.movo_plan_grants; v_lookup jsonb;
begin
  if uid is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  -- Serializes simultaneous claims, including the first insert (same key as movo_claim_referral_code).
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('movo-trial:'||uid::text,0));
  if not exists(select 1 from auth.users where id=uid and (email_confirmed_at is not null or phone_confirmed_at is not null)) then
    raise exception 'verified_account_required';
  end if;
  insert into public.movo_plan_grants(user_id) values(uid) on conflict (user_id) do nothing;
  select * into g from public.movo_plan_grants where user_id=uid for update;
  if g.trial_started_at is not null then return public.movo_plan_status(uid); end if;
  if exists(select 1 from public.movo_store_entitlements where user_id=uid and environment='production') then raise exception 'trial_not_eligible'; end if;
  if p_referral_code is not null and g.referred_by is null then
    v_lookup := public.movo_referral_lookup(uid, p_referral_code);
    -- Returned, not raised, so the counted attempt stays recorded.
    if v_lookup ? 'error' then return jsonb_build_object('error', v_lookup->>'error'); end if;
    referrer := (v_lookup->>'referrer')::uuid;
  end if;
  update public.movo_plan_grants set trial_started_at=now(), trial_expires_at=now()+interval '1 month',
    referred_by=coalesce(g.referred_by, referrer) where user_id=uid;
  if referrer is not null then perform public.movo_link_referral_claim(uid, referrer); end if;
  return public.movo_plan_status(uid);
end $$;
revoke all on function public.claim_movo_trial(text) from public, anon;
grant execute on function public.claim_movo_trial(text) to authenticated;

-- All RPCs below are security INVOKER and executable only by service_role. API routes resolve the signed-in
-- user from the verified JWT first, then pass that id.
create function public.movo_claim_referral_code(p_user_id uuid, p_code text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare v_plan public.movo_plan_grants; v_lookup jsonb; v_referrer uuid;
begin
  if auth.jwt()->>'role' is distinct from 'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('movo-trial:'||p_user_id::text,0));
  if not exists(select 1 from auth.users where id = p_user_id and (email_confirmed_at is not null or phone_confirmed_at is not null))
    then return jsonb_build_object('claimed', false, 'error', 'verified_account_required'); end if;
  insert into public.movo_plan_grants(user_id) values (p_user_id) on conflict (user_id) do nothing;
  select * into v_plan from public.movo_plan_grants where user_id = p_user_id for update;
  if v_plan.referred_by is not null or exists(select 1 from public.movo_referral_claims where referred_id = p_user_id)
    then return jsonb_build_object('claimed', false, 'error', 'already_referred'); end if;
  if not exists(select 1 from auth.users where id = p_user_id and created_at >= now() - interval '7 days')
    then return jsonb_build_object('claimed', false, 'error', 'account_not_new'); end if;
  if exists(select 1 from public.movo_store_entitlements where user_id = p_user_id and environment = 'production')
    then return jsonb_build_object('claimed', false, 'error', 'already_purchased'); end if;
  v_lookup := public.movo_referral_lookup(p_user_id, p_code);
  if v_lookup ? 'error' then return jsonb_build_object('claimed', false, 'error', v_lookup->>'error'); end if;
  v_referrer := (v_lookup->>'referrer')::uuid;
  update public.movo_plan_grants set referred_by = v_referrer where user_id = p_user_id;
  perform public.movo_link_referral_claim(p_user_id, v_referrer);
  return jsonb_build_object('claimed', true);
end $$;
revoke all on function public.movo_claim_referral_code(uuid, text) from public, anon, authenticated;
grant execute on function public.movo_claim_referral_code(uuid, text) to service_role;

create function public.movo_issue_referral_challenge(p_user_id uuid, p_hash text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_exp timestamptz;
begin
  if auth.jwt()->>'role' is distinct from 'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
  if p_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_challenge_hash'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('movo-attest:'||p_user_id::text,0));
  if not exists(select 1 from public.movo_referral_claims where referred_id=p_user_id and native_verified_at is null)
   then raise exception 'no_pending_referral'; end if;
  if (select count(*) from public.movo_referral_challenges where referred_id=p_user_id and created_at>now()-interval '1 hour')>=10
   then raise exception 'challenge_rate_limit'; end if;
  insert into public.movo_referral_challenges(referred_id,challenge_hash) values(p_user_id,p_hash)
   returning id,expires_at into v_id,v_exp;
  return jsonb_build_object('challengeId',v_id,'expiresAt',v_exp);
end $$;
revoke all on function public.movo_issue_referral_challenge(uuid,text) from public,anon,authenticated;
grant execute on function public.movo_issue_referral_challenge(uuid,text) to service_role;

create function public.movo_record_native_referral(p_user_id uuid,p_challenge_id uuid,p_hash text,p_platform text,p_native_key_hash text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_claim public.movo_referral_claims; v_hold boolean;
begin
  if auth.jwt()->>'role' is distinct from 'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
  if p_platform not in ('ios','android') or p_native_key_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_native_proof'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('movo-native:'||p_user_id::text,0));
  update public.movo_referral_challenges set used_at=now()
  where id=p_challenge_id and referred_id=p_user_id and challenge_hash=p_hash and used_at is null and expires_at>now();
  if not found then raise exception 'invalid_or_replayed_challenge'; end if;
  select * into v_claim from public.movo_referral_claims where referred_id=p_user_id for update;
  if v_claim.id is null or v_claim.native_verified_at is not null then raise exception 'already_verified_or_not_referred'; end if;
  if not exists(select 1 from auth.users where id=p_user_id and (email_confirmed_at is not null or phone_confirmed_at is not null))
    then raise exception 'verified_account_required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('movo-points-owner:'||v_claim.referrer_id::text,0));
  v_hold := (select count(*) from public.movo_referral_points_ledger where referrer_id=v_claim.referrer_id
    and event_kind='native_signup' and created_at>now()-interval '24 hours')>=10;
  update public.movo_referral_claims set native_verified_at=now(),platform=p_platform,native_key_hash=p_native_key_hash,
    review_required=v_hold where id=v_claim.id;
  if not v_hold then
    insert into public.movo_referral_points_ledger(claim_id,referrer_id,referred_id,event_kind,points)
    values(v_claim.id,v_claim.referrer_id,p_user_id,'native_signup',5);
  end if;
  return jsonb_build_object('awarded',not v_hold,'pendingReview',v_hold);
end $$;
revoke all on function public.movo_record_native_referral(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.movo_record_native_referral(uuid,uuid,text,text,text) to service_role;

create function public.movo_award_referral_upgrade(p_entitlement_id uuid,p_user_id uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare v_claim public.movo_referral_claims;
begin
  if auth.jwt()->>'role' is distinct from 'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
  select * into v_claim from public.movo_referral_claims where referred_id=p_user_id for update;
  if v_claim.id is null or v_claim.native_verified_at is null or v_claim.review_required then return; end if;
  if not exists(select 1 from public.movo_store_entitlements
    where id=p_entitlement_id and user_id=p_user_id and environment='production'
    and paid_verified=true and status in ('active','canceled','grace_period') and expires_at>now()) then return; end if;
  insert into public.movo_referral_points_ledger(claim_id,referrer_id,referred_id,event_kind,points,source_entitlement_id)
  values(v_claim.id,v_claim.referrer_id,p_user_id,'paid_upgrade',100,p_entitlement_id)
  on conflict(claim_id,event_kind) do nothing;
end $$;
revoke all on function public.movo_award_referral_upgrade(uuid,uuid) from public,anon,authenticated;
grant execute on function public.movo_award_referral_upgrade(uuid,uuid) to service_role;

create function public.movo_reverse_referral_upgrade(p_user_id uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare v_claim public.movo_referral_claims;
begin
  if auth.jwt()->>'role' is distinct from 'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
  select * into v_claim from public.movo_referral_claims where referred_id=p_user_id for update;
  if v_claim.id is null then return; end if;
  if not exists(select 1 from public.movo_referral_points_ledger where claim_id=v_claim.id and event_kind='paid_upgrade') then return; end if;
  if exists(select 1 from public.movo_store_entitlements where user_id=p_user_id
     and environment='production' and paid_verified=true and status in ('active','canceled','grace_period') and expires_at>now()) then return; end if;
  insert into public.movo_referral_points_ledger(claim_id,referrer_id,referred_id,event_kind,points)
  values(v_claim.id,v_claim.referrer_id,p_user_id,'paid_reversal',-100)
  on conflict(claim_id,event_kind) do nothing;
end $$;
revoke all on function public.movo_reverse_referral_upgrade(uuid) from public,anon,authenticated;
grant execute on function public.movo_reverse_referral_upgrade(uuid) to service_role;

create function public.movo_referral_points_status(p_user_id uuid)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if auth.jwt()->>'role' is distinct from 'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
 return jsonb_build_object(
 'referralCode',(select referral_code from public.movo_plan_grants where user_id=p_user_id),
 'points',(select coalesce(sum(points),0) from public.movo_referral_points_ledger where referrer_id=p_user_id),
 'referredUsers',(select count(*) from public.movo_plan_grants where referred_by=p_user_id),
 'paidUpgrades',(select count(*) from public.movo_referral_points_ledger where referrer_id=p_user_id and event_kind='paid_upgrade'),
 'pendingReview',(select count(*) from public.movo_referral_claims where referrer_id=p_user_id and review_required),
 'pendingNativeProof',(select exists(select 1 from public.movo_referral_claims where referred_id=p_user_id and native_verified_at is null)),
 -- Someone who joined in the last 7 days, was not referred yet and never bought a plan can still enter a code.
 'canClaim',(select not exists(select 1 from public.movo_plan_grants where user_id=p_user_id and referred_by is not null)
   and not exists(select 1 from public.movo_referral_claims where referred_id=p_user_id)
   and exists(select 1 from auth.users where id=p_user_id and created_at>=now()-interval '7 days')
   and not exists(select 1 from public.movo_store_entitlements where user_id=p_user_id and environment='production'))
 );
end $$;
revoke all on function public.movo_referral_points_status(uuid) from public,anon,authenticated;
grant execute on function public.movo_referral_points_status(uuid) to service_role;
commit;
