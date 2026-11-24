# PR #343 — Atomic loan migration approval checklist (2026-11-24)

**HOLD — no remote migration or merge authorized in this task.**

Migration: `supabase/migrations/20261124030000_atomic_loan_disbursement.sql`.
Target only after separate approval: verified MOVO production project `cjsjmorqvuvvwbfyztiz` (Tokyo); never a different project. Confirm identity, environment, plan, and authoritative migration history immediately before execution.

## Evidence and approvals
- [x] Exact-head isolated accounting at b1345a1: one liability/event/posting and one receipt under two authenticated concurrent calls; replay, rollback, tenant isolation. No remote writes.
- [x] Prior read-only production metadata check: existing record_loan_event available, atomic RPC and request table absent; migration history lacked 20261124030000. Recheck immediately before approved execution.
- [ ] New-head full CI, browser screenshots, native acceptance and exact Vercel preview. #342 must first be accepted and merged. Revalidate #343 against the resulting main SHA.
- [ ] Compare all unapplied repository migrations to remote history; confirm ordering, dependencies, schema/types, pg_catalog SHA-256 support, actual RLS/write-entitlement triggers, account erasure and retention policies. Do not run unrelated pending migrations.
- [ ] Rehearse the exact migration on a disposable PostgreSQL environment with the actual production schema/migration sequence (no customer data), legacy client compatibility, authenticated tenant isolation, concurrency, replay after timeout, historical loan, archived/wrong-currency account, payload mismatch, deleted-loan tombstone and rollback. Verify grant/role matrix, empty search_path, RLS, owner checks and entitlement enforcement. Inspect security advisors in staging; independent security/accounting/Claude review is not yet completed.
- [ ] Verify backup/PITR availability, retention, restore feasibility and approved recovery window. No paid upgrade or new resource without separate authorization.
- [ ] Owner approves exact SQL checksum, project, deployment window, change owner, rollback and monitoring; security/accounting reviewers sign off. No secrets or customer data in logs.

## Approved execution order (not executed)
1. Recheck main and exact branch head, migration history and production dependencies. Preserve legacy paths. Establish pre-change catalog/grant/balance invariants with read-only metadata; no real-customer smoke writes.
2. Apply only the reviewed additive migration in a transaction through the authorized migration workflow. Stop on any error or unexpected drift. No silent edits, destructive cleanups or fallback financial postings.
3. Check existence/signature, RLS, privileges, FK/index, schema-cache recognition, entitlement guards and authorized RPC access. Verify legacy client compatibility and isolated/synthetic acceptance with approved test account; no posting to customer accounts.
4. Only after prerequisites and all release gates pass, obtain explicit merge authorization, merge the reviewed head, verify deployed SHA, and monitor RPC errors, duplicate events/postings, unexpected balances and latency.
5. If failure before commit: transaction rolls back. If failure after commit: halt client rollout; revert client deployment if separately authorized, retain receipts and ledger history. Prefer a reviewed forward repair; never drop the receipt table or reverse posted cash automatically, because retries could duplicate disbursement. Any destructive rollback requires separately reviewed accounting reconciliation and approval.

## Sign-off
Owner: pending. Database/security: pending. Accounting: pending. Independent Claude review: pending. Release QA: pending.
