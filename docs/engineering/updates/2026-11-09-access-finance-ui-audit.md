# MOVO access, finance and UI audit — 2026-11-09 (Asia/Manila)

Status: NOT CLEARED FOR RELEASE. This is a source review plus read-only production catalog/advisor inspection, not a completed interactive penetration or device test.
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
| Unverified | Vulnerability scan | No fresh dependency install/advisory scan was run this turn. | Run full dependency and runtime audits on exact candidate revision. Do not reuse historical zero-vulnerability claims. |
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

## Current verification blocker
Vercel project prj_JKxkOXrw6QfADt4ZF32bdjUAY1LH belongs to team_dhqSa2tKK2L6WuWKmVZDKKRl (nasrin-ai1). Sandbox access returned HTTP 403 requiring team authorization. A consent link was requested and supplied to the owner. No Sandbox test was run in this turn.
No paid Supabase branch was created. Existing PR descriptions are historical evidence only, not new test results.

## Existing branches
- #242: obsolete first-100 promotion; superseded by the policy above.
- #227: native security; draft, GitHub currently reports merge conflicts.
- #241: expiry/cloud-off snapshots; incomplete offline domains.
- #245: device-only import confirmation and local plan pause; draft.
- #246: reconciliation foundation stacked on #245; incomplete bidirectional domain support.
