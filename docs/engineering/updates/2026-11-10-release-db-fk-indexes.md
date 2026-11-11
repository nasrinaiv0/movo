# Release performance audit: five missing FK indexes — November 10, 2026

## Finding
The Supabase performance advisor reports five foreign-key columns without covering indexes:
- movo_owner_audit_log.target_user_id
- movo_owner_work_items.created_by
- movo_owner_work_items.updated_by
- movo_referral_points_ledger.referred_id
- movo_referral_points_ledger.source_entitlement_id

## Remediation
Add five named, idempotent B-tree indexes. No schema-visible API changes, RLS relaxations, billing mutation, data backfills, or owner record modifications. Run the SQL only through the reviewed migration workflow after all tests pass; not applied to production by this PR.

## Verification
The isolated local PostgreSQL finance test runner executes release_fk_covering_indexes.test.sql after migrations, checking that each expected index exists with the intended FK column. Run sandbox syntax checks, full CI, and Supabase performance advisor after application. If an object with the intended name already has a different definition, correct it in a reviewed follow-up; IF NOT EXISTS alone does not prove equality.

## Release limitations
These optimizations reduce potential join/DELETE overhead as activity grows. They do not fix hybrid IndexedDB synchronization, Play production authorization, upload signing certificate, or Android real-device testing.
