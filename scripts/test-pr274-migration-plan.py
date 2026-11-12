"""No-network unit tests for the production-safe PR274 staging and rollback harness."""
import os
import pathlib
import re
import subprocess
import sys
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
STAGES = ("20261111133000", "20261111133100", "20261111133200")


class MigrationStagingContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.harness = (ROOT / "scripts/test-finance-rpc-isolation-local.py").read_text()
        cls.workflow = (ROOT / ".github/workflows/finance-tenant-isolation.yml").read_text()
        cls.ack_migration = (ROOT / "supabase/migrations/20261111133200_enforce_archive_and_billing_retention.sql").read_text()
        cls.pre = (ROOT / "supabase/tests/pr274_legacy_preupgrade_fixture.sql").read_text()
        cls.post = (ROOT / "supabase/tests/pr274_postupgrade_rehearsal.sql").read_text()
        cls.restore = (ROOT / "supabase/tests/pr274_snapshot_restore_check.sql").read_text()

    def test_guard_never_connects_to_remote_database(self):
        self.assertIn('HOST not in {"/var/run/postgresql", "127.0.0.1", "localhost", "::1"}', self.harness)
        self.assertIn('only generated disposable databases', self.harness)
        self.assertIn('movo_rollback_test_', self.harness)
        self.assertNotIn('SUPABASE_SERVICE_ROLE_KEY', self.harness)

    def test_rejects_non_disposable_postgresql_hosts_before_any_database_action(self):
        script = str(ROOT / "scripts/test-finance-rpc-isolation-local.py")
        cases = [
            ({}, "requires a disposable GitHub Actions"),
            ({"GITHUB_ACTIONS": "true"}, "requires a disposable GitHub Actions"),
            ({"GITHUB_ACTIONS": "true", "MOVO_TEST_PG_CONTAINER": "   "}, "requires a disposable GitHub Actions"),
            ({"GITHUB_ACTIONS": "true", "MOVO_TEST_PG_CONTAINER": "test", "MOVO_TEST_PGHOST": "db.production.example"}, "Unsafe database host"),
        ]
        for overrides, expected_message in cases:
            with self.subTest(overrides=overrides):
                env = os.environ.copy()
                for name in ("GITHUB_ACTIONS", "MOVO_TEST_PG_CONTAINER", "MOVO_TEST_PGHOST"):
                    env.pop(name, None)
                env.update(overrides)
                result = subprocess.run([sys.executable, script], capture_output=True, text=True, env=env, timeout=10)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(expected_message, result.stderr)
        self.assertIn("MOVO_TEST_PG_CONTAINER: ${{ job.services.postgres.id }}", self.workflow)
        self.assertNotIn("docker ps -q", self.workflow)

    def test_stages_are_explicit_and_are_applied_in_order(self):
        self.assertIn('cutoff = "20261111133000"', self.harness)
        self.assertIn('"20261111133000", "20261111133100", "20261111133200"', self.harness)
        all_versions = [
            p.name[:14] for p in (ROOT / "supabase/migrations").glob("*.sql")
            if p.name[:14] >= STAGES[0]
        ]
        self.assertEqual(list(STAGES), sorted(all_versions))

    def test_backup_restores_into_separate_disposable_database(self):
        self.assertIn('pg_dump', self.harness)
        self.assertIn('pg_restore', self.harness)
        self.assertIn('RESTORE_DATABASE', self.harness)
        self.assertIn('verify_disposable_rollback(pre_upgrade_snapshot)', self.harness)
        self.assertIn('pre_upgrade_snapshot = snapshot_bytes()', self.harness)
        self.assertIn('for migration in upgrade:', self.harness)

    def test_independent_sql_suites_restore_clean_pre_fixture_schema(self):
        self.assertIn("clean_baseline_snapshot = snapshot_bytes()", self.harness)
        self.assertLess(
            self.harness.index("clean_baseline_snapshot = snapshot_bytes()"),
            self.harness.index("pr274_legacy_preupgrade_fixture.sql")
        )
        self.assertIn('command("dropdb", *CONN, "--force", DATABASE)', self.harness)
        self.assertIn("restore_into_generated_test_database(clean_baseline_snapshot, DATABASE)", self.harness)
        self.assertLess(
            self.harness.index("restore_into_generated_test_database(clean_baseline_snapshot, DATABASE)"),
            self.harness.index("security_definer_tenant_isolation.test.sql")
        )
        self.assertIn('database not in {DATABASE, RESTORE_DATABASE}', self.harness)
        self.assertIn('command("createdb", *CONN, DATABASE)', self.harness)

    def test_rollback_does_not_claim_to_revert_live_schema(self):
        self.assertIn('DIFFERENT disposable database', self.restore)
        self.assertIn("RESTORE_DATABASE", self.harness)
        self.assertNotIn("DROP SCHEMA public", self.harness)

    def test_retention_does_not_discard_pending_purchase_acknowledgement(self):
        self.assertRegex(self.ack_migration, r"delete from public\.movo_iap_ack_jobs\s+where completed_at is not null")
        self.assertIn("pending Google acknowledgement", self.post)
        self.assertIn("completed_at is null", self.post)

    def test_legacy_fixture_seeds_paid_synthetic_users_before_protected_records(self):
        self.assertIn("""select set_config('request.jwt.claims','{"role":"service_role"}',false)""", self.pre)
        self.assertIn("insert into public.movo_manual_plan_grants", self.pre)
        self.assertEqual(self.pre.count("'pro_plus',now()+interval '1 day'"), 2)
        self.assertLess(self.pre.index("insert into public.movo_manual_plan_grants"), self.pre.index("insert into public.financial_accounts"))
        self.assertIn("set local role authenticated", self.pre)

    def test_older_direct_writes_are_proven_before_and_denied_after(self):
        self.assertIn("update public.transactions set merchant='Old app edit'", self.pre)
        self.assertIn("delete from public.transactions", self.pre)
        self.assertIn("Legacy raw update still works after hardening", self.post)
        self.assertIn("Legacy raw delete still works after hardening", self.post)

    def test_real_auth_storage_is_not_used_by_disposable_fixture(self):
        for content in (self.pre, self.post, self.restore):
            self.assertNotIn("storage.objects delete", content.lower())
            self.assertNotIn("drop table auth.users", content.lower())
        self.assertIn("127.0.0.1", self.workflow)

    def test_workflow_snapshots_have_tools_and_no_external_ports(self):
        self.assertIn("pg_dump pg_restore", self.workflow)
        self.assertNotIn("55432:5432", self.workflow)
        self.assertIn("test-pr274-migration-plan.py", self.workflow)


if __name__ == "__main__":
    unittest.main()
