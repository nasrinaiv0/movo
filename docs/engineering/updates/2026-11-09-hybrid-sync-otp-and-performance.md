# MOVO — Hybrid synchronization, startup, and automatic OTP

**Date:** 2026-11-09
**Branch:** `feat/hybrid-local-first-sync-20261109`
**Review status:** Draft; **DO NOT MERGE/DEPLOY YET**
**Sandbox:** `movo-referral-safe-final-1109`, isolated checkout at `/vercel/movo-hybrid`.

## Implemented
1. Six-digit Supabase email OTP automatically submits after 180 ms of stable input; pasting a full code works. A per-code/per-email attempt guard prevents duplicate automatic verification. The manual Verify action remains available for 6–10 digit legacy codes. Existing explicit legal consent remains mandatory.
2. Verification spinner, entry progress and subtle animations; reduced-motion fallback respects accessibility settings.
3. Signed-in owner-specific local finance cache hydrates before the cloud roundtrip; the splash waits for a complete cloud fetch when no verified local snapshot exists.
4. Cloud reconnect events only prompt the owner. `requiresManualSync` survives device-storage writes, sign-in and reload; the existing three-way merge only uploads that held offline workspace after pressing **Sync local to cloud**. Online imports with no manually-held offline data continue to upload automatically.
5. New IndexedDB `hybridLocalStore` defines atomic record+outbox transactions for accounts and transactions, owner-scoped records, positive-cent validation, consistent operation UUIDs, duplicate rejection, operation claiming and acknowledgement, retry without changing the operation ID, and owner-scoped purge. The full app has **not** migrated all write paths to this IndexedDB store.
6. New `hybridSyncCoordinator` separates online-origin operations from manually approved offline-origin operations and verifies owner, entitlement, response identity and revision at each step. Its server adapter remains unconnected.
7. Single-pass wallet balance indexing replaces repeated per-account ledger scans and agrees with existing calculations for transfers, linked debit cards, pending holds, duplicate transaction rows, accounting postings and FX.
8. New reconnection text is translated into all 11 supported languages.

## Tests actually executed in Vercel Sandbox
- TypeScript `tsc --noEmit`: passed.
- Full Jest suite: **179 suites / 1,082 tests passed**.
- `CI=true GENERATE_SOURCEMAP=false npm run build`: passed after removing an unsupported lint suppression.
- Includes OTP auto-submit and invalid-token retry tests; owner/operation ID and cents precision tests; offline manual-approval regression; headless coordinator failure/retry tests; and differential accounting tests.
- No successful live Supabase server idempotency/tenant isolation test claimed. No real iOS or Android device test claimed. No browser visual/screenshot test claimed.

## Critical unresolved work before release
- **Server-side idempotency:** the cloud must record a unique `(authenticated_user_id, operation_id)` and apply financial effects atomically with an acknowledgement, preventing replays of requests that succeeded but timed out. The current coordinator requires this but does not implement the server endpoint.
- **Full local-first migration:** existing online writes to accounts, transactions, payments, bills, subscriptions, plans and linked reversals still use the legacy repository on at least some codepaths. The new IndexedDB journal is infrastructure only, not yet their transactional source of truth.
- **Dual-journal safety:** the existing owner-scoped localStorage offline workspace and new IndexedDB outbox must not be simultaneously authoritative. Introduce a versioned, reversible migration and verify each row, tombstone, linked transaction and total before switching.
- **Offline/online interleaving:** the new headless coordinator can correctly select independent online writes while holding an older offline queue, but the legacy UI still uses a single dirty workspace and thus cannot safely upload every new online edit separately in that circumstance. Do not claim that invariant is end-to-end complete.
- **Financial group coverage:** offline three-way reconciliation currently supports accounts and transactions only, not every bill, loan, receivable, allocation, subscription or financial-planning event. Additional server-side reversible procedures and tests are needed.
- **Storage safety:** IndexedDB/localStorage are not hardware-backed encryption. Real iOS Safari storage-pressure/eviction, privacy-on-signout policy, and Android/iOS lifecycle tests remain required.
- **Performance:** exact warm-launch and 100,000-row latency budgets have not been measured on real phones.
- **Rollout:** no production Supabase SQL migration, deployment, entitlement changes, or database mutation has been performed for this branch.

## Release acceptance gates
Account owner isolation, RLS, server-side CAS/idempotency, recovery after crash or lost ACK, transfers/FX/credit-card equivalence, manual consent preservation after reconnect/reload, storage-failure rollback, iPhone/Android device startup measurements, new app-store billing regressions, PR checks and review all must pass prior to merging.
