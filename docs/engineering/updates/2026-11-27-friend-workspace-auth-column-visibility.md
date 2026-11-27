# Friends workspace: production Auth column visibility

Contributor: Codex. Documented before commit, 2026-11-27 UTC. Parent is `043773a9467866310e370739f08f59a758fbc455`; owner requests safe completion/merge of all PRs, then database update.

## Observed problem and correction

Read-only hosted metadata confirms `service_role` can SELECT only `auth.users.id`, `created_at`, `last_sign_in_at`, `email_confirmed_at` and `phone_confirmed_at`. It cannot read `is_anonymous`, which the new service-only `movo_friend_workspace` RPC requires to reject anonymous actors using authoritative Auth state. Applying the four pending feature migrations alone would leave outgoing requests/cancellation/reporting unavailable. The earlier synthetic bootstrap granted broad Auth SELECT, concealing this dependency.

Create a forward migration with the installed Supabase CLI 2.58.5 (`migration new`, help checked): `20261127212047_friend_workspace_actor_visibility.sql`. It grants SELECT on that one boolean column only to the existing server role, with bounded lock/statement timeouts. It grants no client Auth access, no table-wide SELECT and no UPDATE. It changes no Auth rows, finance records, actor checks, RLS, financial writer or rollout flag. This is the least additional visibility needed by the existing verified-actor RPC, not a replacement authorization mechanism.

SQL SHA-256: `769687177f5427d680d142156014d8bdc112112a6922372f0a2042299502bd9f`.

## Regression and actual verification

Replace the permissive isolated Auth mock grants with the actual five-column baseline; add the inert last-sign-in field to the fixture schema. Include the forward grant in the separately rehearsed pending migration sequence. Immediately before it, invoke the real workspace function as service_role with a fictional actor and require PostgreSQL permission denial on Auth users. After migration, the existing workspace fixtures must execute successfully; explicit assertions require the service-only anonymity SELECT while denying client SELECT, raw editable metadata SELECT and service UPDATE.

An isolated loopback-only PostgreSQL 18.7 rehearsal used 52 exact source migrations, all 16 original SQL suites and the original separate-session loan/import/revocation/erasure/workspace race functions. It reproduced the real permission failure before the fix and passed every suite/race afterward. Test database names were generated and dropped, fixtures fictional, no production writes. This supplements the required fresh PostgreSQL 17 CI; it is not a claim that the local server matches hosted 17.11 or that a production backup was restored. Python compilation and whitespace checks are required before commit. Frontend/native/dependency/workflow bytes remain equal to the fully tested 6393c428 implementation.

## Production execution remains held

The owner confirmed there is no backup. The connected project is Free tier, and the managed environment has no secure direct PostgreSQL connection or existing backup binding. The Supabase SQL connector cannot create a complete recoverable backup. No paid upgrade, ad hoc customer-data export or production DDL is performed. Owner is choosing between supplying a verified off-site backup and configuring a secure backup connection; credentials must stay out of chat. A metadata snapshot is not called a database backup.

After a verified backup/recovery path, source merge and refreshed dependency/integrity preflights, deploy only the five reviewed pending capability migrations in dependency order; never replay historical migrations by filename timestamps. The new grant can be prepared before exposing the workspace RPC. Recheck the hosted service/client privilege matrix afterward. Reporting/import activation, moderation/legal, physical-device/store and separate legacy constraint reconciliation are not implied by a migration. If rollback is needed, halt the workspace rollout before reverting its new column visibility; do not drop receipts or financial/chat history. Existing server grants must be preserved.
