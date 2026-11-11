# MOVO hybrid local-first synchronization — implementation handover

Status: **foundation only; not connected to production write handlers**.

## Agreed behavior
- Online: persist an owner-scoped local operation, update local UI, upload automatically, verify server acknowledgement, reconcile local state.
- Offline: persist locally and update UI; hold offline-origin operations.
- Reconnect: show an actionable notification. Only an explicit user action approves the held offline batch.
- New online-origin operations must not inadvertently release older offline-origin operations.
- Never treat browser connectivity as proof of server availability or plan entitlement.

## Foundation added
`src/lib/hybridSyncPolicy.js` provides an immutable operation envelope, eligibility selection, pending-offline count and strict acknowledgement checks.
`src/lib/hybridSyncPolicy.test.js` covers isolation, consent, duplicates, and stale acknowledgements.

## Release-blocking follow-up
1. Implement IndexedDB transactional snapshot + outbox with schema versioning and migration from existing owner-specific local workspace. Never erase old storage until verified migration and rollback.
2. Wire **all** transaction/account/transfer/deletion write handlers to commit the local mutation and outbox atomically, then render from local state.
3. Introduce server-enforced idempotency using a unique `(user_id, operation_id)` constraint, RLS, authenticated owner binding, CAS revision validation and transactionally applied ledger mutations.
4. Implement an online worker that selects only online-origin operations; implement a separate explicit offline batch approval path with persisted consent and per-operation outcomes.
5. On reconnect, show a pending count; do not auto-release held operations. Handle cloud-down despite browser online status.
6. Reconcile full financial snapshots without overwriting dirty local rows, deleting tombstones, or enabling unverified paid plans.
7. Add differential accounting tests, concurrent-device tests, crash/restart tests, 10k/100k record performance measurements, iOS Safari IndexedDB eviction tests, and store-native device validation.
8. Pass all CI and Vercel Sandbox UI/functionality tests before merging.

## Safety and limitations
The policy module is **not** an authorization boundary; the server must independently validate everything. No live database, entitlement, production deployment or billing changes are part of this foundation. A sandbox creation request returned HTTP 400, so no Vercel Sandbox verification is claimed for this commit.
