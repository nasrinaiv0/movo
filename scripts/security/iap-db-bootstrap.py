# Disposable PostgreSQL fixture only; never run on a deployed database.
from pathlib import Path
root=Path(__file__).resolve().parents[2]
print('''create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create table auth.users(id uuid primary key,email_confirmed_at timestamptz,phone_confirmed_at timestamptz,created_at timestamptz not null default now());
create function auth.uid() returns uuid language sql as $$select null::uuid$$;
create function auth.jwt() returns jsonb language sql as $$select '{"role":"service_role"}'::jsonb$$;
grant usage on schema public,auth to service_role,authenticated,anon;
create table public.financial_accounts(user_id uuid); create table public.transactions(user_id uuid); create table public.user_preferences(user_id uuid);
''')
a=(root/'supabase/migrations/20261105152530_movo_store_entitlements.sql').read_text()
print(a[:a.index('-- Remove the writable')])
a=(root/'supabase/migrations/20261107070000_movo_plans_trials_referrals.sql').read_text()
print(a[:a.index('-- Triggers also cover')]); print('commit;')
print((root/'supabase/migrations/20261108230330_owner_manual_plan_grants.sql').read_text())
print((root/'supabase/migrations/20261109153000_verified_referral_points.sql').read_text())
print((root/'supabase/migrations/20261109160000_iap_integrity.sql').read_text())

# Include the isolated P0 test-purchase migration in disposable PostgreSQL tests.
print((root/'supabase/migrations/20261113000000_google_play_test_purchase_isolation.sql').read_text())
