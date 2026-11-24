# Atomic loan and debt disbursement — staging only

## Plan before implementation
Base: PR #342 exact head `bdbae6a17f6a4577fc40ba2e677dea15a3aa50ff`. Current createLoan inserts a zero-opening loan, then invokes the borrowed event separately; a response loss can create an orphan or prompt duplicate disbursement. Replace new creation with one owner-authorized RPC transaction including the liability, existing borrowed event and accounting posting. An owner-scoped request UUID plus canonical payload digest is reserved transactionally; concurrent/replayed identical calls return the existing row, changed input fails closed. No direct balance mutation and no earned income transaction. Historical liabilities retain opening principal without posting cash. Existing edit, repayment and old-app API paths remain compatible.

The screen creates a stable request UUID per open draft and reuses it for retries. This does not guarantee deduplication across a brand-new draft or after app restart; a persistent encrypted pending-intent queue requires separate acceptance. Never silently fall back to the two-request path when the RPC is unavailable. Validate account ownership, active status, currency and spendable receiving type on server; bind the expected authenticated owner. Use locked, non-client-accessible request receipts with RLS and explicit grants. Add disposable SQL replay, owner mismatch, rollback and accounting tests, plus UI retry coverage. Require native CI, preview, independent review, and staged migration acceptance before release. No remote SQL, production change or merge.

## Implementation
Added the proposed RPC, protected request receipt, stable per-draft UUID and disposable SQL/UI tests. Exact-head tests pending. The local environment does not expose Supabase CLI; migration is a checked-in additive SQL candidate following existing repository ordering, not an applied migration. No persistent cross-restart retry queue or live acceptance claimed.

## Parallel and visual acceptance plan
First exact-head disposable finance run succeeded. Add two independent authenticated SQL sessions and exact-count assertions, plus real-component Chromium rendering using synthetic data and blocked external traffic. Browser screenshots are component evidence, not authenticated hosted financial acceptance. CI results pending.

## Concurrent seed correction
Disposable account creation failed with sign_in_required before racing requests. Seed synthetic data with the existing service-role fixture claim only; the two actual request sessions remain authenticated and owner-bound. No production change or guard bypass.

## Concurrent entitlement fixture
Both concurrent calls correctly rejected the synthetic owner without cloud write entitlement. Add the same short-lived manual plan grant used by the existing disposable hybrid tests and explicit authenticated claims in both sessions; do not weaken server guards. New exact-head CI required.

## Current main and Chromium acceptance remediation
Integrate #342's updated head and preserve original SQL and accounting changes. Use a dedicated synthetic fixture rendering the real planning component, with explicit locale and adaptive shell. Capture failure screenshots and diagnostics; all assertions remain mandatory. Browser root cause not yet proven; exact-head CI required. Do not release the RPC client before the migration is present in the target database.
