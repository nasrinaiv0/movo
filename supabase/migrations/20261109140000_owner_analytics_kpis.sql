-- MOVO owner analytics: aggregate-only KPIs and per-page effective plans for the owner console.
-- Requires 20261109000432_owner_operations_workspaces.sql. Callable only by service_role (the owner API, after its
-- allowlist + MFA checks). Returns counts only: no money amounts, no merchants, no per-user financial rows.
begin;

create or replace function public.movo_owner_kpis()
returns jsonb language plpgsql stable security invoker set search_path = ''
as $kpi$
declare
  v_users jsonb; v_plans jsonb; v_trials jsonb; v_activity jsonb; v_sources jsonb; v_daily jsonb; v_with_accounts bigint;
begin
  if (select auth.jwt()->>'role') is distinct from 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'total', count(*),
    'verified', count(*) filter (where u.email_confirmed_at is not null or u.phone_confirmed_at is not null),
    'new7d', count(*) filter (where u.created_at >= now() - interval '7 days'),
    'new30d', count(*) filter (where u.created_at >= now() - interval '30 days'),
    'signedIn7d', count(*) filter (where u.last_sign_in_at >= now() - interval '7 days'),
    'signedIn30d', count(*) filter (where u.last_sign_in_at >= now() - interval '30 days'))
  into v_users from auth.users u;

  -- Effective plan of every account, decided by the same rules as the app (store, manual, trial, referral).
  select jsonb_build_object(
    'free', count(*) filter (where p.status->>'tier' = 'free'),
    'pro', count(*) filter (where p.status->>'tier' = 'pro'),
    'proPlus', count(*) filter (where p.status->>'tier' = 'pro_plus'),
    'bySource', jsonb_build_object(
      'store', count(*) filter (where p.status->>'source' = 'store'),
      'manual', count(*) filter (where p.status->>'source' = 'manual'),
      'trial', count(*) filter (where p.status->>'source' = 'trial'),
      'referral', count(*) filter (where p.status->>'source' = 'referral')))
  into v_plans
  from auth.users u cross join lateral public.movo_plan_status(u.id) as p(status);

  select jsonb_build_object(
    'started', count(*) filter (where g.trial_started_at is not null),
    'active', count(*) filter (where g.trial_expires_at > now()),
    'ended', count(*) filter (where g.trial_expires_at <= now()),
    'converted', count(*) filter (where g.trial_started_at is not null and exists(
      select 1 from public.movo_store_entitlements e
      where e.user_id = g.user_id and e.environment = 'production' and e.paid_verified)))
  into v_trials from public.movo_plan_grants g;

  select count(distinct a.user_id) into v_with_accounts from public.financial_accounts a;

  select jsonb_build_object(
    'transactions7d', count(*) filter (where t.created_at >= now() - interval '7 days'),
    'transactions30d', count(*),
    'activeUsers7d', count(distinct t.user_id) filter (where t.created_at >= now() - interval '7 days'),
    'activeUsers30d', count(distinct t.user_id),
    'usersWithAccounts', v_with_accounts)
  into v_activity from public.transactions t where t.created_at >= now() - interval '30 days';

  -- How records are captured (manual, CSV, phone automations...) over the last 30 days.
  select coalesce(jsonb_agg(jsonb_build_object('source', x.source, 'count', x.n) order by x.n desc, x.source), '[]'::jsonb)
  into v_sources
  from (select coalesce(nullif(t.source, ''), 'manual') as source, count(*) as n
        from public.transactions t where t.created_at >= now() - interval '30 days' group by 1) x;

  -- Last 30 UTC days: registrations, accounts that recorded something, and records created.
  select coalesce(jsonb_agg(jsonb_build_object('day', to_char(d.day, 'YYYY-MM-DD'), 'signups', su.n,
           'activeUsers', tx.users, 'transactions', tx.n) order by d.day), '[]'::jsonb)
  into v_daily
  from pg_catalog.generate_series(date_trunc('day', now()) - interval '29 days', date_trunc('day', now()), interval '1 day') d(day)
  cross join lateral (select count(*) as n from auth.users u
                      where u.created_at >= d.day and u.created_at < d.day + interval '1 day') su
  cross join lateral (select count(*) as n, count(distinct t.user_id) as users from public.transactions t
                      where t.created_at >= d.day and t.created_at < d.day + interval '1 day') tx;

  return jsonb_build_object('generatedAt', now(), 'users', v_users, 'plans', v_plans, 'trials', v_trials,
    'activity', v_activity, 'sources', v_sources, 'daily', v_daily);
end $kpi$;
revoke all on function public.movo_owner_kpis() from public, anon, authenticated;
grant execute on function public.movo_owner_kpis() to service_role;

-- Effective plan (tier, source, expiry) for one page of the user directory, at most 100 accounts per call.
create or replace function public.movo_owner_user_plans(p_users uuid[])
returns jsonb language plpgsql stable security invoker set search_path = ''
as $plans$
declare v_result jsonb;
begin
  if (select auth.jwt()->>'role') is distinct from 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_users is null or coalesce(array_length(p_users, 1), 0) > 100 then
    raise exception 'invalid_user_page' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('userId', u.id, 'tier', p.status->>'tier',
           'source', p.status->>'source', 'expiresAt', p.status->>'expiresAt')), '[]'::jsonb)
  into v_result
  from auth.users u cross join lateral public.movo_plan_status(u.id) as p(status)
  where u.id = any(p_users);
  return v_result;
end $plans$;
revoke all on function public.movo_owner_user_plans(uuid[]) from public, anon, authenticated;
grant execute on function public.movo_owner_user_plans(uuid[]) to service_role;
commit;
