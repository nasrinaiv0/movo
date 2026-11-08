# MOVO — cloud/offline financial read and handoff safety (2026-11-09)

## Branch and scope
PR #246 (draft) builds on #245. This is a release-gated incremental safety fix.
Production Supabase, live purchase grants, financial records and deployment were not changed.

## Changes
- A financial cloud refresh must successfully load accounts, transactions, postings, activities, automation inbox, bills, occurrences and budgets. Errors or malformed responses now stop the refresh rather than substituting empty arrays.
- Cloud->local handoff requires the owner-specific last confirmed workspace, no dirty offline changes, and exactly matching account/transaction financial records. Missing, duplicate, cross-owner or changed rows fail closed. The original confirmed baseline and lastConfirmedAt are preserved instead of overwriting the baseline with potentially stale UI state.
- Finance rows remain in exact two-cent form; no blind last-write-wins policy, destructive remote deletion, or cross-owner migration was added.
- Added failure injection and mismatch regression tests in cloudFinancialReadGate.test.js and offlineHandoffSafety.test.js.

## Limitations / release blockers
This guard is not a complete offline release. Cloud reads are separate operations, not a transactionally consistent database snapshot. Only account/transaction create and account compare-and-swap update are enabled for upload; other financial groups and media still require reviewed local implementations and audited reversible server operations.
Native signed-device QA, iPhone Safari offline/reconnect testing, multi-user isolation, storage corruption/quota tests, full exact-head CI, server schema verification, and secure storage remain required. An unsupported group must never be described as synchronized. Do not merge #246 for general release until those gates pass.

## Rollback
Revert these client-side checks only after confirming no customer data is removed. Keep owner-scoped local backups intact; do not clear pending journals or reverse valid cloud records automatically.

## Network-loss event follow-up
The browser `offline` event previously bypassed the manual handoff guard:
it could overwrite the verified baseline with possibly stale rendered rows,
and a dirty journal could leave cloud-mode UI active after restoring the device
copy. Added `planOfflineNetworkTransition` to fail closed for missing,
unverified, partial or foreign caches; reuse a confirmed matching snapshot;
restore a dirty/stale owner-specific device copy without overwriting the
baseline; and explicitly pause paid UI if fallback has no verified device copy.
Cloud-only rows remain on the server for reviewed reconciliation. Network
connectivity alone is not proof that an entitlement expired.
