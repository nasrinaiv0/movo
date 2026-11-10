"""Run production migration SQL and 12 privileged finance-RPC tenant tests against
an ephemeral *local* Postgres database. No Supabase project or remote host used.

Local Vercel Sandbox:
  MOVO_TEST_PGHOST=/var/run/postgresql MOVO_TEST_PGUSER=ubuntu python3 scripts/test-finance-rpc-isolation-local.py

CI:
  MOVO_TEST_PGHOST=127.0.0.1 MOVO_TEST_PGUSER=postgres PGPASSWORD=<local CI only>
  python3 scripts/test-finance-rpc-isolation-local.py

Only loopback and the standard Unix socket are accepted, even if PGHOST is
accidentally set to a production database elsewhere.
"""
import os
import subprocess
import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOST = os.environ.get("MOVO_TEST_PGHOST", "/var/run/postgresql")
PORT = os.environ.get("MOVO_TEST_PGPORT", "5432")
USER = os.environ.get("MOVO_TEST_PGUSER", os.environ.get("USER", "postgres"))
if HOST not in {"/var/run/postgresql", "127.0.0.1", "localhost", "::1"}:
    sys.exit("Unsafe database host: only disposable localhost PostgreSQL is allowed")
if not PORT.isdigit() or not 1 <= int(PORT) <= 65535:
    sys.exit("Invalid local PostgreSQL port")
DATABASE = "movo_security_test_" + uuid.uuid4().hex[:14]
CONN = ["-h", HOST, "-p", PORT, "-U", USER]
ENV = {**os.environ, "PGHOST": HOST, "PGPORT": PORT, "PGUSER": USER, "PGCONNECT_TIMEOUT": "5"}
# The chosen target is created by this process; no user-defined database is
# accepted and errors do not cause an automatic retry against another host.


def command(executable, *args, stdin=None):
    result = subprocess.run(
        [executable, *args],
        input=stdin, text=True, capture_output=True, env=ENV,
        timeout=60,
    )
    if result.returncode:
        print((result.stdout + "\n" + result.stderr)[-3500:], file=sys.stderr)
        raise RuntimeError(f"{executable} failed with exit {result.returncode}")
    return result


def sql(sql_text, title):
    command("psql", *CONN, "-X", "-v", "ON_ERROR_STOP=1", "-d", DATABASE, stdin=sql_text)
    print("PASS", title, flush=True)


BOOTSTRAP = r"""
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF;
END $$;
CREATE SCHEMA auth; CREATE SCHEMA storage;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email text,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  email_confirmed_at timestamptz,
  phone_confirmed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)
$$;
-- This is an inert local stub only. Hosted Supabase has the real RLS helper;
-- the migration revokes its privileges and never calls it.
CREATE FUNCTION public.rls_auto_enable() RETURNS void LANGUAGE plpgsql AS $$ BEGIN NULL; END $$;
CREATE TABLE storage.buckets(
  id text PRIMARY KEY, name text, public boolean DEFAULT false,
  file_size_limit bigint, allowed_mime_types text[]
);
CREATE TABLE storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text REFERENCES storage.buckets(id),
  name text, owner_id text
);
CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN name IS NULL THEN ARRAY[]::text[]
    ELSE string_to_array(regexp_replace(name,'/[^/]*$',''),'/') END
$$;
GRANT USAGE ON SCHEMA auth, public, storage TO authenticated, anon, service_role;
GRANT SELECT ON auth.users TO authenticated, service_role;
GRANT ALL ON storage.buckets, storage.objects TO authenticated, service_role;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
"""


def main():
    command("createdb", *CONN, DATABASE)
    try:
        sql(BOOTSTRAP, "local Supabase fixture")
        migrations = sorted((ROOT / "supabase" / "migrations").glob("*.sql"))
        if len(migrations) < 28:
            raise RuntimeError("Expected complete MOVO migration history (at least 28)")
        for migration in migrations:
            sql(migration.read_text(), migration.name)
        sql((ROOT / "supabase/tests/security_definer_tenant_isolation.test.sql").read_text(),
            "12 SECURITY DEFINER cross-tenant denials and owner-only controls")
        sql((ROOT / "supabase/tests/hybrid_sync_operations.test.sql").read_text(),
            "Hybrid sync idempotency, CAS, precision, tenant isolation and entitlement")
        sql((ROOT / "supabase/tests/release_fk_covering_indexes.test.sql").read_text(),
            "five audited foreign-key covering index assertions")
        sql((ROOT / "supabase/tests/owner_account_deletion_fks.test.sql").read_text(),
            "owner audit immutability and account deletion without FK obstruction")
        print("PASS isolated finance authorization: no customer database accessed")
    finally:
        if not DATABASE.startswith("movo_security_test_"):
            raise RuntimeError("Safety guard: unexpected test database name")
        command("dropdb", *CONN, "--if-exists", "--force", DATABASE)


if __name__ == "__main__":
    main()
