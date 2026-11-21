# PR #329 follow-up remediation — 2026-11-20

## Purpose and paths

Execute the user-requested broad MOVO audit without restructuring the product. PR #329's original setup/motion/manifest work is already consolidated in merged #327. Reuse #330 for remaining account-boundary and interaction fixes; keep dependency maintenance in #331.

- src/App.js: capture cleanup references before deletion; await selective files/hybrid cleanup; retain unrelated guest/account device copies and SDK auth keys; report failure; localize tab accessible names and match stable screen targets.
- src/lib/deviceCleanup.js: explicit existing-key ownership rules plus live/archive/matching-workspace reference collection. Include actual user-prefixed chat namespaces, profile photos, active chats and referral receipt keys. Unknown legacy blobs are not assigned an owner or indiscriminately deleted.
- src/lib/accountQrLocalStore.js and localAttachments.js: selective deletion in existing IndexedDB stores; transaction errors propagate.
- src/components/TransactionSheet.js: evaluate the displayed keypad expression at submission and pass the existing optional draft argument; retain positive/finite/busy guards.
- App, isolation, helper and transaction-sheet tests: cross-account preservation, own deletion, cleanup failure/retry, Arabic labels/cancelled highlight and controlled stale-parent financial entry.
- Audit report, synthetic screenshots/measurements, handover, README, CLAUDE, progress and ledger document the observed result and limits. README sample/plan/logo descriptions reconciled with current source.

## Validation

Node 26.13.1, 255 suites / 1,670 tests, type checking and strict CRA production build pass; offline shell contains 229 resources. Initial old-source controls failed foreign-wallet preservation, Arabic accessible-name matching and the delayed-parent amount assertion. Fresh isolated Chromium passes 140 viewport/theme/text/screen checks and eight financial/keyboard/motion/sharing/RTL assertions. Inspectable screenshots and results are linked in the audit. Host sandbox blocked child spawning in the offline-worker test; with network execution permission the unchanged integration test passed in the separate full build. No sandbox failure was converted to a pass or test bypass.

## Data, security and preservation

No schema/RLS, financial record format, account IDs, calculations/routing, HTTP payload, native production code, CSS or screen restructuring. Cleanup only uses current confirmed-owner references; ownership and encryption remain independent. Other owners' stored bytes are not rewritten. Unreferenced legacy attachment ownership is unresolved and retained for explicit review. Failed multi-stage server/account deletion remains resumable-erasure work in #274/#291; this patch does not establish atomic erasure or complete data destruction.

Read-only production metadata retains 53/53 RLS, denied direct authenticated transaction UPDATE/DELETE, and anonymous denial/configured search paths on 15 authenticated-callable definer functions. No customer data or live database mutation. #274's production owner/erasure/retention migrations remain unapplied pending separate approval.

## Rollback and release gates

Revert this commit for code rollback, retaining the earlier #330 owner-envelope implementation; no schema/data downgrade. Such a revert restores the broader cleanup risk and should be reviewed accordingly. Keep recovery copies and never restore ambiguous legacy preferences into a different account.

Vercel currently reports Account is blocked; public MOVO returns HTTP 402 DEPLOYMENT_DISABLED. Owner/provider resolution and hosted acceptance are required. Last published #330 R8 paired run failed Maven HTTP 429; new exact-head web/SQL/security/native/R8 evidence is required. No protected-preview share-link retry, paid configuration change, store upload, physical-device approval or production migration is included. Browser matrix does not certify every browser, OS, locale, regulatory territory or store lifecycle.
