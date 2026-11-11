"""Run production migration SQL and 12 privileged finance-RPC tenant tests against
an ephemeral *local* Postgres database. No Supabase project or remote host used.

Only GitHub Actions with the disposable PostgreSQL service container are allowed.
Local host installations and remote databases are deliberately rejected to prevent
accidental cluster-global role creation outside a disposable test environment.

CI:
  MOVO_TEST_PGHOST=127.0.0.1 MOVO_TEST_PGUSER=postgres PGPASSWORD=<local CI only>
  MOVO_TEST_PG_CONTAINER=<disposable service container ID> GITHUB_ACTIONS=true
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
# Creates cluster-global mock auth roles: never allow execution against a developer's
# ordinary local PostgreSQL cluster, even if its hostname is loopback.
if os.environ.get("GITHUB_ACTIONS") != "true" or not os.environ.get("MOVO_TEST_PG_CONTAINER", "").strip():
    sys.exit("Unsafe test target: requires a disposable GitHub Actions PostgreSQL service container")
if HOST not in {"/var/run/postgresql", "127.0.0.1", "localhost", "::1"}:
    sys.exit("Unsafe database host: only disposable localhost PostgreSQL is allowed")
if not PORT.isdigit() or not 1 <= int(PORT) <= 65535:
    sys.exit("Invalid local PostgreSQL port")
RUN_ID = uuid.uuid4().hex[:14]
DATABASE = "movo_security_test_" + RUN_ID
RESTORE_DATABASE = "movo_rollback_test_" + RUN_ID
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


def sql(sql_text, title, database=DATABASE):
    if database not in {DATABASE, RESTORE_DATABASE}:
        raise RuntimeError("Safety guard: only generated disposable databases are allowed")
    command("psql", *CONN, "-X", "-v", "ON_ERROR_STOP=1", "-d", database, stdin=sql_text)
    print("PASS", title, flush=True)


def snapshot_bytes():
    # No persistent CI artifact; never connect to or back up any remote database.
    proc = subprocess.run(
        ["pg_dump", *CONN, "-Fc", "--no-owner", "-d", DATABASE],
        capture_output=True, env=ENV, timeout=120,
    )
    if proc.returncode or not proc.stdout:
        raise RuntimeError("Disposable pre-upgrade snapshot failed: " + proc.stderr.decode(errors="replace")[-1000:])
    return proc.stdout


def restore_into_generated_test_database(snapshot, database):
    if database not in {DATABASE, RESTORE_DATABASE} or not snapshot:
        raise RuntimeError("Refusing to restore outside generated isolated test database")
    proc = subprocess.run(
        ["pg_restore", *CONN, "--exit-on-error", "--no-owner", "-d", database],
        input=snapshot, capture_output=True, env=ENV, timeout=120,
    )
    if proc.returncode:
        raise RuntimeError("Isolated snapshot restore failed: " + proc.stderr.decode(errors="replace")[-1800:])


def verify_disposable_rollback(snapshot):
    command("createdb", *CONN, RESTORE_DATABASE)
    restore_into_generated_test_database(snapshot, RESTORE_DATABASE)
    sql((ROOT / "supabase/tests/pr274_snapshot_restore_check.sql").read_text(),
        "snapshot restore preserved old schema, billing queue and finance data", RESTORE_DATABASE)



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
        cutoff = "20261111133000"
        baseline = [migration for migration in migrations if migration.name[:14] < cutoff]
        upgrade = [migration for migration in migrations if migration.name[:14] >= cutoff]
        if [migration.name[:14] for migration in upgrade] != [
            "20261111133000", "20261111133100", "20261111133200"
        ]:
            raise RuntimeError("Unexpected PR274 migration sequence or missing upgrade step")
        for migration in baseline:
            sql(migration.read_text(), "baseline: " + migration.name)
        # Preserve the clean baseline before seeding the TWO fake owners.
        # Their rows must never influence independent owner/retention tests.
        clean_baseline_snapshot = snapshot_bytes()
        sql((ROOT / "supabase/tests/pr274_legacy_preupgrade_fixture.sql").read_text(),
            "old client raw write contract before PR274, with synthetic data")
        pre_upgrade_snapshot = snapshot_bytes()
        for migration in upgrade:
            sql(migration.read_text(), "staged: " + migration.name)
        sql((ROOT / "supabase/tests/pr274_postupgrade_rehearsal.sql").read_text(),
            "PR274 migration account clear, retention and old-client compatibility")
        # This proves only a disposable snapshot restore. Production needs PITR,
        # separate provider snapshots and a confirmed rollback window.
        verify_disposable_rollback(pre_upgrade_snapshot)
        # All synthetic pre-upgrade fixtures persisted outside their raw-write
        # subtransaction. Restore a clean pre-fixture baseline and apply the
        # exact same three migrations again for isolated regression suites.
        # This is safe ONLY because DATABASE is a randomly created CI-only DB.
        if not DATABASE.startswith("movo_security_test_") or not os.environ.get("MOVO_TEST_PG_CONTAINER", "").strip():
            raise RuntimeError("Cannot reset a non-disposable database")
        command("dropdb", *CONN, "--force", DATABASE)
        command("createdb", *CONN, DATABASE)
        restore_into_generated_test_database(clean_baseline_snapshot, DATABASE)
        for migration in upgrade:
            sql(migration.read_text(), "clean schema: " + migration.name)
        sql((ROOT / "supabase/tests/security_definer_tenant_isolation.test.sql").read_text(),
            "12 SECURITY DEFINER cross-tenant denials and owner-only controls")
        sql((ROOT / "supabase/tests/hybrid_sync_operations.test.sql").read_text(),
            "Hybrid sync idempotency, CAS, precision, tenant isolation and entitlement")
        sql((ROOT / "supabase/tests/release_fk_covering_indexes.test.sql").read_text(),
            "five audited foreign-key covering index assertions")
        sql((ROOT / "supabase/tests/owner_account_deletion_fks.test.sql").read_text(),
            "owner audit immutability and account deletion without FK obstruction")
        sql((ROOT / "supabase/tests/account_erasure_retention.test.sql").read_text(),
            "Direct transaction denial, owner-only account erasure and bounded retention")
        sql((ROOT / "supabase/tests/bills_payments.test.sql").read_text(),
            "bill payments, ledger amounts and cross-tenant denial")
        sql((ROOT / "supabase/tests/obligation_account_postings.test.sql").read_text(),
            "obligation cash-posting and authorization contracts")
        print("PASS isolated finance authorization: no customer database accessed")
    finally:
        if not DATABASE.startswith("movo_security_test_") or not RESTORE_DATABASE.startswith("movo_rollback_test_"):
            raise RuntimeError("Safety guard: unexpected test database name")
        command("dropdb", *CONN, "--if-exists", "--force", RESTORE_DATABASE)
        command("dropdb", *CONN, "--if-exists", "--force", DATABASE)


if __name__ == "__main__":
    main()
