# Hosted default privileges and the canonical ledger boundary

Contributor: Codex. Documented before commit on 2026-11-27 UTC; parent `3e9ba34e6a938236a56b440230171d940c78005f`.

## Real production preflight and reproducible failure

The preceding source passed all eleven workflows, including the final SVG iPad. Before production execution, read-only PostgreSQL metadata showed the hosted postgres role has public-schema default ALL grants for anon, authenticated and service_role on tables, sequences and functions. Its existing transactions table grants service_role direct SELECT/INSERT/UPDATE/DELETE. There are no transaction column ACLs or inherited service_role memberships. The earlier disposable bootstrap omitted these defaults.

A synthetic PostgreSQL17.11 rehearsal using those actual defaults reaches the original, unchanged recipient-import assertion and fails with `service can bypass canonical owner write`. This is a real test-model and grant gap, not a native/UI defect. No customer ledger write was attempted to demonstrate it.

## Narrow correction and compatibility

Generate `20261127234509_fence_service_ledger_writes.sql` using the installed Supabase CLI. Revoke the server role's table privileges on transactions and restore SELECT only, with transaction-scoped 5-second lock and 60-second statement limits. No row rewrite, trigger, function, data model, global default-ACL or client permission change. The existing owner-bound and token-validated SECURITY DEFINER accounting/automation functions retain their owner privileges; server read queries and legacy authenticated INSERT remain supported. Do not revoke unrelated private-table administration merely to alter advisory counts.

Model the actual public-schema default grants in the existing isolated bootstrap. Include the forward migration after the already reviewed pending capabilities. Keep the failing original recipient-import assertion intact. Add actual permission-denied INSERT/UPDATE/DELETE checks using synthetic-only/no-matching-row operations and prove a valid service-only automation RPC still creates one correctly attributed transaction and replays the same request without duplication. Preserve every original tenant, consent, ledger, erasure, race, old-client and snapshot-restore test. Add production-matching PostgreSQL17.11 alongside the existing PostgreSQL18 finance CI job; no native gate is removed or weakened.

## Verification, authorization and rollout

Local and fresh exact-head CI outcomes will be recorded before publication/merge. Previous native results are baseline evidence only after this new commit. No app branding, layout, navigation, motion, dependencies or native source change. SVG remains an unadopted isolated candidate; actual store, physical-device and qualified legal/DBA review are not claimed.

The owner explicitly says “no need to create a backup,” superseding the earlier recovery prerequisite; no backup exists or is claimed. Existing authorization for safe merges and database update stands. Apply only the individually reviewed capability and grant migrations after all new-head gates pass and refreshed target/privilege preflights. Preserve historical migration records; no blind replay, password reset, paid provisioning, destructive rollback, rollout-flag activation or store action. Prepare compatible database capabilities before the automatically deployed main client. Record generated remote versions, source/execution hashes, actual post-migration roles/RLS/index/function checks and merge/deployment results in the final Markdown audit.

If a dependency fails, stop rollout and prefer a reviewed forward repair. Restoring this unsafe raw server write grant is not a routine rollback. Never drop receipts or financial/chat history or automatically reverse customer cash postings.

## Completed local validation before publication

Both actual PostgreSQL17.11 and18.7 passed 53 exact source migrations,17 SQL suites (the new successful/idempotent automation acceptance plus all original16), and all original independent-session races. The hosted-default pre-fix rehearsal failed the unchanged canonical-write assertion; the corrected rehearsal also proves a real zero-row raw server UPDATE was authorized before the fence and denied afterward. Snapshot restore and old-client upgrade checks remain for the fresh dual-engine CI; the local standalone harness does not claim to execute them. All11 migration-plan host checks, Python compilation and whitespace checks passed. No frontend/native/dependency source changed.

New forward migration SHA-256: `2516e296b2949ce4bd58ad6e5a498af0dc9d92da7cadf6682187458bcaf1a459`. All five previous capability migration files retain their exact hashes. No production SQL or merge has been performed at this checkpoint.
