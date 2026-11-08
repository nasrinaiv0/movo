# MOVO access, finance and UI audit — 2026-11-09 (Asia/Manila)

Status: NOT CLEARED FOR RELEASE. This includes source review, read-only production catalog/advisor inspection and isolated Vercel Sandbox verification. It is not a completed penetration or signed-device test.
Reviewed main: bf19aa7c0f83f8dd8215b4e0644a5b63f98aac45.
Production database: cjsjmorqvuvvwbfyztiz. No production rows, migrations, settings or deployment changed.

## Replacement promotion
The owner's current policy supersedes PR #242: every eligible first-time user can claim one calendar month of Pro, with no first-100 cap, purchase requirement or automatic charge. Pro+ is not included.
Main already implements this in claim_movo_trial, POST /api/purchases/trial, and PlanOffer. Keep the verified-account requirement, per-user lock, single grant and existing-trial idempotency. Clearing device storage must not reset the server grant.
Current implementation requires the user to claim the month; it does not automatically start on signup. Existing trial users and production store subscribers are excluded. Identity is per verified account, not proof of a unique human; deletion/re-registration abuse has not been prevented or tested.
Do not merge the obsolete first-100 Pro+ branch or apply its migration.
Do not describe the replacement as live until the existing plan migration and end-to-end tests pass.

## Findings
| Priority | Area | Evidence and consequence | Required resolution |
|---|---|---|---|
| Critical release blocker | Live plan enforcement | Live catalog has none of movo_plan_status, claim_movo_trial, enforce_movo_cloud_plan; zero enforce_movo_plan triggers. Main calls these functions. The plan migration version is absent from migration history. | Rehearse migration against a disposable database matching live schema; test claims, expiry, API access and direct DB writes before a coordinated rollout. UI gating is not remote enforcement. |
| High | Cloud/local race | App refreshCloud unconditionally installs results and sets cloudMode=true after awaits, without validating current user/request generation/cloud preference. | Reject stale responses after logout, owner change or cloud-off. Review #245/#246 and test delayed responses across two users. |
| High | Cloud off / expiry | Main cloud-off discards displayed cloud arrays and loads shared local keys; it does not create a complete owner-specific offline snapshot. Plan checks use entitlement without cloud-mode gating. | Complete #241/#245/#246 together with failure-safe migration and owner isolation. Do not claim full offline support. |
| High | Incomplete balances on read failure | App refreshCloud substitutes empty postings, activities, bills and budgets on query failure. | Mark incomplete data unavailable and preserve the last verified snapshot; never show an apparently complete financial balance based on missing postings. |
| High | Monetary input precision | financeRepository accepts values up to 1e17 and uses Math.round(value*100)/100 for account/transaction/budget writes. This differs from moneyMath and exceeds safe integer-cent precision. | Use one validated exact-cent boundary for all writes; reject unsafe amounts and test decimal boundaries and positive values rounding to zero. |
| Medium | Account pagination | listAccounts uses one PostgREST select, while listTransactions uses fetchAllRows. | Paginate with a stable unique ordering; test more rows than the server limit. #246 includes related work. |
| Medium | Trial button eligibility | PlanOffer treats absent entitlement as eligible even for a signed-in user whose lookup failed. | Distinguish guest, loading, failed status, eligible, already used and active paid states; retain server authorization. |
| Medium | Shared local storage | localFinanceStore uses global account/transaction keys; preferences are also device-wide. | Audit signed-user versus guest isolation, logout/account switch and all sensitive domains; localStorage is not encrypted. |
| Review required | RLS / privileged functions | Live 28/28 public tables have RLS. Advisor flags 12 authenticated SECURITY DEFINER finance RPCs. | Inspect actual live definitions and run owner/non-owner/replay tests against an isolated copy. RLS alone does not prove privileged-function isolation. No confirmed cross-tenant exploit is asserted. |
| Review required | Auth | Main uses persisted Supabase client sessions. #227 native vault changes remain draft/conflicted. Advisor reports leaked-password protection disabled. | Resolve security branch, verify native vault migration and signed devices; review OTP/OAuth-only applicability of password warning. |
| Open | Dependency scan | Fresh locked install: runtime audit 0; full tree 34 advisories (16 low, 5 moderate, 13 high), in build/test dependencies. | Remediate toolchain advisories; do not claim zero vulnerabilities across the full tree. |
| Unverified | Buttons/layout/routing | Shared controls expose labels/switch state; plan carousel and footer CSS exist; App route switch gates scheduled automation. Static review cannot establish all click targets, keyboard behavior, overflow or native callbacks. | Execute matrix below in Vercel Sandbox and then real signed devices. |

The upstream-conversation table's RLS-with-no-policy advisor finding is consistent with server-only access; it is not by itself a vulnerability and must not be “fixed” by adding a public policy.

## Required Vercel Sandbox matrix
- 320, 390, 430 and desktop widths; light/dark/accent contrast; larger text, keyboard/focus, safe areas and on-screen keyboard.
- Every header, filter, menu, back, add/edit/delete/pay/collect, save/discard and cancel control; rapid double taps and loading/failure states.
- Guest Free, verified first-time user, active Pro trial, exact expiry, used trial, Pro, Pro+, canceled but unexpired, revoked, failed entitlement lookup.
- Trial claim double submission and retries: one calendar month, never extensions; month-end/time-zone cases; no payment dialog; no Pro+ automation grant.
- Cloud off/on, offline startup, reconnect, delayed request, logout and two-account switch; quota failure; conflicts and deletions without silent overwrite.
- Financial creation/update/reversal/import/transfer, linked debit and credit payments; currency isolation, missing FX/history, large amounts, decimal boundaries.
- Route reload/back/native OAuth and automation deep links; forged callback parameters and unauthorized direct API/RPC access.
- Full application tests, typecheck, build, translations, dependency audit and isolated SQL/RLS tests against the exact final tree.

## Vercel Sandbox verification completed
Team access was granted. Sandbox `movo-access-audit-20261109`, session `sbx_GfbpEi0LtM7knDOf2SdBiTxWpIi8`, tested application main `bf19aa7c0f83f8dd8215b4e0644a5b63f98aac45`.
- Locked npm ci completed. TypeScript passed. 820/820 application tests in 146 suites passed.
- Initial optimized build received SIGKILL. Retry passed using GENERATE_SOURCEMAP=false and NODE_OPTIONS=--max-old-space-size=1536; source-map-enabled build is not certified.
- Disposable PostgreSQL 18 on 127.0.0.1:55432 passed existing plan/RLS tests: expiry, read-only owner access, forged grants, cross-user plan reads, automation restrictions, refunds and referrals.
- Added first_time_trial.test.sql: 150 verified first-time accounts all received Pro for exactly one calendar month; repeat claims did not extend grants; own-grant isolation and unverified/anonymous rejection passed. This explicitly verifies no first-100 limit.
- 36 component UI checks: 320/390/430 widths, light/dark, green/orange, cryptocurrency/planning/reminder layouts. Zero page JS errors reported.
- 6 production-app checks: same widths and light/dark, visible free-month CTA, no-auto-charge text, Pro carousel selection, Continue dismissal and Home/Wallet/Transactions/Menu navigation.
- 30 production header geometry cases, independent Plus dialogs, crypto refresh busy state, failure preserving prior timestamp, Manila time and reduced motion passed. Free users hit the scheduled-automation upgrade gate.
- Existing header test's zero-padding assertion failed: some buttons retain 0.5px. The continuing audit recorded padding and checked other geometry without claiming zero-padding compliance.
- Initial navigation overflow assertion sampled a transition; recheck after a 500ms settling interval passed. This does not certify animation frames never overflow.
- Free local flow: create PHP100.25 cash, save PHP12.34 expense, verify PHP87.91 account and settled total, reload and dismiss recent-logs prompt, verify one saved account/transaction and zero cloud writes.
- Money animation displays intermediate values before settling; the balance assertion waited for completion.
- Fresh npm audit: runtime 0; full tree 34 advisories (16 low, 5 moderate, 13 high).
- Synthetic fixtures only; no production mutation, paid Supabase branch, real customer session, StoreKit/Play purchase, Safari or signed-device verification.

Reproducible additions: `supabase/tests/first_time_trial.test.sql`, `scripts/ui-qa/plan-access.cjs`, `scripts/ui-qa/free-local-flow.cjs`, and `scripts/ui-qa/headers-access-audit.cjs`. Playwright comes from a separate tooling prefix; serve the compiled app on localhost:4174. SQL runner creates only a localhost disposable fixture database. These fixtures do not reproduce every live schema/RPC, and do not clear the production migration drift.

## Existing branches
- #242: obsolete first-100 promotion; superseded by the policy above.
- #227: native security; draft, GitHub currently reports merge conflicts.
- #241: expiry/cloud-off snapshots; incomplete offline domains.
- #245: device-only import confirmation and local plan pause; draft.
- #246: reconciliation foundation stacked on #245; incomplete bidirectional domain support.
