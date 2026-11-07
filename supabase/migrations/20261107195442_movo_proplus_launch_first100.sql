-- MOVO first-100 Pro+ founder promotion (OFF by default).
-- This migration creates atomic eligibility reservations. It neither charges a
-- subscriber nor implies an App Store / Google Play free offer is live.
-- Enable only after both stores have an approved one-year free offer.
begin;

create table public.movo_proplus_launch_control (
  id text primary key check (id = 'first100_proplus'),
  enabled boolean not null default false,
  enabled_at timestamptz
);
insert into public.movo_proplus_launch_control(id, enabled) values ('first100_proplus', false)
on conflict (id) do nothing;
alter table public.movo_proplus_launch_control enable row level security;
revoke all on public.movo_proplus_launch_control from public, anon, authenticated;
grant all on public.movo_proplus_launch_control to service_role;

create table public.movo_proplus_launch_awards (
  user_id uuid primary key references auth.users(id) on delete cascade,
  slot smallint not null unique check (slot between 1 and 100),
  qualifying_entitlement_id uuid not null unique references public.movo_store_entitlements(id) on delete restrict,
  platform text not null check (platform in ('apple', 'google')),
  status text not null default 'reserved' check (status in ('reserved', 'redeemed', 'revoked')),
  qualified_at timestamptz not null default now(),
  store_offer_reference text unique,
  redeemed_at timestamptz,
  free_started_at timestamptz,
  free_expires_at timestamptz,
  constraint redeemed_requires_verified_period check (
    status <> 'redeemed'
    or (store_offer_reference is not null and redeemed_at is not null
      and free_started_at is not null and free_expires_at is not null
      and free_expires_at > free_started_at)
  )
);
alter table public.movo_proplus_launch_awards enable row level security;
revoke all on public.movo_proplus_launch_awards from public, anon, authenticated;
grant all on public.movo_proplus_launch_awards to service_role;
grant select on public.movo_proplus_launch_awards to authenticated;
create policy "founder_awards_own_read"
  on public.movo_proplus_launch_awards for select to authenticated
  using (user_id = (select auth.uid()));

-- Verified store entitlement is the only qualification input. No request-body,
-- user metadata, referral code, or frontend value creates a reservation.
create function public.movo_capture_first100_proplus()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_slot integer;
begin
  if new.status = 'revoked' then
    update public.movo_proplus_launch_awards
      set status = 'revoked'
      where qualifying_entitlement_id = new.id;
    return new;
  end if;
  if new.tier <> 'pro_plus'
    or new.environment <> 'production'
    or new.status not in ('active', 'canceled', 'grace_period')
    or new.expires_at <= now()
    or not exists(select 1 from public.movo_proplus_launch_control c
      where c.id='first100_proplus' and c.enabled and c.enabled_at is not null
        and new.created_at >= c.enabled_at)
  then return new; end if;
  -- Serialize all simultaneous purchasers; a unique user gets at most one
  -- reservation and only slots 1..100 can ever exist.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('movo:founder100:proplus',0));
  if exists(select 1 from public.movo_proplus_launch_awards a where a.user_id=new.user_id) then return new; end if;
  select min(candidate) into v_slot from pg_catalog.generate_series(1,100) candidate
   where not exists (select 1 from public.movo_proplus_launch_awards a where a.slot=candidate);
  if v_slot is not null then
    insert into public.movo_proplus_launch_awards(user_id,slot,qualifying_entitlement_id,platform)
      values(new.user_id,v_slot,new.id,new.platform);
  end if;
  return new;
end $$;
revoke all on function public.movo_capture_first100_proplus() from public, anon, authenticated;
grant execute on function public.movo_capture_first100_proplus() to service_role;
create trigger movo_proplus_founder100_verified
  after insert or update of tier, environment, status, expires_at on public.movo_store_entitlements
  for each row execute function public.movo_capture_first100_proplus();

-- Can be invoked only by the server after externally verifying a redeemed
-- twelve-month store offer and matching it to the reserved user. There is no
-- direct client API for redeeming a founder slot.
create function public.movo_record_verified_founder_offer(
  p_user_id uuid, p_store_offer_reference text, p_store_started_at timestamptz,
  p_store_expires_at timestamptz
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.movo_proplus_launch_awards;
begin
  if (select auth.jwt()->>'role') is distinct from 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_user_id is null or pg_catalog.length(pg_catalog.btrim(coalesce(p_store_offer_reference,''))) < 8
    or pg_catalog.length(p_store_offer_reference) > 128
    or p_store_started_at is null or p_store_expires_at is null
    or p_store_started_at > now() + interval '3 days'
    or p_store_started_at < now() - interval '15 days'
    or p_store_expires_at < p_store_started_at + interval '360 days'
    or p_store_expires_at > p_store_started_at + interval '367 days'
  then raise exception 'invalid_store_offer_evidence' using errcode = '22023'; end if;
  select * into v from public.movo_proplus_launch_awards where user_id=p_user_id for update;
  if v.user_id is null or v.status='revoked' then
    raise exception 'founder_offer_not_eligible' using errcode = '42501';
  end if;
  if v.status='redeemed' then
    if v.store_offer_reference is distinct from p_store_offer_reference then
      raise exception 'founder_offer_already_redeemed' using errcode = '23505';
    end if;
    return pg_catalog.jsonb_build_object('slot',v.slot,'startsAt',v.free_started_at,'expiresAt',v.free_expires_at);
  end if;
  update public.movo_proplus_launch_awards
    set status='redeemed', redeemed_at=now(), store_offer_reference=p_store_offer_reference,
        free_started_at=p_store_started_at, free_expires_at=p_store_expires_at
    where user_id=p_user_id;
  return pg_catalog.jsonb_build_object('slot',v.slot,'startsAt',p_store_started_at,'expiresAt',p_store_expires_at);
end $$;
revoke all on function public.movo_record_verified_founder_offer(uuid,text,timestamptz,timestamptz)
  from public, anon, authenticated;
grant execute on function public.movo_record_verified_founder_offer(uuid,text,timestamptz,timestamptz) to service_role;

-- Extend the authoritative plan-read function with only store-verified,
-- server-redeemed founder free periods. Reserved slots do not grant access.
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
      from public.movo_store_entitlements e where e.user_id = p_user_id and (e.environment = 'production' or exists(select 1 from public.movo_store_test_users where user_id=p_user_id))
      and e.status in ('active','canceled','grace_period') and e.expires_at > now()
    union all select 'pro', g.trial_expires_at, 'trial' where g.trial_expires_at > now()
    union all select 'pro', g.reward_expires_at, 'referral' where g.reward_started_at <= now() and g.reward_expires_at > now() and v_count >= 10
    union all select 'pro_plus', a.free_expires_at, 'founder100' from public.movo_proplus_launch_awards a
       where a.user_id=p_user_id and a.status='redeemed'
       and a.free_started_at <= now() and a.free_expires_at > now()
  ) a order by (tier = 'pro_plus') desc, expires_at desc limit 1;
  return jsonb_build_object('tier',coalesce(v_tier,'free'),'active',v_tier is not null,'expiresAt',v_expiry,'source',v_source,
    'trialEligible',g.trial_started_at is null and not exists(select 1 from public.movo_store_entitlements where user_id=p_user_id and environment='production'),
    'trialExpiresAt',g.trial_expires_at,'referralCode',g.referral_code,'qualifiedReferrals',v_count,
    'rewardStartsAt',g.reward_started_at,'rewardExpiresAt',g.reward_expires_at);
end $$;

-- Privileges on replaced function remain as configured by the plan migration.
commit;
