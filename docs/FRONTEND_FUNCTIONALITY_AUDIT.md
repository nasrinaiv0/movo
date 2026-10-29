# MOVO Frontend Functionality & Release Readiness

**Last reviewed:** 2026-10-29  
**Purpose:** Keep implementation, automated checks, live verification, and release blockers distinct. A control is not considered verified merely because it renders.

## Current implementation

- **Home / navigation:** Five root destinations; balance visibility and dashboard period/filter actions.
- **Wallet:** Account-type filters, account/card details, account create/edit/archive flows, transfer entry, recent activity, and explicit disabled states for card-issuer actions MOVO cannot perform.
- **Transactions:** Add/edit/delete, type filters, sorting, month selection, search, transfer records, CSV import with review and validation, and CSV export.
- **Profile / Settings / Appearance:** Profile editing, preferences, themes/accent colors, sign-in/out, local data clearing, in-app notification preferences, legal navigation, and Help Center. Unsupported billing, native biometrics/app lock, push/email delivery, and auto-categorization are labelled unavailable or disabled.
- **Authentication / consent:** Email/password and Google sign-in paths are gated by Terms acknowledgement; NasrinAI financial-context consent is separate and optional.
- **Legal / Help:** Terms of Service and Privacy Policy are implemented as in-app routes in `src/screens/Legal.js`; Help Center is in `src/screens/HelpCenter.js`. They are linked from onboarding, Profile, Settings, and NasrinAI consent. The separate `public/*.html` pages from older PR #22 are not used, to avoid maintaining duplicate policy text.

## Verification evidence

- Follow-up PR #27 was verified on exact head `0ef16b43daffafb5587f625b723d0604199cdf60`: GitHub Actions passed **13 test suites / 70 tests**, `tsc --noEmit`, and production compilation. Vercel preview reached READY for that exact head. The changes were merged as `88c9c293215496dad54f34ed3060d8f3aa1f0dd5`.
- A static scan of 12 primary screen/component files on 2026-10-29 found no literal empty JSX click handlers and no form tags without visible submit handling. This is a useful guardrail, not a replacement for browser interaction testing.
- Vercel reports the production deployment for merged `main` commit `88c9c293215496dad54f34ed3060d8f3aa1f0dd5` as **READY**, with `movo.nasrinai.com` attached as an alias. Deployment status is confirmed; a full interactive end-to-end browser smoke test on the custom domain remains unverified.

## Privacy and security boundaries

- Local finance records persist in the same browser profile across reloads, are not synced across devices, and are not encrypted by MOVO itself.
- Cloud account/transaction access relies on authenticated repository calls and Supabase RLS. Read-only production checks previously confirmed RLS enabled on profiles, financial accounts, transactions, budgets, and NasrinAI chat tables, with owner-scoped policies. The upstream conversation mapping has RLS enabled and no browser grants/client policy; no policy means browser access is denied by default.
- CSV import is parsed in the browser and requires a review step. CSV exports may contain sensitive financial information.
- MOVO does not currently connect to banks, initiate payments, read private Apple Pay history, or block cards. Push and email delivery are not connected.

## Outstanding release blockers

- [ ] Publish and legally review the formal operator/data-controller identity and registered address where required; verify actual retention periods, data recipients/providers, lawful bases, user-rights handling, and jurisdiction-specific wording. The legal screens currently warn users that these details are incomplete. Do not invent them.
- [ ] Enable Supabase Auth leaked-password protection. The Supabase Security Advisor reported it disabled on 2026-10-29: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- [ ] Review and remediate dependency audit findings using targeted upgrades and regression checks; the last recorded audit reported 34 findings (16 low, 5 moderate, 13 high).
- [ ] Resolve NasrinAI production upstream HTTP 401 and verify a successful authenticated request without exposing or logging secret values.
- [ ] Complete interactive browser smoke tests for onboarding/legal acknowledgement, consent opt-out, local data clearing, account/transaction edits, transfer validation, CSV import/export, keyboard navigation, focus restoration, and mobile layout.
- [ ] Re-run cloud owner-isolation/RLS checks and inspect browser console/network errors against the actual deployed build.

## Next-run order

1. Resolve the NasrinAI upstream HTTP 401 and verify an authenticated production request without exposing secrets.
2. Complete and review the operator identity, retention, provider, and jurisdiction-specific legal disclosures.
3. Enable Supabase Auth leaked-password protection and triage dependency audit findings with targeted upgrades.
4. Continue interactive browser checks for onboarding, consent, finance writes, import/export, accessibility, and mobile layout.
5. Repeat CI, build, RLS/ownership, and production checks after each substantive fix. Do not describe MOVO as fully production-ready while material blockers remain.


## 2026-10-29 follow-up: accessible explanations for unavailable settings

- Disabled settings switches now expose `aria-describedby` references to their visible explanatory copy, including push/email delivery, browser biometrics, local-storage controls, automatic categorization, and cloud-sync mode constraints.
- Notification-channel switches use the same association so screen-reader users can hear why push/email delivery is unavailable instead of relying on the visual row text or a mouse-only tooltip.
- Regression tests assert that disabled settings switches are disabled, visibly off where unsupported, and reference an existing non-empty description.
- Validation completed on PR #30 head `3ec569e9ec9aaecb37ccb315852f48bade19ea24`: [GitHub Actions run 40844002618](https://github.com/nasrinaiv0/movo/actions/runs/40844002618) passed 13 test suites / 72 tests, `tsc --noEmit`, and production compilation; the Vercel preview for that exact commit reached READY. PR #30 merged as `a6ab72d1c6ce503f1de724c0b50012d96e341938`, and Vercel reports the production deployment for that exact `main` commit READY with `movo.nasrinai.com` attached. A full interactive browser smoke test against the custom domain is still unverified.


## 2026-10-29 follow-up: profile edit form behavior

- Replaced the profile screen's notification-only Save action with a real form submit. Draft values remain in component state while editing; submit validates and trims the name, phone, and location before writing them to browser preferences.
- Explicitly disclosed that these editable profile fields are browser-local; the authentication email remains read-only and managed by the sign-in provider. No cloud profile write is implied.
- Added regression tests for successful save, local persistence, trimming, and rejection of a blank name.
- Validation completed on exact PR head `2a6ec6bb0a31a200d02298388eaa98994be515f9`: GitHub Actions [run 40845241222](https://github.com/nasrinaiv0/movo/actions/runs/40845241222) passed; Vercel preview `movo-2inoznxoq-nasrin-ai.vercel.app` reached READY and returned HTTP 200. Its build logs confirm `tsc --noEmit`, **13 test suites / 74 tests passed**, and successful production compilation. The built JavaScript includes the profile form and validation copy, with no NasrinAI server-key pattern or `NASRINAI_API_KEY` string found in the client bundle. A full interactive browser session remains unverified.

## 2026-10-29 follow-up: wallet quick actions and notification navigation

- The Wallet quick-actions row exposed both “Record Transfer” and “Transfer”, but both opened the exact same transfer-record form. This duplicated action was misleading because MOVO records transfers and does not move money.
- Replaced the duplicate “Transfer” control with “Add Transaction”, which opens the expense-entry form. “Record Transfer” remains the explicit way to create a transfer record.
- Added regression coverage proving the two wallet actions open distinct form modes.
- Added regression coverage for the existing NotificationSettings route mapping so the Home/Notifications root remains marked as the current primary-navigation destination.
- Validation passed on PR #33 head `cce7defdd3fcad6fd20a8bfe6a3abd69f7d3d88c`: [GitHub Actions run 40851881401](https://github.com/nasrinaiv0/movo/actions/runs/40851881401) passed **13 test suites / 76 tests**, typecheck, and production compilation. The Vercel preview for that exact head reached READY.
- PR #33 merged as `8fed594d571602c8d7f0cdca55afb286d47dabab`. Vercel reports the production deployment for that exact `main` commit as READY and attached to `movo.nasrinai.com`. [Production deployment details](https://vercel.com/nasrin-ai/movo/4vKjo4Tj3rdY192YKrpZuTa3fPHj).
- A full interactive browser session against the custom domain remains unverified.

## 2026-10-29 security status refresh

- Read-only production catalog checks confirm RLS is enabled on `profiles`, `financial_accounts`, `transactions`, `budgets`, `movo_ai_conversations`, `movo_ai_messages`, and `movo_ai_upstream_conversations`. Owner-facing tables have authenticated-role policies; the upstream conversation mapping intentionally has zero policies and remains restricted from browser roles for server-only access.
- The Supabase Security Advisor still reports leaked-password protection disabled. It also reports the no-policy RLS finding for the upstream mapping as informational; this is intentional only while browser grants remain absent and server-side service-role access is kept private.
- Recent production runtime errors still show 7 upstream HTTP 401 responses from `/api/nasrinai/chat` in the 24-hour window, last observed at 2026-10-29T05:42:54Z. No successful authenticated production chat request has been confirmed in this run.
- This follow-up changed no Supabase schema, RLS policies, grants, or secrets. Do not treat the passing frontend CI or READY deployment as proof that the remaining auth/legal/security blockers are resolved.


## Claude execution directive — production completion (2026-10-29)

**This is the active execution checklist.** Claude: continue working through the tasks below in the repository; do not stop at a plan, a passing build, a preview deployment, or a documentation-only update. Work in small, reviewable commits/PRs. Re-read the live PRs and latest workflow runs before changing code because this document may lag behind GitHub. Never claim a task is complete without attached evidence from the exact tested commit or live environment.

### P0 — Restore a green, reproducible baseline

- [ ] Inspect the latest state and checks for [PR #38](https://github.com/nasrinaiv0/movo/pull/38) and all open PRs before editing; avoid duplicating work already present in a branch.
- [ ] Retrieve the failed GitHub Actions job logs for the latest PR #38 run; identify the first root-cause failure, fix it, and rerun the complete CI workflow. Do not merge PR #38 while any required check is failing or pending.
- [ ] Verify the PR's current head SHA, all required checks, and Vercel preview status after every fix. Update this audit with the actual result and exact SHA.
- [ ] Run and record the repository's canonical commands from `package.json`: complete tests, TypeScript/typecheck, production build, lint (if configured), and dependency audit. Do not substitute a partial test run for the full suite.

### P0 — Repair and verify production NasrinAI authentication

- [ ] Trace the production `/api/nasrinai/chat` HTTP 401 end-to-end: browser request, server route, environment/config validation, provider authentication, and upstream response handling. Distinguish missing/invalid configuration from user/session authorization and provider-side rejection.
- [ ] Never print, commit, return to the browser, or include secret values in logs, screenshots, PR descriptions, or tests. Log only safe metadata and redacted error details. Do not expose upstream credentials or conversation-mapping IDs to browser roles.
- [ ] Confirm required environment variable names and configuration in deployment settings without reading or disclosing their values. If a secret is missing/invalid, document the exact variable name and request authorized owner action rather than inventing, rotating, or exposing a credential.
- [ ] Add/adjust regression tests for missing configuration, unauthenticated requests, invalid upstream credentials, upstream non-2xx responses, timeouts, and safe user-facing errors.
- [ ] After an authorized fix, verify a successful authenticated request against the production deployment and record timestamp, deployment/commit, HTTP outcome, and a redacted trace identifier. Until a successful live request is proven, leave this blocker open.

### P0 — Close the production security gates

- [ ] Re-check Supabase RLS and grants read-only first. Verify cross-user denial for profiles, financial accounts, transactions, budgets, chat records, and every new table/path. Keep upstream conversation mappings server-only; do not add browser policies merely to silence an advisor warning.
- [ ] Enable Supabase Auth leaked-password protection through the authorized Supabase project settings owner. If Claude lacks permission, leave a precise owner-action blocker; do not claim it is enabled.
- [ ] Re-run current dependency audit and group findings by direct/transitive dependency, exploitability, and fix availability. Prefer targeted compatible upgrades; avoid blanket forced upgrades that introduce breaking changes. Add regression coverage and rerun the complete suite after each remediation batch.
- [ ] Check secrets in tracked files, Git history where accessible, client bundles, source maps, logs, preview output, and browser network payloads. If a credential is actually exposed, follow the authorized provider's rotation procedure; never copy the value into the repository.
- [ ] Verify authorization on every server endpoint: authentication, owner/tenant scoping, input schema validation, rate limits where relevant, safe error responses, and no trust in client-supplied owner IDs.
- [ ] Verify data deletion/clearing semantics, consent withdrawal, session expiry, sign-out, and local-vs-cloud boundaries. Never imply local-only data is synced, backed up, or encrypted by MOVO when it is not.

### P0 — Legal publication readiness (do not fabricate facts)

- [ ] Ask the product owner for missing factual/legal inputs: operator/data-controller legal name and address, contact for privacy requests, actual data retention/deletion schedule, subprocessors/providers and purposes, applicable jurisdictions/law, and user-rights handling. Do not invent a legal entity, address, retention duration, legal basis, or compliance claim.
- [ ] Update Terms and Privacy Policy only from verified owner-approved facts. Keep any unresolved disclosure explicitly marked as a release blocker; do not remove the warning just to make the UI appear finished.
- [ ] Verify policy links and consent wording on sign-up, Google OAuth, profile/settings, and NasrinAI financial-context consent. Terms acceptance must not silently imply optional AI financial-context consent. Confirm accessible focus order and that consent state is not preselected if optional.
- [ ] Confirm that local financial records and custom card artwork are accurately described, including device-local storage, processing, clearing/deletion behavior, limitations, and any actual provider data flow.

### P1 — Exhaustive frontend interaction audit

- [ ] Inventory every route, tab, button, icon-only button, link, menu item, form, input, select, toggle, dialog, confirmation, empty state, retry action, and keyboard shortcut in the current source. Include mobile navigation and all appearance modes.
- [ ] For every visible control, prove one of: (a) it performs the advertised action and has a tested result, or (b) it is disabled with a visible, accessible, accurate reason. No dead clicks, misleading success toasts, placeholder controls masquerading as working features, or duplicate actions with different labels.
- [ ] Test all critical flows end-to-end: fresh visitor/onboarding; Terms acknowledgement; email/password sign-up/sign-in/sign-out; Google OAuth callback and failure; consent opt-in/opt-out; profile edit; account create/edit/archive; transaction create/edit/delete; transfer validation/recording; filters/search/sort/month changes; CSV import validation/review/commit; CSV export; sticker upload/replacement/removal; clear-local-data success and failure; preferences/theme; Help Center; legal pages; NasrinAI success/failure/retry; session expiry.
- [ ] Test persistence boundaries: reload, new tab, sign-out/sign-in, unavailable/throwing/quota-exceeded localStorage, offline/network failure, duplicate submissions, stale state, empty data, malformed inputs, and partial failures. Make data-loss risks visible and recoverable; never claim an unsaved write succeeded.
- [ ] Accessibility: keyboard-only operation, visible focus, focus trapping/restoration in dialogs, Escape behavior, labels and accessible names, error announcements, screen-reader descriptions for disabled controls, contrast, reduced motion/transparency, and touch target sizes.
- [ ] Responsive/browser verification: narrow mobile viewport and iOS Safari, Android/mobile Chromium if available, desktop Chromium, and at least one additional desktop browser if available. Check overflow, safe areas, dialogs, keyboard behavior, sticky navigation, loading/error/empty states, and console/network errors.
- [ ] Prefer automated browser tests for high-value flows. If browser automation is unavailable, record precisely what could not be tested; do not report manual/live verification as completed.

### P1 — Production deployment and operational checks

- [ ] Verify the deployed custom domain is serving the intended `main` commit, not merely that a Vercel deployment says READY. Record deployment URL/ID, commit SHA, timestamp, HTTP status, and basic response headers without exposing secrets.
- [ ] Run a production smoke test for public load, auth flows, authenticated finance reads/writes, policy routes, and NasrinAI success/failure behavior using authorized test accounts and non-sensitive test data.
- [ ] Inspect browser console/network and server logs for 4xx/5xx errors, CORS/callback errors, failed assets, hydration/runtime errors, and unexpected retries. Check caching headers and ensure personalized finance/API responses are not publicly cached.
- [ ] Verify environment separation between preview and production, redirect/callback URLs, allowed origins, security headers, error monitoring, and safe rate-limit behavior.
- [ ] Confirm database migrations are reconciled and applied to the intended environment before relying on schema changes. Do not run destructive migrations or alter production data without a reviewed migration and explicit authorization.

### P1 — Release decision and evidence

- [ ] Maintain a blocker table with: issue, severity, owner/action required, exact evidence, and status. Separate code-fixed, CI-verified, preview-verified, production-verified, and owner-action-required states.
- [ ] Every PR must state scope, tests run, exact head SHA, security/privacy impact, deployment status, remaining limitations, and rollback approach. Link the relevant audit entries and workflow runs.
- [ ] Re-run the full validation suite after the final code change, then re-check the exact final commit and production deployment. Do not reuse evidence from an earlier SHA.
- [ ] Do not merge failing or pending required checks; do not bypass branch protection. Do not mark the product production-complete while any P0 security, authentication, legal, data-integrity, or critical-flow blocker remains.
- [ ] At completion, provide a concise final report with merged PRs/SHAs, test counts, typecheck/build/audit results, production smoke-test evidence, resolved blockers, remaining owner actions, and rollback instructions.

### Execution rules

1. Start with live GitHub state and the failing CI logs; reconcile stale documentation before acting.
2. Work one high-priority root cause at a time. Use focused branches/PRs and avoid unrelated visual changes while resolving security, authentication, data-loss, or test failures.
3. Prefer safe, reversible changes; add a regression test before or alongside each bug fix.
4. Never weaken tests, hide audit findings, suppress meaningful errors, relax RLS, or replace a failed integration with fake success to make CI green.
5. If a task requires production credentials, legal facts, privileged Supabase settings, or a real owner decision, implement the safe preparatory work and record the exact authorized action still required. Do not pretend that external action was completed.
6. Update this file as work progresses with evidence and timestamps. A checkbox may be marked complete only when the stated verification level has actually been reached.

## Scheduled implementation pass — 2026-10-29 12:26 UTC

- Updated the NasrinAI financial-context consent notice to explicitly name the message and limited account-scoped context categories sent for a reply (relevant account labels, recent transactions, and budgets).
- Explicitly distinguished chat-specific consent from acceptance of the Terms of Service and stated that other MOVO features remain available without chat consent.
- Added visible, accessible guidance explaining why Send is disabled before opt-in; linked the guidance to the disabled action with `aria-describedby` and connected the consent checkbox to the disclosure.
- Added component regression coverage for consent-default-off, legal-document navigation, disabled-send guidance, and the consent flag on the chat request.
- This increment does not change server authorization, financial-context selection, Supabase RLS, account ownership checks, or credentials.
- Validation for the new branch is pending CI; do not treat the change as verified until the latest branch head has passed the full test/typecheck/build workflow.
- Production readiness blockers remain unchanged: legal operator/controller identity and address plus verified retention/provider/jurisdiction details; Supabase leaked-password protection; targeted dependency vulnerability remediation; and successful authenticated production NasrinAI chat verification.
