"""Run only against an isolated local PostgreSQL server, never a customer database.
Usage: PGPORT=55432 python3 scripts/test-plan-migration.py
Creates a disposable database with auth/storage and finance ownership fixtures,
then executes the real entitlement migration and adversarial SQL assertions.
"""
import os
import re
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[1]
env = {**os.environ, 'PGHOST': '127.0.0.1', 'PGPORT': os.environ.get('PGPORT', '55432'), 'PGDATABASE': 'movo_plans_isolated_' + str(os.getpid())}
subprocess.run(['createdb', '-h', env['PGHOST'], '-p', env['PGPORT'], env['PGDATABASE']], check=True)

def sql(content):
    subprocess.run(['psql', '-X', '-v', 'ON_ERROR_STOP=1'], input=content, text=True, env=env, check=True)

sql("""
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
end $$;
create schema auth; create schema storage;
create extension pgcrypto;
create table auth.users(id uuid primary key, email_confirmed_at timestamptz, phone_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('role',current_setting('request.jwt.claim.role',true))$$;
grant usage on schema auth, public, storage to authenticated, anon, service_role;
create table storage.buckets(id text primary key, public boolean);
create table storage.objects(id uuid default gen_random_uuid(), bucket_id text, owner_id text);
alter table storage.objects enable row level security;
grant all on storage.objects to authenticated;
grant select on storage.objects to anon;
create policy original_owner_access on storage.objects for all to authenticated using(owner_id=auth.uid()::text) with check(owner_id=auth.uid()::text);
insert into storage.buckets values ('premium-stickers',true);
""")
migration = (root/'supabase/migrations/20261107070000_movo_plans_trials_referrals.sql').read_text()
tables = re.search(r'foreach t in array array\[(.*?)\] loop', migration, re.S).group(1)
for table in re.findall(r"'([^']+)'", tables):
    sql(f"""create table public.{table}(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, source text);
      alter table public.{table} enable row level security; grant all on public.{table} to authenticated;
      create policy own on public.{table} for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());""")
store = (root/'supabase/migrations/20261105152530_movo_store_entitlements.sql').read_text().split('-- Remove the writable public schema')[0]
sql(store)
sql("insert into auth.users values ('00000000-0000-0000-0000-000000000001',now(),null); insert into public.financial_accounts(user_id) values('00000000-0000-0000-0000-000000000001');")
sql(migration)
sql((root/'supabase/tests/plan_access.test.sql').read_text())
sql((root/'supabase/tests/first_time_trial.test.sql').read_text())
sql((root/'supabase/migrations/20261108230330_owner_manual_plan_grants.sql').read_text())
sql((root/'supabase/tests/manual_plan_grants.test.sql').read_text())
sql((root/'supabase/migrations/20261108232950_owner_console_security_audit.sql').read_text())
sql((root/'supabase/tests/owner_console.test.sql').read_text())
print('PASS: plan migration and adversarial SQL checks in isolated PostgreSQL')
