begin;
-- Single-use referral invitations and points. This ledger is NEVER financial money,
-- subscription credit, cashback or loyalty-card balance.
create table public.movo_referral_invites (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique check(token_hash ~ '^[0-9a-f]{64}$'),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '30 days'),
  claimed_by uuid unique references auth.users(id) on delete set null,
  claimed_at timestamptz,
  check ((claimed_by is null) = (claimed_at is null))
);
create index movo_referral_invites_owner_idx on public.movo_referral_invites(referrer_id,issued_at desc);
create table public.movo_referral_claims (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null unique references public.movo_referral_invites(id),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_id uuid not null unique references auth.users(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  native_verified_at timestamptz,
  platform text check(platform in ('ios','android')),
  native_key_hash text unique check(native_key_hash ~ '^[0-9a-f]{64}$'),
  review_required boolean not null default false,
  check(referrer_id<>referred_id)
);
create index movo_referral_claims_owner_idx on public.movo_referral_claims(referrer_id,claimed_at desc);
create table public.movo_referral_challenges (
  id uuid primary key default gen_random_uuid(),
  referred_id uuid not null references auth.users(id) on delete cascade,
  challenge_hash text not null unique check(challenge_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null default (now()+interval '5 minutes'),
  created_at timestamptz not null default now(),
  used_at timestamptz
);
create index movo_referral_challenges_owner_idx on public.movo_referral_challenges(referred_id,created_at desc);
create table public.movo_referral_points_ledger (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.movo_referral_claims(id) on delete cascade,
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_id uuid not null references auth.users(id) on delete cascade,
  event_kind text not null check(event_kind in ('native_signup','paid_upgrade','paid_reversal')),
  points integer not null check(
    (event_kind='native_signup' and points=5)
    or (event_kind='paid_upgrade' and points=100)
    or (event_kind='paid_reversal' and points=-100)),
  source_entitlement_id uuid references public.movo_store_entitlements(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(claim_id,event_kind),
  check(referrer_id<>referred_id)
);
create index movo_referral_points_owner_idx on public.movo_referral_points_ledger(referrer_id,created_at desc);
do $$ declare v_table text; begin
  foreach v_table in array array['movo_referral_invites','movo_referral_claims','movo_referral_challenges','movo_referral_points_ledger'] loop
    execute format('alter table public.%I enable row level security',v_table);
    execute format('revoke all on public.%I from public, anon, authenticated',v_table);
    execute format('grant all on public.%I to service_role',v_table);
  end loop;
end $$;

-- All mutating RPCs are security INVOKER and executable exclusively by service_role.
-- API routes resolve authenticated uid first, then supply that uid to these RPCs.
create function public.movo_issue_invite(p_user_id uuid,p_hash text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_exp timestamptz;
begin
  if auth.jwt()->>'role' is distinct from 'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
  if p_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_token_hash'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('movo-invite:'||p_user_id::text,0));
  if not exists(select 1 from auth.users where id=p_user_id and (email_confirmed_at is not null or phone_confirmed_at is not null))
    then raise exception 'verified_account_required'; end if;
  if (select count(*) from public.movo_referral_invites where referrer_id=p_user_id and issued_at>now()-interval '24 hours')>=20
    then raise exception 'invite_rate_limit'; end if;
  insert into public.movo_plan_grants(user_id) values(p_user_id) on conflict do nothing;
  insert into public.movo_referral_invites(referrer_id,token_hash) values(p_user_id,p_hash)
  returning id,expires_at into v_id,v_exp;
  return jsonb_build_object('inviteId',v_id,'expiresAt',v_exp);
end $$;
revoke all on function public.movo_issue_invite(uuid,text) from public,anon,authenticated;
grant execute on function public.movo_issue_invite(uuid,text) to service_role;

create function public.movo_claim_invite(p_user_id uuid,p_hash text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_inv public.movo_referral_invites; v_plan public.movo_plan_grants;
begin
  if auth.jwt()->>'role' is distinct from 'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
  if p_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_token_hash'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('movo-new-ref:'||p_user_id::text,0));
  if not exists(select 1 from auth.users where id=p_user_id
    and created_at >= now()-interval '7 days'
    and (email_confirmed_at is not null or phone_confirmed_at is not null))
    then raise exception 'verified_new_account_required'; end if;
  if exists(select 1 from public.movo_store_entitlements where user_id=p_user_id and environment='production')
    then raise exception 'already_purchased'; end if;
  insert into public.movo_plan_grants(user_id) values(p_user_id) on conflict do nothing;
  select * into v_plan from public.movo_plan_grants where user_id=p_user_id for update;
  if v_plan.referred_by is not null or exists(select 1 from public.movo_referral_claims where referred_id=p_user_id)
    then raise exception 'referral_already_claimed'; end if;
  select * into v_inv from public.movo_referral_invites
   where token_hash=p_hash and claimed_at is null and expires_at>now() and referrer_id<>p_user_id
   for update;
  if v_inv.id is null then raise exception 'invalid_or_used_invite'; end if;
  update public.movo_referral_invites set claimed_by=p_user_id,claimed_at=now() where id=v_inv.id;
  update public.movo_plan_grants set referred_by=v_inv.referrer_id where user_id=p_user_id;
  insert into public.movo_referral_claims(invite_id,referrer_id,referred_id)
  values(v_inv.id,v_inv.referrer_id,p_user_id);
  return jsonb_build_object('claimed',true,'claimId',(select id from public.movo_referral_claims where referred_id=p_user_id));
end $$;
revoke all on function public.movo_claim_invite(uuid,text) from public,anon,authenticated;
grant execute on function public.movo_claim_invite(uuid,text) to service_role;

create function public.movo_issue_referral_challenge(p_user_id uuid,p_hash text)
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
 'points',(select coalesce(sum(points),0) from public.movo_referral_points_ledger where referrer_id=p_user_id),
 'referredUsers',(select count(*) from public.movo_referral_claims where referrer_id=p_user_id),
 'paidUpgrades',(select count(*) from public.movo_referral_points_ledger where referrer_id=p_user_id and event_kind='paid_upgrade'),
 'pendingReview',(select count(*) from public.movo_referral_claims where referrer_id=p_user_id and review_required),
 'pendingNativeProof',(select exists(select 1 from public.movo_referral_claims where referred_id=p_user_id and native_verified_at is null))
 );
end $$;
revoke all on function public.movo_referral_points_status(uuid) from public,anon,authenticated;
grant execute on function public.movo_referral_points_status(uuid) to service_role;
commit;
