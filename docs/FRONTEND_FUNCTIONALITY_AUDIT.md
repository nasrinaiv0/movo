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
- Validation for this follow-up is pending CI on the dedicated branch; do not treat this note as evidence of a passing test until the workflow result confirms it.
