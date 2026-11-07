# MOVO — Offline/online reconciliation: implementation and release gate
Date: November 8, 2026
Branch: fix/local-storage-pauses-plan-access-20261108
Scope: Sandbox implementation; **not cleared for production or full offline support**.

## Intended user behavior
1. In **Cloud Sync ON**, owner-visible accounts and transactions are fetched in complete stable pages. A verified owner-specific device copy is saved BEFORE the UI switches to cloud; lack of device storage blocks the transition rather than erasing its last local ledger.
2. In **Cloud Sync OFF** or unavailable connectivity, existing account-specific device records remain available for manual local tracking. Pro/Pro+ usage is suspended, but the underlying subscription, renewal and store purchases are not cancelled.
3. Each offline edit changes the signed-in owner's working copy, preserving an independent last-confirmed baseline; guest wallet records are never automatically promoted into a signed-in account.
4. When reconnecting or explicitly enabling cloud, MOVO reads the newest owner-scoped cloud rows and plans a three-way reconciliation (last-confirmed baseline vs local working set vs current cloud).
5. Local-only **new** accounts and ordinary transactions upload with stable UUIDs, valid cents and owner checks. Cloud-only changes download. Account edits update with a server updated_at compare-and-swap. Cloud responses are refetched and verified before the local journal is marked clean.
6. Conflicts, missing rows, deletion without tombstone, failed authentication, expired write entitlement, incomplete fetch, quota errors, altered device data or unsafe dependencies STOP sync. Local edits remain available. Do not use last-write-wins merely because one clock or timestamp is newer.
7. No uploaded JSON/CSV backup may write directly to cloud. Both Discard records and Save records require explicit confirmation, including the first-run onboarding importer.

## Supported implementation now (audited narrow path)
- Financial accounts: download, new account upload, and compare-and-swap updates.
- Transactions: download and new plain transaction upload, including ordinary CSV/manual expenses with verified valid linked account UUID.
- Source of truth for immutable identifiers is owner-scoped UUID. New account inserted before dependent transaction; no blind upsert, no overwriting an existing row, no cloud write while plan expired.
- Local signed-in copies use a single owner-specific atomic localStorage record. Guest records remain in their separate legacy keys.
- Cloud accounts and transactions include updated_at; account reads are fully paginated. API calls enforce signed-in owner and server RLS.
- Unknown conflict, mutation underway when Cloud Sync is disabled, or unexpected remote row deletion preserves pending local copies.

## Mandatory blockers for full offline/online feature
- Transaction **edits**, deletions and refunds need server-side, atomic reversal and linked ledger updates before automatic upload. Current code deliberately refuses edits/deletions; it does not pick a winner based on a clock.
- Bills, loans, money owed, credit payments, allocations, postings, scheduled transactions, subscriptions, receipt and QR attachments, AI chat, membership/rewards, budgets, plans, payment attempts, and owner preferences need explicit entity adapters, version/tombstones, order dependencies, and safe authorization. 23 source groups are inventoried in offlineReconciliation.js, but only accounts/transactions are writable at present.
- A consistent server-side snapshot or verifiable cursor/transaction boundary across tables is needed; multiple independently fetched tables can change concurrently.
- Offline files and app settings must be scoped per signed-in owner. Current global preferences and non-encrypted browser storage are NOT a safe encrypted vault. PR #227 signed-device protections and PR #241 full workspace migration remain relevant.
- Cross-account identity switching, multi-tab device edits, transaction-linked attachments and imports, crash/retry idempotency, server RLS, plan expiry/renewal, 1000+ rows, offline sign-in expiration, private browsing quota and real iOS Safari/native and Android network tests are not yet accepted. Full cloud writes must remain behind draft/release review.
- Cloud records for unsupported groups may be viewed only with adequate network access. Never advertise that all MOVO rows are automatically updated locally or remotely until supported adapters pass bidirectional finance tests.

## Tests and evidence
- Vercel Sandbox movo-local-import-confirm-20261108, isolated branch workspace /tmp/movo-import-discard-confirm.
- Pure planner tests: conflict/no-data-loss, owner isolation, last confirmed ancestor, remote missing row, explicit tombstone, exact cents.
- Transport tests: local new account/transaction upload, cloud-only download, version conflicts, authorization recheck, stop on switch-off, account-before-transaction dependency, network failure retains journal.
- Cloud adapter tests: validated owner, exact cents, stable UUID, invalid local receipt/FK rejection, CAS revision guard.
- Import UX tests: JSON and CSV previews, Save/Discard confirmations and cancellation; onboarding file import no longer commits on upload.
- TypeScript and isolated optimized CRA builds executed in Vercel Sandbox; main app browser checks and GitHub CI still need exact-head verification.
- **No production Supabase financial row was modified.** No paid Supabase branch created. No production release authorized.

## Recovery & rollback
- Retain owner-scoped device journals across errors and rollbacks; do not delete on sign-out, failed network request or partial server write.
- Export the device copy before making schema or version changes.
- If a partial cloud write succeeded and acknowledgment was lost, refetch cloud before retry; stable UUIDs prevent duplicate insert overwrites. Do not purge unknown row histories.
- Release only when all required financial groups and conflict resolution are implemented and independently tested.

## Explicit online/offline browser transitions
- When the browser sends a network-offline event while cloud mode is active, MOVO first copies the confirmed, owner-scoped account/transaction ledger to its atomic device workspace, switches to local tracking, and leaves the user's Cloud Sync preference and subscription unchanged.
- On a subsequent online event, an account with Cloud Sync preference still enabled attempts owner and entitlement verification followed by three-way reconciliation. An intentional manual Cloud Sync OFF prevents automatic reconnection.
- If device storage cannot preserve the cloud copy, offline transition is blocked with a visible warning; no claim of durable offline editing is made. A pending workspace from another tab is protected.
- On enabling cloud, MOVO verifies an active paid entitlement before reading backed-up financial rows, not just before uploading dirty ones.
- The browser's online/offline event is a hint; an unreachable Supabase service may not trigger an offline event. Signed-device network failure simulation is a required release test.
