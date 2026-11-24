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



def verify_atomic_loan_concurrency():
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    owner = "00000000-0000-0000-0000-00000000d201"
    bank = "10000000-0000-0000-0000-00000000d201"
    request = "50000000-0000-0000-0000-00000000d201"
    sql(f"""
      select set_config('request.jwt.claims','{{"role":"service_role"}}',false);
      insert into auth.users(id) values ('{owner}');
      insert into public.movo_manual_plan_grants(user_id,tier,expires_at,reason) values ('{owner}','pro',now()+interval '1 day','isolated concurrent test');
      insert into public.financial_accounts(id,user_id,name,account_type,currency,opening_balance)
      values ('{bank}','{owner}','Concurrent synthetic bank','bank','PHP',1000);
    """, "seed concurrent synthetic loan owner")
    gate = Barrier(2, timeout=10)
    def worker():
        gate.wait()
        result = command("psql", *CONN, "-X", "-Atq", "-v", "ON_ERROR_STOP=1", "-d", DATABASE, stdin=f"""
          begin;
          set local role authenticated;
          set local request.jwt.claims = '{{"role":"authenticated"}}';
          set local request.jwt.claim.sub = '{owner}';
          select (public.create_loan_atomic('{request}','{owner}','Concurrent debt','debt',500,'PHP',true,'{bank}',null,null,0,'[]',null,null)).id;
          select pg_sleep(0.5);
          commit;
        """)
        return result.stdout.strip()
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(worker) for _ in range(2)]
        ids = [future.result(timeout=65) for future in futures]
    if not ids[0] or ids[0] != ids[1]:
        raise RuntimeError("Concurrent identical requests did not return the same liability")
    sql(f"""
      do $race$ begin
        if (select count(*) from public.financial_loans where user_id='{owner}') <> 1
          or (select count(*) from public.loan_creation_requests where user_id='{owner}') <> 1
          or (select count(*) from public.loan_events where user_id='{owner}') <> 1
          or (select count(*) from public.accounting_postings where user_id='{owner}') <> 1
          or (select sum(signed_amount) from public.accounting_postings where account_id='{bank}') is distinct from 500
          or (select outstanding_principal from public.financial_loans where user_id='{owner}') is distinct from 500
        then raise exception 'concurrent loan duplicated or incomplete'; end if;
      end $race$;
    """, "two independent authenticated SQL sessions: exactly one disbursement")


def verify_friend_import_concurrency():
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    sender = "00000000-0000-0000-0000-00000000f301"
    owner = "00000000-0000-0000-0000-00000000f302"
    bank = "10000000-0000-0000-0000-00000000f302"
    connection = "20000000-0000-0000-0000-00000000f302"
    message = "30000000-0000-0000-0000-00000000f302"
    sql(f"""
      select set_config('request.jwt.claims','{{"role":"service_role"}}',false);
      insert into auth.users(id,email_confirmed_at) values ('{sender}',now()),('{owner}',now());
      insert into public.movo_manual_plan_grants(user_id,tier,expires_at,reason) values ('{owner}','pro',now()+interval '1 day','isolated concurrent import');
      insert into public.financial_accounts(id,user_id,name,account_type,currency,opening_balance) values ('{bank}','{owner}','Synthetic bank','bank','PHP',1000);
      insert into public.movo_friend_connections(id,member_low,member_high,name_low,name_high) values ('{connection}','{sender}','{owner}','Sender','Recipient');
      insert into public.movo_friend_messages(id,connection_id,sender_id,client_id,kind,body,card) values ('{message}','{connection}','{sender}',gen_random_uuid(),'transaction','','{{"type":"expense","currency":"PHP","amount":42.25,"date":"2026-11-23"}}');
      insert into public.movo_friend_transaction_decisions(message_id,recipient_id,status) values ('{message}','{owner}','accepted');
    """, "seed concurrent synthetic friend import")
    gate = Barrier(2, timeout=10)
    def worker():
        gate.wait()
        result = command("psql", *CONN, "-X", "-Atq", "-v", "ON_ERROR_STOP=1", "-d", DATABASE, stdin=f"""
          begin;
          set local role authenticated;
          set local request.jwt.claims = '{{"role":"authenticated"}}';
          set local request.jwt.claim.sub = '{owner}';
          select public.movo_import_friend_transaction('{owner}','{connection}','{message}','{bank}',null,'2026-11-23');
          select pg_sleep(0.5);
          commit;
        """)
        return result.stdout.strip()
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(worker) for _ in range(2)]
        receipts = [future.result(timeout=65) for future in futures]
    if not receipts[0] or receipts[0] != receipts[1]:
        raise RuntimeError("Concurrent imports did not return the same receipt")
    sql(f"""
      do $race$ begin
        if (select count(*) from public.transactions where id='{message}' and user_id='{owner}' and amount=42.25)<>1
           or (select count(*) from public.movo_sync_operations where operation_id='{message}' and user_id='{owner}')<>1
           or (select status from public.movo_friend_transaction_decisions where message_id='{message}') is distinct from 'imported'
        then raise exception 'atomic share duplicated or incomplete'; end if;
      end $race$;
    """, "two independent authenticated SQL sessions: exactly one share import")


def verify_friend_import_revocation_races():
    """Run both ordered outcomes using separate disposable database connections."""
    from concurrent.futures import ThreadPoolExecutor
    import time
    for index, mode in enumerate(("decline_first", "import_first", "remove_first", "erasure_first", "erase_after_import"), 1):
        sender = f"00000000-0000-0000-0000-00000000e{index}01"
        owner = f"00000000-0000-0000-0000-00000000e{index}02"
        bank = f"10000000-0000-0000-0000-00000000e{index}02"
        connection = f"20000000-0000-0000-0000-00000000e{index}02"
        message = f"30000000-0000-0000-0000-00000000e{index}02"
        marker = 846000 + index
        sql(f"""
          select set_config('request.jwt.claims','{{"role":"service_role"}}',false);
          insert into auth.users(id,email_confirmed_at) values ('{sender}',now()),('{owner}',now());
          insert into public.movo_manual_plan_grants(user_id,tier,expires_at,reason) values ('{owner}','pro',now()+interval '1 day','isolated revocation');
          insert into public.financial_accounts(id,user_id,name,account_type,currency,opening_balance) values ('{bank}','{owner}','Synthetic bank','bank','PHP',1000);
          insert into public.movo_friend_connections(id,member_low,member_high,name_low,name_high) values ('{connection}','{sender}','{owner}','Sender','Recipient');
          insert into public.movo_friend_messages(id,connection_id,sender_id,client_id,kind,body,card) values ('{message}','{connection}','{sender}',gen_random_uuid(),'transaction','','{{"type":"expense","currency":"PHP","amount":42.25,"date":"2026-11-23"}}');
          insert into public.movo_friend_transaction_decisions(message_id,recipient_id,status) values ('{message}','{owner}','accepted');
        """, "seed revocation race " + mode)
        recipient = f"set local role authenticated; set local request.jwt.claims = '{{\"role\":\"authenticated\"}}'; set local request.jwt.claim.sub = '{owner}';"
        service = """set local role service_role; set local request.jwt.claims = '{"role":"service_role"}';"""
        posting = f"select public.movo_import_friend_transaction('{owner}','{connection}','{message}','{bank}',null,'2026-11-23');"
        decline = f"""select public.movo_friend_transaction_decision('{owner}','decline_share','{{"connectionId":"{connection}","messageId":"{message}"}}');"""
        remove = f"select public.movo_friends('{sender}','remove',null,null,'{connection}');"
        erase = f"insert into public.movo_account_erasure_requests(user_id) values ('{owner}');"
        finish = f"select public.movo_finish_account_erasure('{owner}');"
        blocked = f"""
          do $block$ begin
            begin
              perform public.movo_import_friend_transaction('{owner}','{connection}','{message}','{bank}',null,'2026-11-23');
              raise exception 'revoked import unexpectedly posted';
            exception when insufficient_privilege then null;
            end;
          end $block$;
        """
        if mode == "import_first":
            first, second = recipient + posting, service + decline
        elif mode == "erase_after_import":
            first, second = recipient + posting, service + erase + finish
        else:
            first = service + {"decline_first": decline, "remove_first": remove, "erasure_first": erase}[mode]
            second = recipient + blocked
        def run(statement):
            return command("psql", *CONN, "-X", "-Atq", "-v", "ON_ERROR_STOP=1", "-d", DATABASE,
                           stdin="begin; set local lock_timeout='10s'; " + statement + " commit;").stdout
        # Signal only after the first action has acquired its real database locks.
        # A held transaction advisory marker is observable from the second session.
        with ThreadPoolExecutor(max_workers=2) as executor:
            first_future = executor.submit(run, first + f" select pg_advisory_xact_lock({marker}); select pg_sleep(2);")
            deadline = time.monotonic() + 10
            while time.monotonic() < deadline:
                held = command("psql", *CONN, "-X", "-Atq", "-d", DATABASE,
                    stdin=f"select exists(select 1 from pg_locks where locktype='advisory' and classid=0 and objid={marker} and granted);").stdout.strip()
                if held == "t":
                    break
                if first_future.done():
                    first_future.result()
                    raise RuntimeError("first transaction ended before overlap: " + mode)
                time.sleep(0.05)
            else:
                raise RuntimeError("race synchronization timed out: " + mode)
            second_future = executor.submit(run, second)
            first_future.result(timeout=30)
            result = second_future.result(timeout=30)
        if mode == "import_first" and '"status": "imported"' not in result:
            raise RuntimeError("late decline changed imported receipt")
        expected = 1 if mode == "import_first" else 0
        sql(f"""
          do $race$ begin
            if (select count(*) from public.transactions where user_id='{owner}' and id='{message}') <> {expected}
               or (select count(*) from public.movo_sync_operations where user_id='{owner}' and operation_id='{message}') <> {expected}
            then raise exception 'race ledger or receipt mismatch'; end if;
            if '{mode}'='erase_after_import' and (exists(select 1 from auth.users where id='{owner}')
                or exists(select 1 from public.movo_friend_transaction_decisions where recipient_id='{owner}'))
            then raise exception 'erasure retained user or decisions'; end if;
          end $race$;
        """, "ordered concurrent consent/erasure outcome: " + mode)


def main():
    command("createdb", *CONN, DATABASE)
    try:
        sql(BOOTSTRAP, "local Supabase fixture")
        migrations = sorted((ROOT / "supabase" / "migrations").glob("*.sql"))
        if len(migrations) < 28:
            raise RuntimeError("Expected complete MOVO migration history (at least 28)")
        # Main already contains migrations newer than the staged PR. Rehearse
        # the upgrade from that deployed schema with only the three PR stages pending.
        upgrade_versions = ("20261111133000", "20261111133100", "20261111133200")
        # Rehearse the three observed missing production capabilities separately.
        # This is a repository-derived approximation, not a production dump.
        pending_versions = ("20261123131500", "20261123170000", "20261124030000")
        pending = [migration for migration in migrations if migration.name[:14] in pending_versions]
        if tuple(migration.name[:14] for migration in pending) != pending_versions:
            raise RuntimeError("Unexpected pending friend/loan migration sequence")
        baseline = [migration for migration in migrations if migration.name[:14] not in upgrade_versions + pending_versions]
        upgrade = [migration for migration in migrations if migration.name[:14] in upgrade_versions]
        if tuple(migration.name[:14] for migration in upgrade) != upgrade_versions:
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
        sql("""
          do $$ begin
            if to_regclass('public.movo_friend_messages') is not null
              or to_regclass('public.movo_friend_transaction_decisions') is not null
              or to_regclass('public.loan_creation_requests') is not null
            then raise exception 'pending migrations already present in rehearsal baseline'; end if;
          end $$;
        """, "pending capabilities absent before isolated upgrade")
        for migration in pending:
            sql(migration.read_text(), "pending capability upgrade: " + migration.name)
        sql((ROOT / "supabase/tests/security_definer_tenant_isolation.test.sql").read_text(),
            "12 SECURITY DEFINER cross-tenant denials and owner-only controls")
        sql((ROOT / "supabase/tests/hybrid_sync_operations.test.sql").read_text(),
            "Hybrid sync idempotency, CAS, precision, tenant isolation and entitlement")
        sql((ROOT / "supabase/tests/transaction_mutation_integrity.test.sql").read_text(),
            "Transaction grants, linked posting status, reversal reset and tenant isolation")
        sql((ROOT / "supabase/tests/posted_allocation_balances.test.sql").read_text(),
            "Pending income/expense/transfer exclusion and posted allocation reconciliation")
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
        sql((ROOT / "supabase/tests/private_friends.test.sql").read_text(),
            "private invite lifecycle, two-party visibility and account deletion")
        sql((ROOT / "supabase/tests/friend_social.test.sql").read_text(),
            "discoverable usernames, recipient approval, snapshot revocation and avatar isolation")
        sql((ROOT / "supabase/tests/friend_chat.test.sql").read_text(),
            "private friend chats: cross-user denial, projected cards, idempotency and block deletion")
        sql((ROOT / "supabase/tests/friend_transaction_import.test.sql").read_text(),
            "recipient consent, immutable import receipt, account mapping and cascade")
        sql((ROOT / "supabase/tests/loan_payment_accounts.test.sql").read_text(),
            "loan payment account isolation, currency and single-ledger posting")
        sql((ROOT / "supabase/tests/atomic_loan_disbursement.test.sql").read_text(),
            "atomic loan disbursement, payload replay, rollback and account isolation")
        verify_atomic_loan_concurrency()
        verify_friend_import_concurrency()
        verify_friend_import_revocation_races()
        print("PASS isolated finance authorization: no customer database accessed")
    finally:
        if not DATABASE.startswith("movo_security_test_") or not RESTORE_DATABASE.startswith("movo_rollback_test_"):
            raise RuntimeError("Safety guard: unexpected test database name")
        command("dropdb", *CONN, "--if-exists", "--force", RESTORE_DATABASE)
        command("dropdb", *CONN, "--if-exists", "--force", DATABASE)


if __name__ == "__main__":
    main()
