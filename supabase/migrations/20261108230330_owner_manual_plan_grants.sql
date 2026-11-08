-- Owner-managed complimentary access. Executed exclusively by a trusted SQL
-- administrator or a server using service_role. Never accept a client tier claim.
-- Requires 20261107070000_movo_plans_trials_referrals.sql first.
begin;
create table if not exists public.movo_manual_plan_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tier text not null check (tier in ('pro','pro_plus')),
  expires_at timestamptz not null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  reason text not null default '',
  constraint movo_manual_grant_reason_length check (length(reason) <= 500),
  constraint movo_manual_grant_revocation check (revoked_at is null or revoked_at >= granted_at)
);
create index if not exists movo_manual_plan_grants_lookup_idx
  on public.movo_manual_plan_grants (user_id, expires_at desc)
  where revoked_at is null;
alter table public.movo_manual_plan_grants enable row level security;
revoke all on public.movo_manual_plan_grants from public, anon, authenticated;
grant select, insert, update, delete on public.movo_manual_plan_grants to service_role;
-- No user-write policies: even Pro users cannot gift or extend access.
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
    union all select mg.tier, mg.expires_at, 'manual'::text from public.movo_manual_plan_grants mg
      where mg.user_id = p_user_id and mg.revoked_at is null and mg.expires_at > now()
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
commit;
