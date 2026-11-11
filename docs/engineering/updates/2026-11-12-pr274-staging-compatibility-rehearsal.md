# MOVO PR 274 — staging compatibility and rollback rehearsal

## 2026-11-12 — PR #274 premerge staging and migration-history safety gate

Live Supabase preflight (read-only) found zero cross-owner schedule links, zero invalid transaction amounts, 3 archive preference rows, zero currently overdue acknowledgement jobs, and existing direct UPDATE/DELETE grants and RLS policies. Repo has 40 migration files while production migration history has 35 entries; only 19 timestamps match. **DO NOT RUN `supabase db push` across the entire repo history against production, or merge on CI-green alone.** The oldest raw PostgREST transaction clients can write before the proposed revocation and fail after it; minimum supported signed mobile versions/rollout remains unverified.

The disposable PostgreSQL CI harness now splits the exact three PR migrations from its baseline, seeds two fake users and finance/schedule/archive/billing rows, confirms old raw UPDATE/DELETE before migration and their denial afterward, tests owner-safe cloud clearing and bounded retention, and creates a private pg_dump/pg_restore snapshot restore in a second disposable database to verify the legacy baseline is recoverable. No credentials, production user records, Supabase API endpoints, or real customer billing traffic are used. This synthetic snapshot exercise does **not** validate production PITR or Storage/Auth rollback.

Critical billing hardening: the 7-day retention job now deletes only *completed* acknowledgement jobs older than 7 days, never pending Google Play acknowledgement work regardless of age. Extended SQL assertions cover overdue pending, overdue completed, and recently completed jobs. Require actual Supabase production-schema staging branch + Auth/Storage/API flows and version-distribution evidence before merging. Supabase quoted staging branch cost $0.01344/hour; creation requires owner cost approval, so no paid branch was started.

## Release action order

1. Align repository and remote Supabase migration **history and actual schema** on an isolated Supabase branch (never use production `migration repair` to bypass DDL without independent verification).
2. Deploy additive Auth/Storage-safe migrations to staging first; run old and current signed builds against a staging API. Validate clear, deletion, QR/receipt cleanup, active upload race, retention and stale JWT behavior.
3. Only after old mobile versions are no longer supported, enact the direct ledger grant revoke; verify fresh apps and receipt calculations, without dropping existing customer records.
4. Rehearse disaster recovery into a separate staging instance using Supabase PITR, storage-object backups and Auth/session export checks; record RTO/RPO and proof of rollback before touching production.
5. Review every SQL migration, maintenance lock limits, changed roles, and staging tests; obtain manual production change authorization and coordinated DB-first deploy. Do not merge PR until the protocol passes.

No paid staging branch, production migration, live deletion, billing change, main merge, or App Store submission was performed.
