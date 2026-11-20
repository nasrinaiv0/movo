# Finance integrity audit fixes — 2026-11-19

The audit of `44f3ab4d` identified direct transaction mutation paths that bypassed payment reversals, allocation calculations that included pending money, and a sync update guard that omitted posting status.

## Implementation

- `supabase/migrations/20261119222104_harden_transaction_mutations_and_posted_allocations.sql` revokes direct UPDATE/DELETE on `transactions` from PUBLIC, anon and authenticated, and removes the corresponding client policies. SELECT/INSERT and service-role privileges remain as previously configured. Existing sync updates retain owner/entitlement checks and compare-and-swap; single deletions use the existing reversal RPC.
- The sync guard now rejects changes to `is_pending` for active bill payments, loan events, receivable events and paid payment attempts. Description edits and unchanged posting status still work; ordinary transactions can still change posting status through sync.
- Goal allocations, plan allocations and reconciliation exclude `is_pending` transactions from both balance totals and mixed-currency checks. Posting an expense still reconciles reservations against actual available funds. Existing allocation rows are not rewritten during migration.
- `delete_all_transactions_with_reversals(p_expected_user_id uuid)` lists the authenticated owner's transactions through invoker RLS and calls the existing reversal RPC for each. It requires a matching expected owner and an active cloud plan, accepts no alternate deletion owner, and denies anonymous execution. All transaction reversals in one call are atomic. Failures stop the client before further table deletion, with no fallback to direct writes.
- `src/lib/financeRepository.js` supplies the expected owner for the reset RPC. The separate QR cleanup and other reset requests are not made atomic by this change.

## Regression coverage

`supabase/tests/transaction_mutation_integrity.test.sql` exercises real authenticated-role permissions, four active link types, denied amount/posting-status edits, safe note edits, ordinary pending edits, reversal audit retention, bill/loan/receivable/subscription reset effects, reset replay, a later-row failure rolling back earlier reversals, another tenant's retained transaction, mismatched owner, expired entitlement and missing identity.

`supabase/tests/posted_allocation_balances.test.sql` covers pending income and incoming transfers funding neither goal nor plan allocations, pending expenses/outgoing transfers preserving existing reservations, pending foreign-currency records, and reconciliation when an expense posts. Both suites run from `scripts/test-finance-rpc-isolation-local.py`, already used by finance isolation CI. `src/lib/clearCloud.test.js` covers reset RPC use, order and fail-closed behavior when permissions or the migration are unavailable.

## Validation

- All 251 JavaScript suites / 1,629 tests passed, including the final expected-owner argument change. Focused repository/reset validation also passes (14 tests).
- TypeScript and strict CRA production compilation passed after the final expected-owner argument change.
- Every production migration and all nine SQL suites in the isolation runner pass on disposable local PostgreSQL 18. The tests use synthetic owners and roll back their fixtures; no customer database is accessed.
- Against the previous database functions/grants, the new regressions fail with broad transaction privileges, an accepted linked posting-status change, and a goal reservation funded by pending money. Each fix therefore has a demonstrated failing baseline.
- Local JavaScript tooling uses Node 24; the repository requests Node 26. Hosted Node 26 CI, hosted preview and physical devices are not certified by these local checks. No UI styling or native code changes are included.

## Rollout and rollback

Apply the new migration before deploying the updated reset client. The replacement allocation/sync function definitions preserve their existing ACLs; the new bulk RPC has an explicit authenticated-only grant. No new tables, exposed views, storage grants or privileged bypass flags are introduced. Hosted database advisors and staging reset/sync acceptance remain release gates.

Old clients that directly update/delete transactions will fail closed after migration. Current sync/reversal clients remain supported; an older cloud reset client must update. A missing migration makes the new reset RPC fail closed. Large resets remain subject to database statement timeouts; failure rolls back the transaction phase.

Prefer a forward migration for any rollout defect. Regranting direct UPDATE/DELETE or restoring the old balance/status guards reopens the audited issues. A client rollback must retain the RPC-based reset or temporarily disable reset. Historical inconsistent links/reservations require an owner-reviewed repair plan; this migration does not infer or alter historical financial records. Production migration, deployment and merge have not been performed by this local implementation.
