# PR 261: durable account and transaction writes

## Behavior
Signed-in account and transaction writes now persist an owner-scoped IndexedDB intent before calling the server. The server applies each operation and stores its acknowledgement atomically. A retry with the same operation ID returns the original acknowledgement; reuse with different input is rejected. Updates and deletes compare the expected timestamp while holding the row lock, including linked accounting reversals. The local materialized cache is updated before retiring the durable intent.

Offline account/transaction saves, imports, deletions and undo write an atomic local batch before reporting success. Startup replays unacknowledged intents. Offline-origin batches remain held until the person chooses **Sync local to cloud**; approval survives an interrupted retry. Confirmed net reconciliation retires only captured operations that still match the confirmed result, preserving newer edits. Missing legacy cache with pending journal records fails closed instead of silently dropping them or replaying an obsolete migration backup.

The migration retains an exact owner-scoped backup in IndexedDB. Existing localStorage remains a materialized workspace and is still required by the legacy reconciler. This is **not yet a complete single-authority storage migration**.

## Security and accounting
- `apply_movo_sync_operation` binds ownership to `auth.uid()`, checks paid cloud access, validates a limited payload, rejects foreign account/receipt/schedule references, and enforces exact cents.
- The acknowledgement table uses owner read RLS; clients cannot forge acknowledgements. Requests and acknowledgements commit with the mutation.
- Monotonic update timestamps prevent stale CAS succeeding when two changes happen in one database transaction.
- Deletion reuses the audited reversal RPC. SQL verification covers a linked loan payment, stale edits, exactly-once reversal and replay.
- Offline views retain confirmed accounting postings and hide postings linked to deleted transactions. After uploaded reversals, linked views are refetched before caching.
- No production migration was applied by this work. Deploy the migration before enabling these client paths.

## Verification in Vercel Sandbox
- Complete Jest suite: **191 suites, 1,170 tests passed** before the final missing-cache safeguard; its targeted recovery suite passed 7/7 tests with the additional regression.
- Optimized production build passed; TypeScript and the final optimized build also passed with the safeguard.
- Full local PostgreSQL migration history and finance RPC isolation tests passed, including new hybrid operation and linked reversal cases.
- Built app browser flow: PHP100.25 cash minus PHP12.34 expense = PHP87.91 after reload; one account, one transaction, zero cloud writes.
- Actual Chromium IndexedDB: crash/restart replay, held offline intent and competing-tab lease checks passed.
- Synthetic 10k records: balances 20.5ms, commit 1,078.1ms, read 356.3ms. Synthetic 100k: balances 91.1ms, commit 9,190.7ms, read 4,293.5ms. These are sandbox measurements, not handset or full application capacity claims.

## Remaining completion gates
1. Complete the single-authority IndexedDB migration, including recovery without the legacy materialized cache and removal of localStorage capacity dependence.
2. Migrate remaining obligations/bill/subscription/savings writes to the same durable operation protocol; verify their offline reversal behavior.
3. Verify concurrent local edits across tabs/devices beyond outbox lease ownership, native Android storage lifecycle and real-device startup performance.
4. Pass GitHub checks and preview verification on the published commit before merge. This checkpoint must not be represented as Google Play release approval.

## Reproduction
`CI=true npm test -- --watchAll=false --runInBand --silent`

`npx tsc --noEmit`

`python scripts/test-finance-rpc-isolation-local.py`

`CI=true GENERATE_SOURCEMAP=false npm run build`

Serve `build` on port 4174 and run `scripts/ui-qa/free-local-flow.cjs` with Playwright available. `scripts/ui-qa/hybrid-build.cjs` and `hybrid.cjs` build/run the real IndexedDB browser fixture.

## CI integration
The hybrid workflow now uses the same pinned npm 11.19.1 as the existing main pipeline. Node 22 bundled npm 10 rejected the npm 11 lockfile with a missing optional YAML peer. The original draft commits are consolidated with their engineering documentation into one commit on current main to satisfy the per-implementation-commit documentation gate without weakening that gate.
