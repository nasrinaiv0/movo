# PR #261 — adversarial local outbox audit fixes (2026-11-09)

## Scope and merge safety
This change fixes three audit findings in the **staged** IndexedDB outbox. It does not connect the new transport to production, mutate Supabase, change billing, or make PR #261 release-ready. PR #261 MUST remain a draft until the outstanding server-side authorization/idempotency/CAS/RLS, legacy localStorage migration, real-device and 10k/100k performance work is complete.

## Defects and corrections

1. **Wrong order of financial operations:** IndexedDB's operations primary key is a UUID. getAll returned UUID order, so a delete could be sent before its create. commitLocalFinanceChange now atomically increments a per-owner metadata.lastOperationSequence in the same write transaction as the record and outbox entry. claimHybridSyncBatch orders operations by that sequence, with a revision/time fallback for older staged entries. Unapproved or already leased predecessor operations block later operations affecting the same record. The coordinator claims one operation at a time and stops on a failed operation rather than publishing dependent writes.

2. **Stranded in_flight queue entries after a crash:** Claims now carry an expiring leaseExpiresAt and monotonically increasing claimGeneration. An expired (or legacy unleased) claim becomes eligible for reclaim with its original operation ID. A live claim prevents another tab from claiming new work concurrently. finalizeHybridSyncOperation and requeueHybridSyncOperation require the exact current generation, preventing a stale worker from acknowledging or resetting another worker's claim. Offline approval persists as approvedAt so a confirmed offline batch can recover without another approval; reconnection alone still cannot grant first approval.

3. **Operation ID reused with different revision:** Existing IDs now compare immutable revision, timestamp, origin, owner, kind, group, record ID and payload before accepting an exact retry. A mismatched revision or timestamp throws an operation collision without modifying the ledger or journal.

## Regression coverage
src/lib/hybridLocalStore.test.js, hybridSyncCoordinator.test.js, and hybridSyncPolicy.test.js check reverse-sorted UUIDs, create/delete order, blocking unapproved offline predecessors, lease expiration and renewal, fencing older workers, cross-tab exclusion, owner-scoped counters, lost acknowledgements, persisted approvals, and immutable-operation collisions.

## Server-side release blockers
- **No live cloud adapter yet:** The server must authenticate the owner using the verified user identity, not a client-provided owner ID. Enforce tenant RLS.
- **Durable exactly-once application:** Add unique (user_id, operation_id) and immutable request fingerprint; in one SQL transaction check prior acknowledgment and apply mutation using CAS/expected revision. A retry must return the original durable acknowledgment without replaying effects.
- **Multi-step accounting:** Require server-side transactional debits/credits, account/transaction dependency tracking, tombstone/version semantics, subscription-linked reversals, and conflict resolution.
- **Authority migration:** Complete safe, reversible handoff from legacy localStorage to IndexedDB before enabling either as live authoritative financial writer.
- **Proof:** Run browser multi-tab/restart/low-storage tests, iOS and Android offline/resume tests, i18n/UI checks, 10k/100k record load benchmarks, RLS penetration tests, and a release checklist. CI pass and a Vercel preview do not alone certify commercial release.

## Engineering notes
The browser journal is not a cryptographic security boundary. Its claimGeneration is a local fencing token; remote idempotency and CAS are still mandatory, especially if a network call exceeds the lease or the client crashes after the server applies a write. Existing tests use fake IndexedDB and mocked transport; they prove client transitions, not production server safety.
