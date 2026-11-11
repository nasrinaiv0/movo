# MOVO account deletion release blocker — 2026-11-10

## Root cause
Production catalog inspection found four OWNER audit/work-item foreign keys to auth.users with ON DELETE NO ACTION. Three are NOT NULL. The immutable audit trigger also rejects every UPDATE, including internal SET NULL actions. Accounts with referenced IDs could not reliably delete themselves.

## Staged remediation
Use ON DELETE SET NULL for all four owner audit/work-item foreign keys, allowing recorded user IDs to disappear while retaining non-personal operational history. The audit actor and work-item created/updated fields become nullable. The immutable audit trigger rejects edits/deletes except for FK identity-only nulling once the corresponding auth user has ceased to exist in the current transaction. It never permits a normal owner/service actor to null a live user's audit ID. Owner RPC insert validation and service_role-only grants remain unchanged.

## Proof
Run full isolated PostgreSQL migration chain and owner_account_deletion_fks.test.sql. A synthetic actor and target first attempt illegal audit updates/deletes (must be rejected), then delete both auth users (must succeed), and verify preserved event details and null actor/target/creator/updater identifiers.

## Privacy limitation
Audit details and work-item notes must not contain user secrets or personally identifying text. Existing free-text entries may require separate legal/retention review and verified deletion process; this migration does not claim to scrub arbitrary JSON or note fields. Do not apply production SQL before backup, CI and security review. Client-side local-only records still require on-device deletion.

## Rollback
The FK policy and nullability changes cannot be automatically rolled back after account deletion has nulled identifiers. Restore schema only through a separately reviewed migration that does not recreate already-deleted accounts. Keep this change unmerged until isolated tests pass.
