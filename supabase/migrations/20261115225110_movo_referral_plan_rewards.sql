begin;

-- Preserve earned balances when the inviter deletes their account. The invitee still owns their claims.
alter table public.movo_referral_claims
  alter column referrer_id drop not null,
  drop constraint movo_referral_claims_referrer_id_fkey,
  add constraint movo_referral_claims_referrer_id_fkey foreign key (referrer_id) references auth.users(id) on delete set null;

alter table public.movo_referral_points_ledger
  alter column referrer_id drop not null,
  drop constraint movo_referral_points_ledger_referrer_id_fkey,
  add constraint movo_referral_points_ledger_referrer_id_fkey foreign key (referrer_id) references auth.users(id) on delete set null,
  drop constraint movo_referral_points_ledger_event_kind_check,
  drop constraint movo_referral_points_ledger_check,
  add constraint movo_referral_points_event_value check (
    (event_kind='native_signup' and points=5)
    or (event_kind='invitee_signup' and points=20)
    or (event_kind in ('paid_upgrade','invitee_paid') and points=100)
    or (event_kind in ('paid_reversal','invitee_paid_reversal') and points=-100)),
  add column beneficiary_id uuid generated always as (
    case when event_kind in ('invitee_signup','invitee_paid','invitee_paid_reversal') then referred_id else referrer_id end
  ) stored;

create index movo_referral_points_beneficiary_idx on public.movo_referral_points_ledger(beneficiary_id);

alter table public.movo_referral_point_redemptions
  add column tier text not null default 'pro' check (tier in ('pro','pro_plus')),
  add column request_id uuid,
  drop constraint movo_referral_point_redemptions_check,
  add constraint movo_referral_point_redemptions_cost check (
    points = months * case tier when 'pro' then 500 when 'pro_plus' then 750 end),
  add unique (user_id, request_id);

-- Expose only the verified/new decision to trusted RPCs instead of granting auth.users access.
create function public.movo_referral_verified_account(p_user_id uuid, p_new boolean default false) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.jwt()->>'role' is distinct from 'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
  return exists(select 1 from auth.users where id=p_user_id
    and (email_confirmed_at is not null or phone_confirmed_at is not null)
    and (not p_new or created_at >= now()-interval '7 days'));
end $$;
revoke all on function public.movo_referral_verified_account(uuid,boolean) from public,anon,authenticated;
grant execute on function public.movo_referral_verified_account(uuid,boolean) to service_role;

create or replace function public.movo_claim_referral_code(p_user_id uuid, p_code text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare v_plan public.movo_plan_grants; v_lookup jsonb; v_referrer uuid;
begin
  if auth.jwt()->>'role' is distinct from 'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('movo-trial:'||p_user_id::text,0));
  if not public.movo_referral_verified_account(p_user_id)
    then return jsonb_build_object('claimed', false, 'error', 'verified_account_required'); end if;
  insert into public.movo_plan_grants(user_id) values (p_user_id) on conflict (user_id) do nothing;
  select * into v_plan from public.movo_plan_grants where user_id = p_user_id for update;
  if v_plan.referred_by is not null or exists(select 1 from public.movo_referral_claims where referred_id = p_user_id)
    then return jsonb_build_object('claimed', false, 'error', 'already_referred'); end if;
  if not public.movo_referral_verified_account(p_user_id, true)
    then return jsonb_build_object('claimed', false, 'error', 'account_not_new'); end if;
  if exists(select 1 from public.movo_store_entitlements where user_id = p_user_id and environment = 'production')
    then return jsonb_build_object('claimed', false, 'error', 'already_purchased'); end if;
  v_lookup := public.movo_referral_lookup(p_user_id, p_code);
  if v_lookup ? 'error' then return jsonb_build_object('claimed', false, 'error', v_lookup->>'error'); end if;
  v_referrer := (v_lookup->>'referrer')::uuid;
  if not public.movo_link_referral_claim(p_user_id, v_referrer) then
    return jsonb_build_object('claimed', false, 'error', 'already_purchased');
  end if;
  update public.movo_plan_grants set referred_by = v_referrer where user_id = p_user_id;
  return jsonb_build_object('claimed', true);
end $$;

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
  if g.trial_started_at is null and exists(select 1 from public.movo_store_entitlements where user_id=uid and environment='production') then
    raise exception 'trial_not_eligible';
  end if;
  -- Welcome can automatically start Pro before a person returns from sign-in with their code.
  if p_referral_code is not null and g.referred_by is null
      and not exists(select 1 from public.movo_referral_claims where referred_id=uid) then
    if not exists(select 1 from auth.users where id=uid and created_at >= now()-interval '7 days') then
      return jsonb_build_object('error', 'account_not_new');
    end if;
    v_lookup := public.movo_referral_lookup(uid, p_referral_code);
    -- Returned, not raised, so the counted attempt stays recorded.
    if v_lookup ? 'error' then return jsonb_build_object('error', v_lookup->>'error'); end if;
    referrer := (v_lookup->>'referrer')::uuid;
    if not public.movo_link_referral_claim(uid, referrer) then
      return jsonb_build_object('error', 'already_purchased');
    end if;
  end if;
  update public.movo_plan_grants set trial_started_at=coalesce(g.trial_started_at, now()),
    trial_expires_at=coalesce(g.trial_expires_at, now()+interval '1 month'),
    referred_by=coalesce(g.referred_by, referrer)
    where user_id=uid and (g.trial_started_at is null or referrer is not null);
  return public.movo_plan_status(uid);
end $$;

create or replace function public.movo_award_referral_upgrade(p_entitlement_id uuid,p_user_id uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare v_claim public.movo_referral_claims; v_owner uuid;
begin
  if auth.jwt()->>'role' is distinct from 'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
  select * into v_claim from public.movo_referral_claims where referred_id=p_user_id for update;
  if v_claim.id is null or v_claim.native_verified_at is null or v_claim.review_required then return; end if;
  if not exists(select 1 from public.movo_store_entitlements
    where id=p_entitlement_id and user_id=p_user_id and environment='production'
    and paid_verified=true and status in ('active','canceled','grace_period') and expires_at>now()) then return; end if;
  for v_owner in select x from unnest(array[p_user_id, v_claim.referrer_id]) x where x is not null order by x loop
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('movo-points-owner:'||v_owner::text,0));
  end loop;
  insert into public.movo_referral_points_ledger(claim_id,referrer_id,referred_id,event_kind,points,source_entitlement_id)
  select v_claim.id,v_claim.referrer_id,p_user_id,kind,100,p_entitlement_id
  from (values ('paid_upgrade'), ('invitee_paid')) as rewards(kind)
  where (kind='paid_upgrade' and v_claim.referrer_id is not null)
     or (kind='invitee_paid' and exists(select 1 from public.movo_referral_points_ledger
          where claim_id=v_claim.id and event_kind='invitee_signup'))
  on conflict(claim_id,event_kind) do nothing;
end $$;

create or replace function public.movo_record_native_referral(p_user_id uuid,p_challenge_id uuid,p_hash text,p_platform text,p_native_key_hash text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_claim public.movo_referral_claims; v_hold boolean := false; v_paid uuid; v_owner uuid;
begin
  if auth.jwt()->>'role' is distinct from 'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
  if p_platform is null or p_platform not in ('ios','android') or p_native_key_hash is null or p_native_key_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_native_proof'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('movo-native:'||p_user_id::text,0));
  update public.movo_referral_challenges set used_at=now()
  where id=p_challenge_id and referred_id=p_user_id and challenge_hash=p_hash and used_at is null and expires_at>now();
  if not found then raise exception 'invalid_or_replayed_challenge'; end if;
  select * into v_claim from public.movo_referral_claims where referred_id=p_user_id for update;
  if v_claim.id is null or v_claim.native_verified_at is not null then raise exception 'already_verified_or_not_referred'; end if;
  if not public.movo_referral_verified_account(p_user_id) then raise exception 'verified_account_required'; end if;
  for v_owner in select x from unnest(array[p_user_id, v_claim.referrer_id]) x where x is not null order by x loop
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('movo-points-owner:'||v_owner::text,0));
  end loop;
  if v_claim.referrer_id is not null then
    v_hold := (select count(*) from public.movo_referral_points_ledger where referrer_id=v_claim.referrer_id
      and event_kind='native_signup' and created_at>now()-interval '24 hours')>=10;
  end if;
  update public.movo_referral_claims set native_verified_at=now(),platform=p_platform,native_key_hash=p_native_key_hash,
    review_required=v_hold where id=v_claim.id;
  if not v_hold then
    insert into public.movo_referral_points_ledger(claim_id,referrer_id,referred_id,event_kind,points)
    select v_claim.id,v_claim.referrer_id,p_user_id, kind, value from
      (values ('native_signup', 5), ('invitee_signup', 20)) as rewards(kind, value)
      where kind = 'invitee_signup' or v_claim.referrer_id is not null;
    -- If the store webhook already arrived, post the payment award in this same transaction.
    select id into v_paid from public.movo_store_entitlements
      where user_id=p_user_id and environment='production' and paid_verified
        and status in ('active','canceled','grace_period') and expires_at>now()
      order by purchased_at asc nulls last, verified_at asc, id limit 1;
    if v_paid is not null then perform public.movo_award_referral_upgrade(v_paid,p_user_id); end if;
  end if;
  return jsonb_build_object('awarded',not v_hold,'pendingReview',v_hold);
end $$;

create or replace function public.movo_reverse_referral_upgrade(p_user_id uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare v_claim public.movo_referral_claims; v_owner uuid;
begin
  if auth.jwt()->>'role' is distinct from 'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
  select * into v_claim from public.movo_referral_claims where referred_id=p_user_id for update;
  if v_claim.id is null then return; end if;
  if exists(select 1 from public.movo_store_entitlements where user_id=p_user_id
     and environment='production' and paid_verified=true and status in ('active','canceled','grace_period') and expires_at>now()) then return; end if;
  for v_owner in select x from unnest(array[p_user_id, v_claim.referrer_id]) x where x is not null order by x loop
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('movo-points-owner:'||v_owner::text,0));
  end loop;
  insert into public.movo_referral_points_ledger(claim_id,referrer_id,referred_id,event_kind,points,source_entitlement_id)
  select v_claim.id,v_claim.referrer_id,p_user_id,
    case l.event_kind when 'invitee_paid' then 'invitee_paid_reversal' else 'paid_reversal' end,-100,l.source_entitlement_id
    from public.movo_referral_points_ledger l
    join public.movo_store_entitlements e on e.id=l.source_entitlement_id
    where l.claim_id=v_claim.id and l.event_kind in ('paid_upgrade','invitee_paid')
      and e.user_id=p_user_id and e.environment='production' and e.status='revoked'
      and (l.event_kind='invitee_paid' or v_claim.referrer_id is not null)
  on conflict(claim_id,event_kind) do nothing;
end $$;

create or replace function public.movo_referral_points_balance(p_user_id uuid) returns integer
language sql stable security invoker set search_path = '' as $$
  select (coalesce((select sum(points) from public.movo_referral_points_ledger where beneficiary_id = p_user_id), 0)
    - coalesce((select sum(points) from public.movo_referral_point_redemptions where user_id = p_user_id), 0))::integer
$$;

create or replace function public.movo_redeem_referral_points(p_user_id uuid, p_months integer, p_tier text, p_request_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_balance integer; v_starts timestamptz; v_expires timestamptz; v_cost integer; v_existing public.movo_referral_point_redemptions;
begin
  if auth.jwt()->>'role' is distinct from 'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
  if p_months is null or p_months < 1 or p_months > 12 then raise exception 'invalid_months'; end if;
  v_cost := case p_tier when 'pro' then 500 when 'pro_plus' then 750 end;
  if v_cost is null then raise exception 'invalid_reward_tier'; end if;
  if p_request_id is null then raise exception 'invalid_redemption_request'; end if;
  -- Match the store's lock order before checking paid access, then serialize with ledger changes.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('movo-trial:'||p_user_id::text,0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('movo-points-owner:'||p_user_id::text,0));
  if not public.movo_referral_verified_account(p_user_id) then raise exception 'verified_account_required'; end if;
  select * into v_existing from public.movo_referral_point_redemptions where user_id=p_user_id and request_id=p_request_id;
  if found then
    if v_existing.tier <> p_tier or v_existing.months <> p_months then raise exception 'redemption_request_conflict'; end if;
    return jsonb_build_object('redeemedMonths',p_months,'tier',p_tier,'startsAt',v_existing.starts_at,
      'expiresAt',v_existing.expires_at,'points',public.movo_referral_points_balance(p_user_id));
  end if;
  v_balance := public.movo_referral_points_balance(p_user_id);
  if v_balance < p_months * v_cost then raise exception 'not_enough_points'; end if;
  -- A store term can renew before a reward starts. Keep the points available until the store term ends.
  if exists(select 1 from public.movo_store_entitlements where user_id=p_user_id and environment='production'
      and status in ('active','canceled','grace_period') and expires_at>now()) then
    raise exception 'store_plan_active';
  end if;
  select greatest(now(),
    (select max(expires_at) from public.movo_referral_point_redemptions where user_id = p_user_id),
    (select trial_expires_at from public.movo_plan_grants where user_id = p_user_id and trial_expires_at > now()),
    (select reward_expires_at from public.movo_plan_grants where user_id = p_user_id and reward_started_at <= now() and reward_expires_at > now()),
    (select max(expires_at) from public.movo_manual_plan_grants where user_id = p_user_id and revoked_at is null and expires_at > now()))
  into v_starts;
  v_expires := v_starts + pg_catalog.make_interval(months => p_months);
  insert into public.movo_referral_point_redemptions(user_id, months, points, tier, starts_at, expires_at, request_id)
  values (p_user_id, p_months, p_months * v_cost, p_tier, v_starts, v_expires, p_request_id);
  return jsonb_build_object('redeemedMonths', p_months, 'tier', p_tier, 'startsAt', v_starts, 'expiresAt', v_expires,
    'points', public.movo_referral_points_balance(p_user_id));
end $$;

revoke all on function public.movo_redeem_referral_points(uuid,integer,text,uuid) from public,anon,authenticated;
grant execute on function public.movo_redeem_referral_points(uuid,integer,text,uuid) to service_role;

-- Retire the old RPC so stale deployments cannot continue to redeem outside the idempotent contract.
revoke execute on function public.movo_redeem_referral_points(uuid,integer) from service_role;

create or replace function public.movo_iap_commit(p_user_id uuid,p_verified jsonb,p_fence uuid,p_event_id text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  v_platform text:=p_verified->>'platform'; v_key text:=p_verified->>'storeSubscriptionKey';
  v_link text:=p_verified->>'linkedPurchaseTokenHash'; v_status text:=p_verified->>'status';
  v_tx text:=p_verified->>'storeTransactionId'; v_event timestamptz:=(p_verified->>'eventAt')::timestamptz;
  v_purchase timestamptz:=(p_verified->>'purchasedAt')::timestamptz;
  old public.movo_store_entitlements; v_id uuid; k text; v_duplicate boolean:=false; v_blocked boolean;
  v_environment text:=p_verified->>'environment';
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
  if v_environment is null or v_environment not in ('production','sandbox')
     or v_event is null or v_event>clock_timestamp()+interval '5 minutes' then raise exception 'invalid_store_state'; end if;
  if v_environment='sandbox' and (v_platform<>'google' or p_user_id is null
    or not exists(select 1 from public.movo_store_test_users where user_id=p_user_id)) then raise exception 'test_account_not_enabled'; end if;
  if p_user_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('movo-trial:'||p_user_id::text,0));
  end if;
  select * into old from public.movo_store_entitlements where platform=v_platform and store_subscription_key=v_key for update;
  if old.id is not null and old.user_id is distinct from p_user_id then raise exception 'purchase_already_linked'; end if;
  if old.id is not null and old.environment is distinct from v_environment then raise exception 'invalid_store_state'; end if;
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
    if exists(select 1 from public.movo_store_entitlements where platform='google' and store_subscription_key=v_link and environment<>v_environment) then raise exception 'invalid_store_state'; end if;
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
      p_verified->>'purchaseTokenHash',v_status,(p_verified->>'expiresAt')::timestamptz,v_environment,v_event,v_purchase,
      coalesce((p_verified->>'paidVerified')::boolean,false) and v_environment='production' and v_status in ('active','grace_period'))
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
  return jsonb_build_object('entitlementId',old.id,'status',old.status,'tier',old.tier,'expiresAt',old.expires_at,'environment',old.environment);
end $$;

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
      from public.movo_store_entitlements e where e.user_id = p_user_id
      and (e.environment = 'production' or (e.environment = 'sandbox'
        and exists(select 1 from public.movo_store_test_users t where t.user_id=p_user_id)))
      and e.status in ('active','grace_period') and e.expires_at > now()
    union all select mg.tier, mg.expires_at, 'manual'::text from public.movo_manual_plan_grants mg
      where mg.user_id = p_user_id and mg.revoked_at is null and mg.expires_at > now()
    union all select 'pro', g.trial_expires_at, 'trial' where g.trial_expires_at > now()
    union all select 'pro', g.reward_expires_at, 'referral' where g.reward_started_at <= now() and g.reward_expires_at > now() and v_count >= 10
    union all select pr.tier, pr.expires_at, 'points' from public.movo_referral_point_redemptions pr
      where pr.user_id = p_user_id and pr.starts_at <= now() and pr.expires_at > now()
  ) a order by (tier = 'pro_plus') desc, expires_at desc limit 1;
  return jsonb_build_object('tier',coalesce(v_tier,'free'),'active',v_tier is not null,'expiresAt',v_expiry,'source',v_source,
    'trialEligible',g.trial_started_at is null and not exists(select 1 from public.movo_store_entitlements where user_id=p_user_id and environment='production'),
    'trialExpiresAt',g.trial_expires_at,'referralCode',g.referral_code,'qualifiedReferrals',v_count,
    'rewardStartsAt',g.reward_started_at,'rewardExpiresAt',g.reward_expires_at);
end $$;

create or replace function public.movo_referral_points_status(p_user_id uuid)
returns jsonb language plpgsql volatile security invoker set search_path='' as $$
declare v_balance integer;
begin
 if auth.jwt()->>'role' is distinct from 'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
 if public.movo_referral_verified_account(p_user_id) then
   insert into public.movo_plan_grants(user_id) values(p_user_id) on conflict (user_id) do nothing;
 end if;
 v_balance := public.movo_referral_points_balance(p_user_id);
 return jsonb_build_object(
 'referralCode',(select referral_code from public.movo_plan_grants where user_id=p_user_id),
 'points',v_balance,
 'monthsAvailable',greatest(0, v_balance / 500),
 'pointsProUntil',(select max(expires_at) from public.movo_referral_point_redemptions
   where user_id=p_user_id and tier='pro' and expires_at>now()),
 'pointsProPlusUntil',(select max(expires_at) from public.movo_referral_point_redemptions
   where user_id=p_user_id and tier='pro_plus' and expires_at>now()),
 'storePlanActive',exists(select 1 from public.movo_store_entitlements where user_id=p_user_id
   and environment='production' and status in ('active','canceled','grace_period') and expires_at>now()),
 'referredUsers',(select count(*) from public.movo_plan_grants where referred_by=p_user_id),
 'paidUpgrades',(select count(*) from public.movo_referral_points_ledger where referrer_id=p_user_id and event_kind='paid_upgrade'),
 'pendingReview',(select count(*) from public.movo_referral_claims where
    (referrer_id=p_user_id or referred_id=p_user_id) and review_required),
 'pendingNativeProof',(select exists(select 1 from public.movo_referral_claims where referred_id=p_user_id and native_verified_at is null)),
 -- Someone who joined in the last 7 days, was not referred yet and never bought a plan can still enter a code.
 'canClaim',(select not exists(select 1 from public.movo_plan_grants where user_id=p_user_id and referred_by is not null)
   and not exists(select 1 from public.movo_referral_claims where referred_id=p_user_id)
   and public.movo_referral_verified_account(p_user_id, true)
   and not exists(select 1 from public.movo_store_entitlements where user_id=p_user_id and environment='production'))
 );
end $$;

commit;
