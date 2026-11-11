# PR 261 — mainline integration and same-record concurrency fence

## Scope
- Integrated the current mainline changes through #269, preserving Google Play build gates, account-erasure foreign-key changes, and hybrid finance authorization tests.
- Resolved the two content conflicts in PR_PROGRESS and the isolated PostgreSQL test harness; all three finance SQL tests remain registered.
- Added an IndexedDB transaction-level fence against simultaneous online creates, competing CAS-bearing edits, and locally stale record revisions. UI preflight checks alone could race across tabs. The operation journal, row cache, and local sequence share one IndexedDB readwrite transaction.
- Added adversarial two-tab race tests, including atomic admission and stale revision.

## Verified in Vercel Sandbox
- Source integration: 192 Jest suites / 1,178 tests passed with the concurrency regression (tests run after conflict resolution).
- The TypeScript check, production build, and browser workflows are separate gates; do not infer their result from Jest.
- Prior PR head had six green GitHub workflows and a READY Vercel preview. New integration commit requires its own checks.

## Not complete — MUST NOT MERGE YET
- Signed-in localStorage workspace remains authoritative for legacy reconciliation; the IndexedDB migration is not yet the single authoritative store, and localStorage quota is still a data-durability dependency.
- Obligations, bills, subscription, savings and associated reversal writers have not all been migrated to the durable journal. Offline/online accounting consistency is not fully proven.
- Multi-device editing and the native Android storage lifecycle / physical-device startup testing are unverified.
- New exact-head CI, PostgreSQL isolation and preview browser smoke must pass after publishing.
- No production SQL or Google Play release changes made by this integration.
