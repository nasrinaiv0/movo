# MOVO Pull Request Progress Register

## 2026-11-09 — Vercel Sandbox access restored; PR #247 verification

820 tests / 146 suites, typecheck, optimized build without source maps, isolated plan/RLS SQL including 150 first-time Pro grants, 36 component + 6 app + 30 header cases, and exact-cent Free local save/reload passed. Header 0.5px padding and 34 build/test dependency advisories remain. Production plan RPC/trigger migration and cross-user cloud/offline release blockers remain unresolved; no production changes or signed-device certification. See the dated access/finance/UI audit for scope and failure/retry evidence.

## 2026-11-09 — Access audit and replacement welcome offer

First-100 Pro+ promotion superseded: one calendar month of Pro for every eligible first-time verified account, using the existing uncapped claim flow. Live plan RPCs/triggers are missing; cloud/local races, incomplete balance inputs and precision gaps require resolution. Vercel Sandbox authorization is blocked (403), so interactive validation and release remain pending. No production changes.

See [dated audit](engineering/updates/2026-11-09-access-finance-ui-audit.md).

**Last reconciled:** 2026-11-05  
**Source of truth:** GitHub PR pages, commit SHAs, Actions runs, and Vercel deployment records. This register is a concise operational index, not a substitute for those records.

## Open pull requests

**2026-11-09 — PR #245 render-loop fix:** the payment-link effect re-opened the plans sheet on every render in local mode (App tests hung). Links are now marked handled and cleared before the Pro+ check. App tests 49/49. See `docs/engineering/updates/2026-11-09-pr245-payment-link-loop-fix.md`.

**2026-11-08 — PR #227 free security hardening:** New disposable-local PostgreSQL 18 runner applied all 28 MOVO migrations, verified all 12 privileged finance RPCs with two synthetic users and successful owner-only controls; no paid Supabase branch or production mutations. Added PR CI job, strict localhost-only runner and native OAuth/deep-link URL validation. See `docs/engineering/updates/2026-11-08-pr227-free-local-security.md`; remain DRAFT pending exact-head CI and signed-device checks.


**2026-11-08 — PR #227 localization CI correction:** Restored translation-catalog completeness for the new Profile remote-session-revocation controls: five strings in all 11 MOVO locales, regenerated locale dictionaries and version. Isolated Vercel Sandbox i18n and scope tests pass; require complete final-head CI before merger. See dated PR227 security implementation note.

**2026-11-08 — PR #227 session controls:** Added user-confirmed sign-out of other sessions via Supabase `scope: 'others'` while preserving the current session. Verified with focused tests; current access JWTs remain valid until expiry. See `docs/engineering/updates/2026-11-08-pr227-security-implementation.md`.

**2026-11-08 — PR #227 native security remediation:** Secure legacy token deletion and logout tombstones are implemented; combined main/security Sandbox 814 tests passed. Preserve DRAFT until iOS/Android signed-device tests, 12 privileged RPC cross-user checks, and branch protection. See `docs/engineering/updates/2026-11-08-pr227-security-implementation.md`.

**2026-11-08 — PR #244 Philippine rewards reference presets (draft):** Reconciled against main after #239 and #240 and restored full engineering registers; compact eight-category collapse/expand, editable OFF-by-default cashback/points suggestions, and accounting-safe calculations. Exact combined tree Vercel Sandbox: 820/820 Jest tests across 146 suites, TypeScript, optimized build PASS. GitHub documentation-gate repair squashes the original implementation and dated engineering update into one reviewable commit, preserving all code; branch remains DRAFT pending provider terms verification, native/signed-device UI checks, and cloud/local override validation. Details: `docs/engineering/updates/2026-11-08-ph-rewards-presets-collapsible-categories.md`.

**2026-11-08 — Transaction running balances (review, accessibility regression correction):** Add optional after-transaction balance/remaining credit history with paired transfer balances, cents accuracy, privacy masking and dedicated Settings toggle. Prepared in isolated Vercel Sandbox; verify exact-head CI and preview UI before merge. Details: docs/engineering/updates/2026-11-08-transaction-running-balances.md.

**2026-11-07 — Plans and Wallet UI follow-up:** Removes cloud-read-only banner, adds swipeable plan cards with visible trial controls, and renders loyalty/rewards as cards with header-only creation. Badge hierarchy becomes Bronze/Silver/Gold/Platinum. Branch `fix/plans-wallet-ui-20261107`; details in `docs/engineering/updates/2026-11-07-plans-wallet-ui.md`.

**2026-11-07 — Pro / Pro+ trials and restrictions:** `feat/pro-plans-trial-restrictions` adds expiring plan gates, native-store product tiers, one-month Pro claim, verified referral rewards, cloud read-only transition and local backup access. Vercel Sandbox: 765 tests / 135 suites, TypeScript, production build and isolated PostgreSQL checks pass. Draft pending staging migration and signed-device store lifecycle checks. Details: `docs/engineering/updates/2026-11-07-pro-plans-trials-referrals.md`.

**2026-11-07 — Membership, tokens, Cashback, and unified Others filter:** Branch feat/movo-others-membership-rewards-20261107 preserves five Wallet filters, puts cash/miscellaneous financial accounts plus membership/rewards into Others, adds secure non-cash provider cards, and introduces reversibly derived reward estimates from matching purchases in Cashback. Vercel Sandbox full build, Jest and Chromium QA; same-commit docs in docs/engineering/updates/2026-11-07-loyalty-membership-rewards-and-others-filter.md. Require exact-head CI before merge.

**2026-11-07 — E-wallet QR upload:** Separate branch feat/ewallet-account-qr-20261107 extends Wallet account QR upload to e-wallet add/edit, preserving bank flow. Sandbox full tests 717/717, TypeScript, production build and Chromium mobile create/upload/reload/remove QA passed. Details: docs/engineering/updates/2026-11-07-ewallet-payment-qr-upload.md. Merge only after exact-head CI checks, no migration.

**2026-11-07 — TTS / receipt scan repair:** Isolated branch, fixes local OCR contrast collapse, WASM CSP, iOS image decode fallback, scanner recovery, bounded SSE/NDJSON voice streaming and chunked TTS. Vercel Sandbox build: 712 tests pass; detailed manual/automated verification recorded in dated engineering update. Unmerged until exact-head CI review.

**2026-11-07 — Follow-up on PR #230:** All shared RootHeader and SubHeader back-arrow buttons are now transparent across light/dark, hover, active and focus states (with accessible focus ring preserved). No changes to 45px hit targets or standalone controls; Vercel Sandbox browser QA (375px light, 320px dark, 1024px desktop) and 692 automated tests passed; GitHub CI to confirm. Details: `docs/engineering/updates/2026-11-07-grouped-header-zero-padding.md`.

**2026-11-07 — Grouped header zero-padding change:** `ui/header-group-zero-padding-20261107` removes utility capsule and grouped-button padding across MOVO, preserves icon geometry, and adds a CSS regression test. Vercel Sandbox validation and GitHub CI to be recorded in PR; no production merge implied. Details: `docs/engineering/updates/2026-11-07-grouped-header-zero-padding.md`.

**2026-11-08 — PR #227 updated security gap audit:** Review of exact security branch and live MOVO DB identified 12 privileged RPCs pending two-user negative tests, unprotected main, 34-commit divergence and three merge conflicts, native legacy secret cleanup caveat, and canceled iOS CI. Sandbox 644/644 tests and build passed. Audit: `docs/security/PR227_GAP_AUDIT_2026-11-08.md`. PR remains DRAFT.

| PR | Scope | Current state | Next action |
|---|---|---|---|
| [#214 — Credit-card ledger and compact card details](https://github.com/nasrinaiv0/movo/pull/214) | Financial Planning credit-card ledger reconciliation, complete payment/credit history, expandable details and responsive card layout. | Open; ready for review. Local tests, typecheck, build, translation coverage and GitHub Actions CI passed; Vercel Sandbox viewport checks passed. Hosted Vercel preview skipped by the configured Ignore Build Step. | Review the implementation and test results; merge after approval. |
| [#177 — FX converter and crypto market](https://github.com/nasrinaiv0/movo/pull/177) | FX converter, tracked pairs and history; crypto market discovery, local watchlist, coin detail and provider-supported history. | Closed; crypto market implementation added; validation pending. | Configure licensed CoinPaprika API Pro key as Vercel `COINPAPRIKA_API_KEY`; complete tests, typecheck, build and preview verification. Price alerts are implemented locally with above/below thresholds, enable/pause/delete controls and permission-aware notifications; portfolio lots remain pending. |
| [#175 — Deep security audit implementation plan](https://github.com/nasrinaiv0/movo/pull/175) | Security remediation documentation and penetration-test plan. | Open draft. | Continue implementation under issue #143. |

2026-11-04 — Crypto market implementation on PR #177: added the responsive market screen, provider-backed searchable ticker list, sorting, local watchlist, coin detail, provider-supported daily history, foreground refresh, and server-side CoinPaprika proxy with validated inputs and cached responses. The latest web CI run is queued; no crypto implementation checks are marked passed until the current head completes. Required deployment action: configure a licensed CoinPaprika plan/key in Vercel as `COINPAPRIKA_API_KEY`. Price alerts now support local above/below thresholds, crossing detection/rearming, enable/pause/delete, and foreground permission-aware notifications. Translation coverage was fixed for both market and alert UI copy. CI now uses `npm install` because this repository does not commit a lockfile; the first CI attempt exposed this workflow assumption and was corrected. Manual portfolio holdings/valuation are implemented; native iOS requests now route through `apiUrl('/api/crypto')` so the bundled app calls the production API. The CoinPaprika key remains a required Vercel server environment variable. CI now runs dependency install (repository has no lockfile), production dependency audit, typecheck, dedicated translation coverage, full tests and production build.\n\nChecked against GitHub on 2026-11-04. This register is reconciled for the currently open work; historical entries below remain a summary of prior changes.

2026-11-05 — PR #214 created from `main` for credit-card ledger reconciliation and the compact expandable Financial Planning card UI. The live ledger balance takes precedence over stale liability snapshots; valid unique payment logs are subtracted without the previous 120-entry cutoff. Full payment and credit-spend histories are available in the expanded panel. Added responsive Wallet and Transactions filters, updated Home/Transactions/all screen-header icon accents, extended accent styling to the custom NasrinAI chat header actions, and replaced transaction-search initials with the MOVO mark plus category badges. Final verification on head `31f2917c2bf831b5373451a6e8b1326bbc9b12f3`: 94 Jest suites / 560 tests, TypeScript, production build, translation catalogue validation, and Vercel Sandbox checks passed. GitHub Actions passed; hosted Vercel preview was skipped by the configured Ignore Build Step.

## Production database (checked 2026-11-02 20:00 UTC)

Supabase `cjsjmorqvuvvwbfyztiz` has **every migration on `main`**, through `20261103010000_automation_transfers`.
`user_preferences` was applied on 2026-11-02 via the Supabase tools; `bills_payments`,
`automation_sources_and_cross_source_dedup`, `automation_inbox` and `automation_transfers` were applied by the owner
in the SQL Editor from one reviewed script. Before that, the script was run on a local Postgres 16 copy built to
match production, and the SQL test suites passed there. A production read-back confirmed:
- the bills tables and the automation inbox exist, with RLS on;
- both automation loggers exist and are server-only;
- `user_preferences` has RLS on.

**Supabase advisors (2026-11-02, after applying):**
- `assert_movo_finance_child_ownership()` (a trigger function) is executable by anon/authenticated. Calling it directly
  only errors, but EXECUTE should be revoked.
- 34 RLS policies call `auth.uid()` per row; they should use `(select auth.uid())` (bills, loans, receivables, goals,
  postings).
- 15 foreign keys have no covering index.
- Also reported:
  - 8 authenticated SECURITY DEFINER RPCs: intended, each checks `auth.uid()`;
  - leaked-password protection off: no passwords since #133;
  - `movo_ai_upstream_conversations` has RLS with no policy: server-only by design;
  - 13 unused indexes on new, nearly empty tables.
- A hardening migration with tests is proposed; applying it needs the owner's approval.

**Security audit (2026-11-03) → `fix/db-hardening`, migration `20261103020000_harden_trigger_execute_rls_initplan_fk_indexes`:**
- Bug found while testing: `assert_movo_finance_child_ownership()` read `new.transaction_id` on `financial_loans` and
  `financial_receivables`, which have no such column. Every loan or receivable insert/update failed (production has 0 of
  each). The migration fixes this; ownership checks are unchanged.
- Revokes EXECUTE on that trigger function from anon/authenticated (service_role keeps it, like
  `assert_movo_bill_ownership`); rewrites the 34 policies to `(select auth.uid())`; indexes the 15 foreign keys.
- `supabase/tests/security_hardening.test.sql` passes on a local Postgres 16 copy matching production (same policies,
  same function source), fails without the migration, and the migration re-runs cleanly. **Not applied to production yet.**

**Bank-app notification logging (`feat/notification-logging`, 2026-11-03):** Automatic logging now opens on **Bank notifications** (iOS 27 Notification trigger, one automation per app) and no longer offers the text-message recipe. `/api/log` replies carry `notice` (left out for duplicates and ignored promos/OTPs) so background shortcuts need one "has any value" check. The parser reads push wording ("You've paid", "card … was used for", "PHPx" without a space) and ignores offers and statements. Prompts were rewritten per mode; they can't be tested on an iPhone from CI.

## Recent merged implementation

| PR | Result | Validation / notes |
|---|---|---|
| [#146 — Account deletion in the app](https://github.com/nasrinaiv0/movo/pull/146) | Merged 2026-11-02 as `a44b22e`. | iOS phase 3 (App Store 5.1.1(v)): Settings → Delete Account → `POST /api/account/delete` (verified token; transactions, then the Auth user via the Admin API; the rest cascades). Local Postgres check: no `user_id` row left in any public table. 366 tests; `verify` + `build-ios` green. |
| [#145 — Siri income and transfers](https://github.com/nasrinaiv0/movo/pull/145) | Squash-merged 2026-11-02 as `21cd33d`. | Voice transfers between own accounts as one transfer row via `log_automation_transfer` (migration `20261103010000`, SQL test + mutation checks); more income phrasing. 373 tests; `verify` + `build-ios` green. |
| [#144 — Bank and e-wallet payment texts](https://github.com/nasrinaiv0/movo/pull/144) | Squash-merged 2026-11-02 as `32fae1c`. | `api/_lib/messageText.js` reads GCash / Maya / bank SMS, email or Android notifications into income, expense or transfer with reference, date and account hint; OTPs and promos ignored and never stored; "Bank texts" Shortcut recipe. 362 tests. |
| [#141 — iOS phase 2](https://github.com/nasrinaiv0/movo/pull/141) | Merged 2026-11-02 as `8187aca`. | Sign-in through the system browser + `movo://auth-callback`, native storage mirror, local notifications, Face ID app lock, `movo://` links, native Liquid Glass top bar and dock (`GlassChrome.swift`), macOS 26 CI compile (`build-ios`). |
| [#139 — iOS phase 1](https://github.com/nasrinaiv0/movo/pull/139) | Merged 2026-11-02 as `51f55c4`. | Capacitor 8 iOS project (SPM, bundled, `com.nasrinai.movo`), `apiUrl()` / `appOrigin()`, CapacitorHttp; the website is unchanged. See `docs/IOS_APP.md`. |
| [#140](https://github.com/nasrinaiv0/movo/pull/140), [#138](https://github.com/nasrinaiv0/movo/pull/138) — Money Flow | Merged 2026-11-02 (`0541847`, `ed39c36`). | The last column is today; compact From/To fields with labels inside; legend colours match the bars. Production deploy of `ed39c36` READY. |
| [#137](https://github.com/nasrinaiv0/movo/pull/137), [#136](https://github.com/nasrinaiv0/movo/pull/136) — Categories | Merged 2026-11-02 (`d6725ab`, `6805489`). | 12 compact categories, 22 groups / 233 subcategories with stable ids; category icon badge on transaction rows. |
| [#133 — While you were away, card layout, badges, passwordless sign-in](https://github.com/nasrinaiv0/movo/pull/133) | Squash-merged 2026-11-02 as `3215631`. | Recent-logs popup and failed-automation inbox (migration `20261102020000`, not applied); automation matches the bank account; card faces per owner spec (landscape and vertical BPI reference); Pro/Max/Ultra streak badges with the MOVO mark; MOVO logo fallback; email-code + Google + Apple sign-in (no passwords). `verify` passed on the final head `ea0124e`; 61 suites / 337 tests locally. |
| [#132](https://github.com/nasrinaiv0/movo/pull/132), [#131](https://github.com/nasrinaiv0/movo/pull/131) — Card layout dimensions | Merged 2026-11-02. | Owner-approved card spec block in `App.css`; logo and name sizes later superseded by #133 at the owner's request. |
| [#130 — Automation, voice, adaptive CSS, card faces](https://github.com/nasrinaiv0/movo/pull/130) | Merged 2026-11-02 as `c99d94a`. | Automation sources and cross-source dedup (migration `20261102010000`, not applied), NasrinAI voice on iPhone, adaptive CSS audit, network marks. |
| [#127 — Bills & Payments](https://github.com/nasrinaiv0/movo/pull/127) | Merged 2026-11-01. | Bills tab and idempotent payments. Migration `20261101120000` **not applied** in production. Bill reminders (`reminderFor`) are computed but not wired. |
| [#126 — First-run welcome + import](https://github.com/nasrinaiv0/movo/pull/126) | Merged 2026-11-01. | Local CSV/JSON import; does not cover loans, receivables or bills. |
| [#80 — Tappable tiles, receipt scanner, rich replies](https://github.com/nasrinaiv0/movo/pull/80) | Merged 2026-10-31. | |
| [#42 — Accessible disabled cloud-auth guidance](https://github.com/nasrinaiv0/movo/pull/42) | Merged 2026-10-29. | The auth panel was later rebuilt as passwordless in #133; the disabled-state guidance is kept. |
| [#41 — NasrinAI financial-context consent](https://github.com/nasrinaiv0/movo/pull/41) | Closed without merge 2026-10-29. | |
| [#34 — Wallet validation and security status](https://github.com/nasrinaiv0/movo/pull/34) | Merged as `e43670bb56295e2fcf881b0c897d8d808b81bedc`. | Documentation refresh. Main CI [run 40852563341](https://github.com/nasrinaiv0/movo/actions/runs/40852563341) passed 13 suites / 76 tests, typecheck, and production build. Vercel production deployment `dpl_61HwBdJZwg1hpQZshMH8SB4uZr2p` is READY with `movo.nasrinai.com` attached. |
| [#33 — Wallet quick-action correction](https://github.com/nasrinaiv0/movo/pull/33) | Merged as `8fed594d571602c8d7f0cdca55afb286d47dabab`. | Replaced the duplicate Transfer action with Add Transaction. CI [run 40851881401](https://github.com/nasrinaiv0/movo/actions/runs/40851881401) passed 13 suites / 76 tests, typecheck, and production build; preview reached READY. |
| [#32 — Validated profile form](https://github.com/nasrinaiv0/movo/pull/32) | Merged as `782ac74568570ef27cc942f7e7a1bc5147ddd7a6`. | Profile editing now validates and saves browser-local fields; CI [run 40845667667](https://github.com/nasrinaiv0/movo/actions/runs/40845667667) passed 13 suites / 74 tests and build. |
| [#31 — Accessibility verification notes](https://github.com/nasrinaiv0/movo/pull/31) | Merged. | Documented disabled-setting accessibility and release limitations. |
| [#30 — Disabled-setting explanations](https://github.com/nasrinaiv0/movo/pull/30) | Merged. | Associated disabled settings with visible explanatory text for assistive technology; regression tests added. |
| [#29 — Inactive unsupported controls](https://github.com/nasrinaiv0/movo/pull/29) | Merged. | Unsupported card/issuer controls are disabled and explained. |
| [#28 — Frontend audit refresh](https://github.com/nasrinaiv0/movo/pull/28) | Merged. | Updated validation evidence and release blockers. |
| [#27 — Storage disclosure](https://github.com/nasrinaiv0/movo/pull/27) | Merged. | Corrected browser-local storage wording and related documentation/tests. |
| [#26 — Reconciled frontend/legal/finance implementation](https://github.com/nasrinaiv0/movo/pull/26) | Merged. | Combined frontend controls, legal/help flows, finance actions, accessibility, CSV hardening, and server-only NasrinAI mapping restrictions. |
| [#21 — NasrinAI upstream diagnostics](https://github.com/nasrinaiv0/movo/pull/21) | Merged. | Added safe upstream diagnostics. Production authentication still needs successful end-to-end verification. |
| [#20 — Authenticated NasrinAI integration](https://github.com/nasrinaiv0/movo/pull/20) | Merged. | Server-side chat proxy, user-scoped context/history, consent enforcement, and server-only upstream mapping. A production upstream HTTP 401 remains unresolved. |

## Closed without merge / superseded

| PR | Disposition |
|---|---|
| [#19 — Functional finance core](https://github.com/nasrinaiv0/movo/pull/19) | Closed without merge after reconciliation; useful local finance persistence, editing, transfer validation, CSV import/export, and regression coverage were carried forward into the reconciled frontend work. |
| [#23 — Earlier frontend completion](https://github.com/nasrinaiv0/movo/pull/23) | Closed without merge; superseded by the reconciled PR #26 and follow-up fixes. |
| [#22 — Earlier legal/help pages](https://github.com/nasrinaiv0/movo/pull/22) | Closed without merge; legal/help functionality was consolidated into the in-app Legal and Help Center screens to avoid duplicate policy sources. |
| [#12 and #13 — Reference UI / notification parity](https://github.com/nasrinaiv0/movo/pull/12) | Closed without merge; superseded by the later merged responsive frontend and notification implementations. |
| [#41 — NasrinAI financial-context consent](https://github.com/nasrinaiv0/movo/pull/41) | Closed without merge on 2026-10-29; the consent disclosure in the chat was reworked in later merged chat changes. |

## Current release blockers

These are not resolved by a green frontend CI run or a READY deployment:

- **Legal:** Terms of Service and Privacy Policy published as final on 2026-11-03 by owner decision (effective 2026-11-03). The operator is identified as the MOVO service team with the support@nasrinai.com contact; no legal name or registered address is shown. The publication warning was removed.
- **Email sign-in codes (2026-11-02):** Supabase Auth logs show every `/otp` request since 16:02 UTC failing with SMTP
  `535 "Authentication credentials invalid"`. The custom SMTP credentials in Authentication → Emails → SMTP Settings
  need correcting by the owner, so codes are not delivered until then. Google sign-in works. Apple fails with
  `provider is not enabled`.
- **iOS app:** phases 1–3 are merged (`docs/IOS_APP.md`). Phase 4 (Codemagic signing, TestFlight) and phase 5
  (device testing, App Store submission) need the owner's Apple Developer Program membership, App Store Connect API
  key and Codemagic account. The look of the native Liquid Glass bars is unverified on a device.
- **Database hardening:** the Supabase advisor findings above are not yet fixed (a proposed migration needs approval).
- **Supabase Auth (sign-in is passwordless since #133):**
  - Paste the MOVO code email (with `{{ .Token }}`) into the Magic Link and Confirm signup templates.
  - Enable the Apple provider (Services ID, Team ID, Key ID, private key).
  - Allow `https://movo.nasrinai.com/**` and `movo://auth-callback` as redirect URLs. Leaked-password protection still matters only for older accounts that had a password; enable it through authorized project settings: [Supabase password-security guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- **Dependencies:** Latest main CI install reports 34 npm audit findings (16 low, 5 moderate, 13 high). Review advisories and use targeted upgrades with regression tests rather than a blind forced upgrade.
- **NasrinAI chat:** Production logs on 2026-10-29 showed upstream HTTP 401 responses (last observed 2026-10-29T05:42:54Z). Not re-checked since; a successful authenticated production chat request is still unconfirmed. Never expose or log credential values.
- **Interactive verification:** Full browser smoke tests on the production custom domain, including mobile, auth, consent, financial writes, CSV flows, and keyboard/focus behavior, remain unverified. Phone automations (Siri Shortcut, Apple Pay, Android voice) and NasrinAI voice chat have not been tested on a real device.
- **Data isolation:** Read-only production catalog checks confirm RLS enabled on profiles, financial accounts, transactions, budgets, and NasrinAI chat tables. Owner-scoped policies are present; the upstream mapping intentionally has no browser policy/grants and remains server-only.

## Required PR lifecycle

1. Review open PRs before starting duplicate work; update an existing branch when scopes overlap.
2. Use a dedicated branch and keep the PR summary, known limitations, and progress evidence current.
3. Run typecheck, the complete test suite, production build, and relevant security/data-isolation checks on the exact head SHA.
4. Verify the preview deployment for that exact SHA. A canceled/ignored Vercel build is not successful verification.
5. Merge only after checks pass and the PR is conflict-free. Verify the merge commit and resulting deployment separately.
6. Never include secrets, credentials, private financial data, or unverifiable legal details in code or documentation.


## Latest current-main snapshot — 2026-10-30 09:35 Asia/Manila

- **Main / production:** `277051e4ec2216a6b598c784a50b32ba37b89dee`; deployment [dpl_FRVNFKYmKHcrhnfvF8uhi7fwELVh](https://vercel.com/nasrin-ai/movo/FRVNFKYmKHcrhnfvF8uhi7fwELVh) READY.
- **Merged:** PR #57 (production dependency audit gate; 0 production dependency vulnerabilities) and PR #59 (generic demo identity, visible fictional sample-data notice, functional Sign in CTA). Production Playwright verified 200, no owner-like demo identity, responsive 390px layout, consent/legal navigation and no browser errors. Preview smoke exercised Home, Wallet, Transactions, NasrinAI, Profile, Settings, Notifications, and Search/Escape.
- **PR #56:** still draft; exact head `36c486424a2f37591edb13d5a43936140515e217`; Actions [40985264768](https://github.com/nasrinaiv0/movo/actions/runs/40985264768) passed 18 suites / 101 tests, typecheck, production audit and build; preview READY. Authenticated scoped request and unrelated-document canary remain unverified. Keep issue #47 open.
- **PR #55:** still draft and currently not mergeable against current main; reconcile with the merged demo disclosure before considering merge. **PR #43 / #52:** still draft; authenticated finance/chart validation remains outstanding. PR #58 is the documentation reconciliation branch.
- **Security:** RLS enabled on the seven checked tables; 22 owner-scoped policies across six user-facing tables; no checked anon/PUBLIC grants; upstream mapping remains server-only. Supabase leaked-password protection remains disabled. Full npm tree still reports 34 findings (16 low, 5 moderate, 13 high), while production-only audit is clean.
- **Legal:** Terms and Privacy pages and consent links were browser-verified, but publication warning remains until operator/controller identity/address, actual retention/deletion periods, providers/data recipients and jurisdiction-specific wording are confirmed.
- **Production chat:** no-token POST returns 401 `sign_in_required`. This is an auth-gate check, not proof of authenticated MOVO context isolation. Protected preview SSO prevented the exact-head scoped POST/canary test.
- Full detailed snapshot: `docs/engineering/updates/2026-10-30-0935-production-demo-disclosure-and-chat-checks.md`.


## Current main and release-gate snapshot — 2026-10-30 10:10 Asia/Manila

- **Main:** `ca1a680c78baf7c87347c960d56c7bc207041bc3`. PR #58 is merged (not open).
- **Production app:** PR #59 merged as `277051e4ec2216a6b598c784a50b32ba37b89dee`; Vercel deployment [dpl_FRVNFKYmKHcrhnfvF8uhi7fwELVh](https://vercel.com/nasrin-ai/movo/FRVNFKYmKHcrhnfvF8uhi7fwELVh) READY. Demo now uses generic identity and a fictional sample-data notice. Production Playwright smoke evidence is recorded in the 09:35 audit delta; not rerun in the 10:10 pass.
- **PR #60:** open/draft, head `d80077b05067282fa76de16e7947aa73557e7550`, 23 ahead / 0 behind. Exact-head run [40989633601](https://github.com/nasrinaiv0/movo/actions/runs/40989633601) passed 20 suites / 111 tests, typecheck, `audit:controls`, build and production-only audit; preview check succeeded. Manual accessibility and authenticated finance tests remain open.
- **PR #56:** open/draft, head `30aaaf0fedb50e7b73bb36f285c5b744247a2c0c`, 19 ahead / 0 behind. Current run [40990086352](https://github.com/nasrinaiv0/movo/actions/runs/40990086352) was in progress at 10:10; Vercel status succeeded. Do not reuse older run #40989833432 as validation for this exact head.
- **Issue #47:** open until authenticated scoped POST and unrelated-project canary prove isolation across retrieval, provider prompt, response, transcript, caches and logs. A no-token 401 is not sufficient.
- **Security/legal:** full dependency tree still has 34 findings (16 low, 5 moderate, 13 high); production-only audit reports zero. Supabase leaked-password protection remains reported disabled. Legal publication warning remains.
- Detailed update: `docs/engineering/updates/2026-10-30-1010-monitoring-delta.md`.



### Exact-head follow-up — 2026-10-30 10:11 Asia/Manila

- PR #56 head `30aaaf0fedb50e7b73bb36f285c5b744247a2c0c`: run [40990086352](https://github.com/nasrinaiv0/movo/actions/runs/40990086352) completed successfully; 18 suites / 103 tests, typecheck, production-only audit (0 vulnerabilities), and production build passed. Vercel check [CaaFALv6sPd7vWa1xRFqUwDRiHh2](https://vercel.com/nasrin-ai/movo/CaaFALv6sPd7vWa1xRFqUwDRiHh2) is successful.
- Full install still reports 34 findings (16 low, 5 moderate, 13 high), plus glob/eslint and Node.js 20 action deprecation warnings.
- Context-isolation release gate remains open: no authenticated scoped POST and unrelated-project canary evidence yet.


## 2026-10-30 10:35 Asia/Manila — branch protection/release-control audit
- Main branch API reports protected=false, required status checks enforcement off, and no configured contexts/checks; repository rulesets endpoint returned []. External organization/user-level policy was not separately verified.
- No new app merge/deployment since the previous checkpoint. Main's latest commit ca1a680c78baf7c87347c960d56c7bc207041bc3 is documentation-only; production app deployment remains READY at 277051e4ec2216a6b598c784a50b32ba37b89dee.
- PR #61 exact-head CI #40990360004 passed and preview dpl_DgProVYtiyPMD7ZQEndJt1b9Zhjh is READY. PR remains draft/unmerged.
- PR #56 exact-head CI #40990086352 passed (18 suites/103 tests), but authenticated context isolation remains unverified. PR #60 exact-head CI #40989633601 passed (20 suites/111 tests), but manual accessibility checks remain open. PR #52 exact-head run #40988481343 passed (18 suites/101 tests), but authorized finance-data chart verification remains open.
- Full dependency tree still reports 34 findings (16 low, 5 moderate, 13 high); production-only audit reports 0. Keep scopes distinct.
- Detail: docs/engineering/updates/2026-10-30-1035-branch-protection-and-release-control.md. No code/settings/deployments changed.

## Monitoring checkpoint — 2026-10-30 11:14 Asia/Manila

- **Current main:** `815ab66919894b271b90a5b1570b2fae949406c9`. PR #61 (documentation-only audit refresh) is merged. Current main's production deployment is READY; no new application code was merged by #61.
- **PR #43 finance:** current head `600c49ab9f1b5cb0e0034afe59d00fdbd4a0d6dc`, 17 ahead / 0 behind main, open/draft/mergeable. The profile currency correction is validated: code/test head `5308948502127be913921522b598693feb21e533` passed Actions #40996734432; the latest docs head passed Actions #40997019508. Both runs passed 20 suites / 118 tests, typecheck, production-only audit (0 vulnerabilities), and production build. Latest preview dpl_FxojvcDKrnLv1rQJC1HfewT6mJwy is READY. Authenticated cloud finance/CSV/currency-isolation checks remain open.
- **PR #52 charts:** current head `64cfa5b9e746b249a07735ae934badcb7d842610`, 7 ahead / 0 behind main, open/draft/mergeable. Exact-head Actions #40996821611 passed 18 suites / 101 tests, typecheck, production-only audit (0 vulnerabilities), and build. Preview dpl_HkwPPhisFzvU6MqLCW5uXvXvKmMF is READY; root returned HTTP 200. Authenticated chart-data verification remains open.
- **PR #56 context isolation/legal copy:** current head `337332bea5cabd533447e0913503b188794bca8e`, 20 ahead / 0 behind main, open/draft/mergeable. Exact-head Actions #40996840860 passed 18 suites / 103 tests, typecheck, production-only audit (0 vulnerabilities), and build. Preview dpl_9t1ykdVhWkhHxLanDZK2xFnh33Wp is READY; root returned HTTP 200. Authenticated live scoped POST and unrelated-project canary remain unverified; issue #47 stays open.
- **PR #60 UI controls/accessibility:** current head `015c35d041972080249e0bc71a6114bbbc4e6e19`, 24 ahead / 0 behind main, open/draft/mergeable. Exact-head Actions #40996861622 passed 20 suites / 111 tests, typecheck, `audit:controls`, production-only audit (0 vulnerabilities), and build. Preview dpl_3zM4sjjSTbQbTkrGuv9sTPZ9pnJp is READY; root returned HTTP 200. Keyboard-only/focus, screen-reader, responsive, and authenticated finance-flow checks remain open.
- **Fresh MOVO Supabase catalog check:** RLS enabled on all 7 checked tables; 22 policies across the six user-facing tables all reference `auth.uid()`; no `anon`/`PUBLIC` grants on the checked set; upstream-conversation mapping has no policies and no `authenticated` grants, with grants restricted to `service_role`.
- **Security carry-forward:** Supabase Security Advisor still reports leaked-password protection disabled. The available Supabase tools expose no Auth configuration write action, so no setting was changed. Full dependency tree still reports 34 findings (16 low, 5 moderate, 13 high); production-only audit reports 0. These are distinct scopes.
- **Legal:** PR #56 carries separate Terms/Privacy effective dates and corrected Privacy Policy wording. It is not merged, so production does not yet contain that revision. Publication warning must remain until formal operator/controller identity/address, verified retention/deletion schedule, provider/data-recipient disclosures, and jurisdiction-specific wording are confirmed.
- **Validation boundary:** all four open application PRs have passing exact-head automated checks and READY previews, but none is fully release-verified. No authenticated finance CRUD/CSV, chart provenance, live upstream scope canary, or manual accessibility session was completed in this checkpoint. The Vercel protected fetch attempt was blocked before reaching the app endpoint and is not application API evidence.
- **Data/security boundary:** no database schema, RLS/grants, production financial records, Auth settings, provider secrets, or separate NasrinAI repository were changed.

## Post-merge checkpoint — NasrinAI disclosure hotfix — 2026-10-30 11:30 Asia/Manila

- **PR #63 merged** as `1df043bcc54d59bee16fce806b601e09d647b06e`. Exact-head Actions #40997576900 passed 17 suites / 95 tests, TypeScript typecheck, production-only audit (0 vulnerabilities), and production build. Preview was READY and the served bundle had the new caveat.
- **Production verified:** deployment dpl_CoSq9dcgCG2qVbCkm1BBSeRU2r1U is READY at the merged commit; root returned HTTP 200. The production JS bundle contains “Important privacy limitation” and the explicit upstream-boundary warning, contains the October 30, 2026 Privacy Policy date, and no longer contains “Your account stays isolated.”
- **Important scope distinction:** this corrects misleading copy; it does not prove the full upstream context boundary. Issue #47 stays open until authenticated scoped POST and unrelated-project canary evidence is recorded.
- **Current application PR heads after reconciliation:** #43 `d6f2fcd40ad9c5438e031400dd5120d77272bec0` (20 suites / 118 tests); #52 `4b645666108174f31d4875d0da063bd8fe1c0170` (18 / 101); #56 `06b5680b069ce17b75b9e2d63e3e0904bdda703e` (18 / 103); #60 `43087d907be095ef42d8fbcd7b8d9b2cc6723662` (20 / 111). All exact-head Actions runs passed, Vercel previews are READY, and preview root requests returned HTTP 200. All remain drafts due the authenticated/manual gates below.
- **Finance gates:** authenticated cloud CRUD, CSV import/export, and owner-scoped currency isolation remain unverified; chart data provenance against authorized records remains unverified.
- **Accessibility gates:** keyboard-only/focus, screen-reader, responsive interaction, and complete live-control behavior remain unverified. Static `audit:controls` does not replace these checks.
- **Fresh Supabase catalog check:** 7 checked tables have RLS enabled; all 22 policies on six user-facing tables reference `auth.uid()`; no checked `anon`/`PUBLIC` grants; upstream mapping has no policies or authenticated grants and remains service-role-only. Security Advisor still reports leaked-password protection disabled; no Auth write action was available.
- **Governance/dependencies/legal:** main still reports unprotected with no repository rulesets (rechecked after PR #63); full dependency tree has 34 findings (16 low, 5 moderate, 13 high), distinct from zero production-only findings. Legal publication warning remains until operator/controller identity/address, retention/deletion schedule, provider/data-recipient disclosures, and jurisdiction review are confirmed.
- No database schema/RLS/grants, production financial records, Auth settings, or secrets changed.


## Post-disclosure monitoring checkpoint — 2026-10-30 12:06 Asia/Manila

- **Main / production:** current main `9438e7c01c916a6b27f62e026fe9b4a4f6952f94`; Vercel production deployment [dpl_3kHKpwFatSAawrVCtU19XNEECR3E](https://vercel.com/nasrin-ai/movo/3kHKpwFatSAawrVCtU19XNEECR3E) is READY at the same SHA.
- **PR #63 merged:** [`1df043bcc54d59bee16fce806b601e09d647b06e`](https://github.com/nasrinaiv0/movo/pull/63). Removed unverified absolute isolation claim, disclosed that upstream boundary is not independently verified, advised against real/highly sensitive financial details, and corrected Terms/Privacy effective dates. Exact-head CI #40997576900 passed 17 suites / 95 tests, typecheck, production-only audit (0), build. Recorded production bundle smoke verified caveat/date and absence of old claim.
- **PR #64 merged:** documentation-only audit reconciliation at `9438e7c...`; paths: progress register, Claude handoff, master ledger, and dated disclosure-hotfix evidence.
- **Current application heads:** #43 `ad532e1df7ca14a0c0aebe0244d7b82d2bb0578e` — CI #41000693424, 20 suites / 125 tests, preview READY; #52 `78b776497c8125f1637b2fb601965c1cc94e9b03` — CI #40999382232, 18 / 101, preview READY; #56 `15e112149bf70b6ee1f141365a4b9ed9ffb9e6e5` — CI #40999433274, 18 / 103, preview READY; #60 `12ba5b3b45065949626e3ecf49a777b9de44387b` — CI #41000977707, 20 / 112, typecheck + `audit:controls`, preview READY. All four remain open/draft.
- **Security:** each latest checked install log reports 34 full-tree dependency findings (16 low, 5 moderate, 13 high), while production-only audit reports 0. Fresh merged ledger evidence: 7/7 checked tables RLS enabled; 22/22 user-facing policies reference `auth.uid()`; no checked anon/PUBLIC grants; upstream mapping remains service-role-only. Leaked-password protection remains disabled; main branch protection/rulesets remain absent.
- **Do not overclaim:** PR #63 is a disclosure correction, not a fix for issue #47. Authenticated scoped POST/canary, finance CRUD/CSV/currency isolation, chart provenance, manual accessibility, legal publication facts, leaked-password protection, branch governance and full-tree dependency remediation remain open.


## 2026-10-30 12:52 Asia/Manila — latest implementation follow-up

- [PR #56](https://github.com/nasrinaiv0/movo/pull/56): added missing/blank upstream-key fail-closed guard and regression test. Exact-head CI [41004999162](https://github.com/nasrinaiv0/movo/actions/runs/41004999162): 18 suites / 104 tests, typecheck, production-only audit (0), build passed; Vercel preview READY/root 200. Authenticated scope canary still unverified; historical upstream 401 requires authorized credential remediation.
- [PR #60](https://github.com/nasrinaiv0/movo/pull/60): added tests for disabled/explained unsupported settings and functional In-App Alerts. Exact-head CI [41005003149](https://github.com/nasrinaiv0/movo/actions/runs/41005003149): 20 suites / 113 tests, typecheck, `audit:controls`, production-only audit (0), build passed; Vercel preview READY/root 200.
- Full dependency tree still has 34 findings (16 low, 5 moderate, 13 high); leaked-password protection, branch governance, legal publication facts, authenticated finance/chart checks, and manual accessibility remain open.
- Detailed trace: `docs/engineering/updates/2026-10-30-1252-frontend-hardening.md`.


## Fresh Supabase read-only security recheck — 2026-10-30 12:54 Asia/Manila

- Catalog query: RLS is enabled on **7/7 checked public tables**: profiles, financial_accounts, transactions, budgets, movo_ai_conversations, movo_ai_messages, and movo_ai_upstream_conversations.
- The six user-facing tables have **22 policies**; each checked policy expression references `auth.uid()`. The upstream mapping has no client policy.
- `information_schema.role_table_grants` returned **73 grants** for `authenticated` and `service_role` across the checked tables, with **no `anon` or `PUBLIC` grants** in the checked set. The upstream mapping grants are limited to `service_role`; do not add a client policy/grant.
- Fresh Security Advisor findings: `auth_leaked_password_protection` remains WARN (disabled); `rls_enabled_no_policy` for the server-only upstream mapping remains INFO and intentional. Performance Advisor reports seven unused indexes; no index was dropped without query evidence.
- This was a read-only metadata/advisor check. No schema, RLS policy, grant, Auth setting, financial row, or secret was changed.

## PR #60 notification-settings accessibility regression — 2026-10-30 13:02 Asia/Manila

- Current PR #60 head: `8005fbc695c5a8f30f2817e99b3fb8226ea1a429`, reconciled with current `main`.
- Added regression coverage for unsupported Push/Email delivery and demo-only Account & Security, NasrinAI Updates, Promotions, and Reports. Each disabled switch must expose a visible explanation through `aria-describedby`. In-App Alerts and the Transactions category remain interactive and must call the preference handler.
- Updated the disabled-category descriptions to explicitly say that live delivery is not connected and sample/demo alerts only.
- The first attempt at `776b9af8d955f220406f48dbc7f573950ae89380` failed (1 failed / 113 passed) because the visible explanation did not match the test's sample/demo expectation. The source-only follow-up `02155f4501f56d8b7fa2fb79143af33730dc28a1` still failed against the stale assertion. The test was corrected at `9c38028cbf3a11675f16db09d0fb41190fd5f71d`; latest branch reconciliation is `8005fbc695c5a8f30f2817e99b3fb8226ea1a429`.
- Exact-head GitHub Actions run [41006039735](https://github.com/nasrinaiv0/movo/actions/runs/41006039735) passed: **20 suites / 114 tests**, TypeScript typecheck, production-only npm audit (**0 production vulnerabilities**), `audit:controls`, and production build.
- Exact-head Vercel preview [dpl_EYB99rVuHay4i4MA3QfH9WKueW7X](https://vercel.com/nasrin-ai/movo/EYB99rVuHay4i4MA3QfH9WKueW7X) is READY; preview root and JavaScript bundle returned HTTP 200, and the four explicit demo-only descriptions were present in the deployed bundle.
- The full dependency tree still reports **34 findings (16 low, 5 moderate, 13 high)**. No dependency changes were made. The previous production-only audit passed on this exact head.
- **Not release-complete:** interactive keyboard/focus, screen-reader, responsive, and authenticated finance/CSV/currency flows remain unverified. PR #60 remains draft.
- No database schema, RLS/grants, Auth setting, financial record, provider secret, or separate repository was changed.

## PR #52 current-main reconciliation — 2026-10-30 13:10 Asia/Manila

- Code/test head before reconciliation: `78b776497c8125f1637b2fb601965c1cc94e9b03`.
- Exact-head Actions run [40999382232](https://github.com/nasrinaiv0/movo/actions/runs/40999382232) passed **18 suites / 101 tests**, TypeScript typecheck, production-only npm audit (**0 production vulnerabilities**), and production build.
- Exact-head preview [dpl_76bUJdnfATaWSKRof8z33HKyZXzu](https://vercel.com/nasrin-ai/movo/76bUJdnfATaWSKRof8z33HKyZXzu) is READY; root returned HTTP 200.
- Chart formatting and data validation preserve currency-specific labels and summaries, validate values before rendering, and avoid combining unlike currencies without an exchange rate.
- This main reconciliation is documentation-only. Chart values/provenance still require verification against authenticated, authorized financial records; keep draft until that end-to-end check passes.
- No database schema, RLS/grants, Auth setting, financial record, provider secret, or other repository was changed.

## Phone automation sources and cross-source dedup — 2026-11-02 Asia/Manila
- **Found:** production `transactions_source_check` (verified read-only) rejects `applepay`/`googlepay`/`bank`, so every source-aware automation insert from PR #123's function failed; production holds 0 automation transactions. Request dedup was per device key and per source only, so Apple Pay + bank alert (or two devices) logged the same purchase twice. The in-app link path saved everything as `notification`.
- **Changed:** migration `20261102010000_automation_sources_and_cross_source_dedup.sql` (wider source allowlist incl. `siri_shortcut`/`android_assistant`, event `source`/`outcome`, `log_automation_transaction_v2` with cross-source matching and per-user lock); `api/log.js` (v2, income, currency, category, Siri/Android `text` parsing via `api/_lib/voice.js`, safe error mapping, rollout fallback); client keeps real sources (`src/lib/transactionSources.js`, `financeRepository.js`, `App.js`); Siri voice prompt; 83 more institutions with curated favicon domains.
- **Verified:** Jest 318/318; `tsc`; strict build; `supabase/tests/automation_dedup.test.sql` plus the existing SQL tests on a local Postgres 16 copy of all migrations (bug reproduced before the migration; mutation of the dedup rule makes the test fail).
- **Not done:** migration not applied to production (needs owner confirmation); no physical iPhone/Android test; Android relies on third-party automation apps (no native app/App Actions).


## Unified MOVO automation prompts — 2026-11-03

- Branch: `feat/unified-automation-shortcut-prompts`.
- Added interactive and hands-free bank notification recipe variants; interactive Siri confirmation variant; retained Apple Pay automatic/interactive recipes.
- Added prompt safety requirements for server-confirmed success, non-financial notification filtering, no fabricated transaction details, and no POST on Skip.
- Added regression tests for the new recipe variants and updated Siri progress documentation.
- Pending: exact-head CI/typecheck/build, review of the shared-preference wiring, actual iPhone trigger-variable validation and While You Were Away end-to-end test. No Supabase migration, production data change, deployment or merge performed.


## Crypto portfolio implementation — 2026-11-04 Asia/Manila

- Branch: `feat/live-fx-crypto-markets` (existing PR #177).
- Added manual holding records with asset, quantity, quote currency, acquisition date and optional average acquisition price. Supports separate position records, edit and remove.
- Added responsive portfolio view matching MOVO's existing card surfaces, accent tokens, rounded controls, muted labels, tab switcher and compact position rows. Portfolio summary shows total value, cost basis and unrealized P/L only when inputs and provider prices support a valid same-quote calculation.
- Holdings are persisted under `cryptoHoldings` in MOVO preferences and merged by stable ID across local/signed-in preference copies. They are not written to cash accounts, transactions, income or expenses. No Supabase migration/RLS change is required for this preference-backed implementation.
- Added validation/valuation helper and unit tests for invalid quantities/costs, quote mismatch, missing market prices, unknown cost basis and ID upsert.
- No implicit FX conversion is performed. Portfolio values are reference estimates, not exchange execution quotes. Exchange/wallet integrations, fees, realized P/L and custody/trading remain out of scope.
- Validation on the new head is pending GitHub Actions; live Vercel preview and device smoke testing are still required.


## Crypto portfolio implementation — 2026-11-04

- Added manual crypto holding records with validated asset IDs, positive quantities, optional non-negative average acquisition price, quote currency, and stable IDs. Added edit/remove and portfolio valuation/unrealized P/L helpers with regression tests.
- Added a Market / Portfolio switch, premium responsive overview and holdings cards, add/edit form, empty state, and explicit data/cash-separation disclosures. Portfolio values use only matching quote-currency market prices; missing or incompatible prices and unknown cost basis are shown as unavailable rather than estimated.
- Added `cryptoHoldings` to preference defaults and ID-based preference merging so holdings persist across signed-in preference sync and local-only use. No Supabase migration or new financial-account/transaction rows are used; crypto remains outside cash, income, expense and net-worth accounting totals.
- Exact-head CI [41745638862](https://github.com/nasrinaiv0/movo/actions/runs/41745638862) failed at translation catalogue coverage because the new accessible tab label “Crypto sections” was not in the English-first exclusion set. Production audit (0), typecheck passed; test/build stages were skipped by fail-fast. Added the missing label to `scripts/i18n-extract.js` in commit 8de5520. Re-run exact-head CI is pending.
- Vercel preview remains unverified: the prior Vercel commit status was canceled by an ignored build step; do not treat this as a successful deployment. Keep PR #177 open and do not merge until exact-head CI and a real preview smoke test pass.


2026-11-04 — Crypto API routing fix: `src/lib/crypto.js` now uses the shared `apiUrl()` helper. This is important for the Capacitor iOS app, where a relative `/api/crypto` URL would resolve against the bundled `capacitor://localhost` origin rather than MOVO production. Commit `5583368`. The market still requires `COINPAPRIKA_API_KEY` configured in Vercel; verify the production endpoint and preview after that server-side setting is present.


## Crypto market provider outage follow-up — 2026-11-04
- Confirmed PR #179 is merged; native iOS market requests now route through the production MOVO API.
- The production proxy intentionally returns HTTP 503 when `COINPAPRIKA_API_KEY` is absent. It uses CoinPaprika's paid REST host and does not silently fall back to the keyless personal-use endpoint.
- Follow-up adds actionable, non-secret configuration guidance and regression coverage for missing credentials, paid-host selection, server-only Authorization handling, provider rate limits, and invalid actions.
- **External release gate:** configure the licensed CoinPaprika credential as Vercel's server-only `COINPAPRIKA_API_KEY` for the MOVO production project and redeploy. Do not use the free personal-use endpoint for MOVO's commercial/customer-facing market display. No credential was added to source control.
- Live production response and physical iOS verification remain pending; automated CI alone is not proof that the market feed is live.

## 2026-11-06 — Sandbox recovery, financial accuracy and adaptive UI

- Recovered unpushed sandbox commit `7ab3ad7` onto current main `a1c6fd9`; preserved commercial-readiness changes.
- Fixed shared bank/debit ledgers, posted transaction filtering, credit payment duplication, separate estimated interest, cross-currency plan allocation totals and cent-safe sums. Monetary labels always display two decimal places, including summaries and Cryptocurrency.
- Added Pay/Edit/Delete loan actions; deletion archives the obligation and preserves recorded payments/account balances.
- Compacted reminder, Financial Planning and Cryptocurrency layouts; removed duplicate watchlist; made header buttons 45px circles and action/filter labels monochrome with theme-aware contrast.
- Validation in Vercel Sandbox: actual React component fixtures with synthetic data, 36 screen/width/theme combinations (320/390/430px, light/dark, green/orange); no page/dialog overflow; header dimensions checked; screenshots reviewed. Store-table SQL privilege assertions passed in isolated PostgreSQL 18. Full production build and exact head test results are recorded in the PR.
- Store checkout remains disabled until credentials, database migration and signed-device purchase/refund/restore tests are complete. Native store tests use mocked SDK responses; no customer payment was made. New release copy currently has English fallbacks pending native-language review.
- PR175 was rechecked: closed without merging on 5 November; its historical audit follow-up remains documented. No other open PR was returned at publication time. No production database data was modified.


## 2026-11-06 — Production accounting and commercial blocker remediation
- Branch fix/release-accounting-security-20261106, base main 703f31f. Release NOT CLEARED.
- Fixed truncated account ledger/posting/activity fetches, pending versus posted balance treatment, missing exchange-rate behavior, and non-finite currency formatting.
- Added public Terms and Privacy standalone HTML and Vercel routes; existing account deletion page retained. Legal review required before store publication.
- Applied additive store entitlement persistence migration to live Supabase with RLS and minimal grants; store billing remains disabled pending official test purchases and server credentials.
- Required change documentation per code-containing commit: update this file plus docs/engineering/updates/ dated record. GitHub CI enforces this, template updated.
- Vercel Sandbox 619/619 initial full tests, 110 suites, typecheck, build, production-only dependency audit successful; final PR head to be reverified.
- Remaining blockers: actual Apple/Google billing sandbox verification and native signed builds, permission/tenancy security testing, snapshot-consistent finance projections, booked FX policy, legal approval.
- Detailed evidence/rollback: docs/engineering/updates/2026-11-06-financial-commercial-remediation.md

- Policy expansion: canonical English Terms/Privacy supplements shared with static pages and in-app view, November 6 effective date, sync regression tests; reviewed legal translation/operator disclosure remains a release gate.

- Legal navigation regression expectation updated for November 6 policy date; tested as part of the same code/documentation commit.

- CI dependency follow-up (PR #226): the lockfile generated under npm 11 was rejected by the GitHub runner npm 10 because of an npm-version-specific optional yaml peer dependency. Pinned npm 11.19.1 for the CI install to match the validated lockfile; no dependency/lockfile change or financial-data write.

- PR #226 exact-head CI caught a missing in-app Legal screen change in the initial Git tree; restored src/screens/Legal.js (November 6 effective date and canonical supplements) in the same commit as this update and the dated engineering note. Retest before merging.


## PR #225 — Wallet/Transactions adaptive icons, compact summary and billing-cycle dues (2026-11-06)
- Base: refreshed to main 9c423c71. Scope: Wallet edit and Transactions quick-action SVGs use adaptive accent ink; compact Total Spent card aligns comparison with month axis.
- Bills/Financial Planning: overdue unpaid obligations plus one current billing cycle per bill; future periods are not counted as currently due; duplicate occurrences do not inflate totals. No ledger data is changed.
- Regressions: cycle/deduplication/cents and icon rendering tests, plus all 11 locale outputs. Source documentation: docs/engineering/2026-11-06-wallet-transactions-compact-summary.md.
- Validation: initial Vercel Sandbox 108 suites / 618 tests, typecheck, production build passed; deployment/preview requires separate verification. PR remains open.


## PR #225 — Mascot bubble text-link border follow-up (2026-11-06)
- In the Home header, exempt only `Change mascot` (`.ram-bubble-link`) from MOVO's global 0.25px button hairline; preserve accent color, callback, keyboard focus and card panels.
- Added `RamMascot.test.js` regression and updated the detailed engineering documentation alongside this code change.
- Vercel Sandbox: 108 suites / 619 tests, typecheck and build passed before rebasing. Live PR CI/preview must verify the rebased revision.


## PR #225 — Empty-only record surfaces across MOVO (2026-11-06)
- Removed decorative horizontal background/border/shadow on **empty-only** record lists: Scheduled payments/transfers, overdue obligations, reminders, Cashback lists and other empty-single-paragraph cards.
- CSS limits selection to direct empty children or empty categories; populated cards, buttons, charts and onboarding CTAs retain their styling. Truly empty list cards render no blank capsule. No changes to financial calculations or storage.
- Regression test: `EmptyRecordSurfaces.test.js`; full Vercel Sandbox 109 suites / 622 tests plus TypeScript check and production build passed. Rebased exact-head CI and preview validation remain the merge gates.


## PR #225 — Consistent headers, legal spacing and Vercel-configured social profiles (2026-11-06)
- Root and back-navigation headers use 10px upper/lower internal padding with 10px bottom separation. Home mascot/header row is more compact while retaining 45px actions and safe-area spacing.
- Terms, Privacy and Help Center share 14px section gaps, including canonical supplemental policy sections; adjusted sticky fade and bottom scroll clearance for fixed navigation.
- Added a compact social logo row after each of those pages, shown only for valid links from Vercel server environment variables through \`/api/social-links\`. No fake profiles or client-side embedded links.
- Changed files, new security/API and rendering tests, translations and documentation are committed together with a dated engineering update, as required by MOVO CI. No finance/ledger or policy wording changes.
- Sandbox tests and GitHub exact-head CI required before merging. Vercel preview can be canceled by ignored-build setting and must not be assumed verified.

- Social-env deployment clarification: setting or editing MOVO social profile URLs in Vercel Project Settings requires a new deployment, because previously deployed functions retain their old environment. Links remain hidden until a valid URL is present in the running deployment. Cached public profile output may take up to five minutes to refresh.


## PR #225 — Equal header button insets and responsive action groups (2026-11-06)
- Home Search/Bell/Settings capsule and the shared root-screen utility capsule now use symmetric 5px interior padding, 4px inter-button gaps and 45px circles with centered 22px icons. This preserves theme-specific icon colors, notifications dots and selection backgrounds.
- Separately grouped Plus controls stay outside their utility capsule with 8px header spacing. On screens narrower than 360px, the Home action pill moves to its own right-aligned grid row rather than clipping the greeting or shrinking 45px hit targets.
- Additional regression coverage in src/components/HeaderButtonSpacing.test.js checks equal geometry, responsive grid and real button callbacks. No financial, legal or social-link runtime calculations change.
- Previous Vercel env redeployment documentation correction and this change are documented in dated notes and verified against the exact PR head.


## PR #225 — Chat status, solid More icon, and edge-to-edge Google favicons (2026-11-06)
- Removed chat status pill and green badge background, leaving only the animated NasrinAI dot mark in adaptive accent and accessible progress text.
- Replaced outlined More dots with three solid currentColor dots.
- Eliminated CSS padding/percentage insets from Google S2 fetched favicons, scoped to true images and matching catalog wrapper; restored full logo area in account, transaction, subscriptions, crypto and stocks lists while leaving other images intact.
- New ChatMoreFavicons.test.js regression coverage. Engineering update: docs/engineering/updates/2026-11-06-pr225-chat-more-favicons.md. Require full GitHub CI and sandbox build at this commit before merging.


## PR #228 — Borderless controls across all MOVO screens (2026-11-07)
- Eliminated visual borders and faux inset-shadow outlines on buttons, tabs, calendar days, clickable rows, action links, header controls and bottom navigation in light and dark appearances.
- Corrected the global `border-width: var(--hair) !important` selector to exclude controls and their pseudo-elements. The final control policy outranks legacy high-specificity button border declarations; structural card/panel/field boundaries and keyboard focus-visible outlines are preserved.
- Vercel Sandbox verification: 117 suites / 656 tests passing, TypeScript check and production React build successful; headless Chromium computed-style audits found zero button-border violations on Home (both themes), Wallet, Transactions, Menu, Subscriptions and its tabs, Cashback and Add form, Financial Planning, Limits and transaction search. Focus indicator remains 2px. No browser page errors on main navigation.
- Implementation, automated regression checks, this PR progress entry, and `docs/engineering/updates/2026-11-07-borderless-controls.md` are included in the same commit to satisfy per-commit documentation gates.
- Keep independent security PR #227 unchanged. Merge only after exact-head GitHub CI and deployment checks succeed.


## Header 0.5px padding and back navigation — 2026-11-07
- On latest merged main, use 0.5px internal padding for header buttons without changing the established 45px touch targets, 22px icons, utility group spacing, colors or states.
- Cashback and Scheduled (entered from Menu) gain an optional Back button returning to Menu, while retaining original large titles and all actions, including Scheduled Plus. At narrow widths (<360px), only these pages' header utilities wrap to a second row.
- Broad MOVO button border removal is already in main. Preserve CSS icon pseudo-element borders needed to draw indicators while removing decorative shadows.
- Added navigation, responsive CSS, exact padding and icon safety tests; a dated engineering update accompanies this single code commit.


## PR #229 — Unified Settings icon across MOVO (2026-11-07)
- Profile header, Profile Financial Settings row and sidebar now use the same solid Settings gear already shown on Home and shared headers.
- Per-context SVG sizes stay unchanged (Home 24px, shared header 23px, Profile header 19px, menu 20px, sidebar 22px). Theme-adaptive currentColor, 45px touch targets, 0.5px header padding and borderless controls are preserved.
- The legacy gear icon name aliases to canonical gearSolid in the shared Icon component to prevent a second design recurring. Other icons such as shield and sliders remain distinct.
- New SettingsIconConsistency.test.js covers matching SVG artwork, click routing and existing size contracts. Dated engineering documentation accompanies this commit.


## PR #229 — Adaptive Financial Planning filters, 10px headers and scrolling mascot (2026-11-07)
- Shared filter buttons now show the application's main foreground color when unselected; selected chips use contrast-safe white text on the light-mode dark sliding pill, or dark text on the dark-mode white pill. Preserve button sizes and tap behavior.
- Standardized all direct root/sub/Home/Wallet/Transactions/Menu headers at exactly 10px top/bottom internal padding and 10px lower separation. Preserve the iPhone safe-area inset on screen, existing icon sizes and 0.5px button interior padding.
- Home ram avatar slot compacted from 80px to 68px (60px on narrow phones). Animated artwork scales to 88% on scroll, photo mascot to 90%, while retaining the existing interaction target; reduced-motion disables transitions.
- Added AdaptiveFilterHeaderMascot.test.js with CSS cascade, real tab-click, scroll integration, responsive and accessibility checks. Dated engineering documentation included. No financial/data logic changes.


## PR #229 — Transactions filters spacing (2026-11-07)
- Standardized Transactions type filters and billing selector onto one aligned row, with consistent gaps, no negative inherited margins, and clear 16px separation beneath the row.
- Date / Amount / From-To / Account sort chips use equal-width 3- or 4-column layout, 8px gaps (6px narrow), and 16px of clear separation above transaction cards/date headings. No more active chip touching the card.
- Narrow <=390px spacing retains click targets, accessible labels and no overlaps. Preserved existing theme, colors, selection indicator, filter/sort logic and all other pages.
- Added TransactionFilterSpacing.test.js plus a dated engineering record in this same code commit. Gate on Vercel Sandbox full CI/build and exact-head GitHub CI before merging.


## PR #229 — Compact Wallet card actions and enlarged icons (2026-11-07)
- For View Details / Add amount / Limits / More beneath the selected card, decrease vertical bar padding from 14px to 8px, enlarge each icon from 20px to 26px and reduce icon/label gap from 7px to 5px. Keep the 4-column arrangement, horizontal padding, 11px labels and 44px minimum touch target.
- No changes to click actions, labels, card boundaries, outline-free button styling, themes or financial functionality. Added WalletCardActionSpacing.test.js and dated engineering record. Require Vercel Sandbox test/build and GitHub CI before merging.


## PR #229 — Financial Planning: Collect, Edit and Delete in Owed to you (2026-11-07)
- Each receivable now uses the Loans & Debts three-action card, preserving compact layout and icons. Collect reuses the existing record_receivable_event SQL RPC (account- and owner-validated) and is disabled on settled or fully collected records.
- Edit updates metadata only, leaving principal, currency, outstanding balances, account links and event history intact. Delete presents a confirmation and soft-archives the receivable without erasing collections or changing cash balances.
- Owner-scoping, date validation, archive filtering and real UI callbacks have targeted regression tests. Internationalized UI copy is available in all 11 languages.
- Detailed same-commit documentation: docs/engineering/updates/2026-11-07-pr229-receivable-actions.md. Existing Wallet four-action compact strip was committed already in a4a7a3e and is preserved here.
- Require full Vercel Sandbox tests/build, GitHub exact-head CI and live mobile visual review before merge.

## Transactions sort filter side-fade correction (2026-11-07)
- Screenshot defect: the Date/Amount/Account sort buttons fade at the left and right edges due to the global `.chip-row` scroller mask.
- Transactions sorting uses a fixed non-scrollable grid, so override only its mask to `none` (including WebKit); remove only the sort indicator's box shadow.
- Preserve active pill appearance, gaps, 44px targets, arrow-free labels, sorting callbacks and the horizontal fades of genuinely scrolling rows. No change to financial records, auth or calculations.
- Includes a focused regression test and the engineering record `docs/engineering/updates/2026-11-07-transactions-sort-edge-shadows.md`. Require Vercel Sandbox checks and exact-head GitHub CI before merging.
- Verification: focused Sandbox tests 18/18, full test suites 124/124 and 694/694 tests, TypeScript and optimized build passing. Chromium mobile-width computed-style checks confirmed both masks and indicator shadow are `none` in light and dark appearance; three options and 44px target intact.

## Transactions and Wallet — exactly 40px filter heights (2026-11-07, PR #232 follow-up)
- Align Transactions type/date-sort/account-sort filters and billing-cycle select to 40px, Wallet category filters and Wallet sort/layout selectors to 40px. Preserve all current horizontal spacing, responsive widths, selected-pill animation, semantic button labels, and existing side-shadow removal in PR #232.
- Only filter controls are targeted; header actions and unrelated cards/navigation remain unchanged.
- Added `TransactionWalletFilterHeight.test.js`, updated existing Transactions filter spacing / shadow regression expectations and extended dated engineering docs in the same commit. Vercel Sandbox and exact-head GitHub CI required before merge.
- Follow-up final verification: isolated Vercel Sandbox 704/704 tests in 125 suites, TypeScript and build passed. Browser verified 36 40px controls per mobile width across light/dark at 320/390/430px; exact-head GitHub CI remains a separate merge gate.

## Adaptive summary-card accent contrast (2026-11-07)
- Correct five screenshot-referenced surfaces: Home Total Balance, Transactions Total Spent / billing cycle graph, Financial Planning Net worth, Cashback tracked, and Monthly subscriptions.
- Reuse the existing WCAG black/white `--on-accent` algorithm for all summary-card text and SVG/bar graph colors; use subtle matching translucent chart backgrounds instead of fixed white. Accent fill and existing component layouts are preserved.
- Scope: stylesheet + dedicated regression tests + dated engineering record. No financial data, API, account, layout, theme preference or user interaction changes.
- Merge gate: full Vercel Sandbox install, test/typecheck/build, followed by same-commit PR CI and visual review. See docs/engineering/updates/2026-11-07-adaptive-financial-summary-contrast.md.
- Verification: Vercel Sandbox targeted 20/20; full prebuild 701/701 tests / 124 suites; TypeScript and optimized build passed; 28/28 computed-style browser assertions on real built app for pastel pink and dark charcoal passed. PR checks and authenticated human visual review remain merge gates.

### 2026-11-08 — Import & Export preview/save PR
- Compact Upload file, no-file status, JSON backup preview and explicit Save records. CSV selection routes to existing CSV importer. Restore add-only and tested; not a complete restoration of all backup tables.
- See docs/engineering/updates/2026-11-08-import-export-preview-commit.md.

- 2026-11-08 — PR #240 additional import accounting safeguards: fail closed for duplicate account labels, incompatible account type/currency, dangling account/transfer references, and incomplete transaction rows; regression tests and Vercel Sandbox evidence in dated engineering update.

- 2026-11-08 — PR #240 CSV hardening: duplicate matching wallet account labels now require user correction; no accidental first-result posting. Added 11-language error message, focused tests, audit notes.


### 2026-11-08 — Offline storage mode pauses plan-access features
- Proposed policy: Cloud Sync off -> local features only; Pro/Pro+ effective access paused while existing verified subscription/billing remain unaffected.
- Cloud Sync on -> verified, active, unexpired entitlements only; UI premium content and cloud sync writes are mode-gated.
- UI explains offline mode and provides Cloud Sync settings action without encouraging duplicate plan purchases.
- No cloud finance snapshot migration, backend plan change or production database mutation; blocked high-risk migration remains PR #241.
- Evidence: docs/engineering/updates/2026-11-08-local-mode-plan-access-policy.md; Vercel Sandbox + GitHub exact-head CI required.

### 2026-11-08 — Local CSV/JSON import: Discard or Save with confirmations
- Uploaded files are preview-only until an explicit, separate confirmation. Discard removes preview only; Save commits validated local accounts and transactions.
- No imported file is written to Supabase; active cloud mode blocks committing and prompts local-mode switch.
- Wallet, Home and Transactions refresh from successfully saved device records. Invalid, duplicate, unsupported or stale records do not silently overwrite financial data.
- Cloud plan access is paused in local mode without affecting store subscription. PR #241 full offline migration remains blocked.
- Reference: docs/engineering/updates/2026-11-08-local-import-discard-save-confirmation.md.

### 2026-11-08 — Translation-catalog coverage fix for PR #245
- Added 67 missing English interface keys to the 11-language catalog, including local/cloud mode, save/discard confirmations and sync safeguards. Translations are machine-assisted and should be professionally reviewed before localization sign-off.
- Verified `src/lib/i18n.test.js` in isolated Vercel Sandbox: 2/2 tests passing, 2,540 catalog strings and complete placeholder coverage; existing English source keys unchanged.
- No finance code or subscription records changed in this CI-only patch. Full GitHub Phase 1 CI and signed-device audit are still release gates.


### 2026-11-09 — PR #245 localization CI repair
Regenerated all 11 locale catalogs + version from branch source (2,540 strings). Focused i18n (2) and import/plan/walkthrough (15) tests pass in Vercel Sandbox. Exact new-head CI and device verification still required; PR #246 remains separate draft synchronization work. See `docs/engineering/updates/2026-11-09-pr245-localization-gate.md`.

## 2026-11-06 — Native session vault and mobile safety PR
- Branch security/native-auth-backup-privacy-20261106, base main 9c423c7. Open UI PR #225 preserved. Release NOT CERTIFIED.
- Native Supabase sessions migrated to iOS Keychain/AndroidKeyStore vaults; legacy session and PKCE verifier copies purged only after successful secure storage.
- Android backup and device transfer disabled, privacy screenshots restricted, iOS switcher snapshot cover; Android R8 and native CI added. Public security.txt.
- Source and tests: 17 focused tests passed initially. Require full suite, production build and Apple/Android simulator compile before merging. Signed physical device tests remain mandatory for app stores.
- Not addressed: web cookie sessions, passwordless MFA/passkeys, verified deep links, app attestation, 12 privileged-RPC cross-user tests, login alerts, active device controls and comprehensive rate limiting.
- Detailed dated update: docs/engineering/updates/2026-11-06-native-session-hardening.md. Full 22-control matrix: docs/security/SECURITY_HARDENING_22_POINT_2026-11-06.md.

- PR #227 Android CI first attempt stopped before compilation in android-actions/setup-android@v3 because sdkmanager rejected obsolete package 'tools'. Removed the action and used the preinstalled ubuntu-latest SDK command-line tools with explicit API 36 packages. Native compilation still needs a passing rerun; this follow-up modifies the workflow and same-commit docs only.

- PR #227 second Android CI attempt found sdkmanager present under the hosted Android SDK but absent from PATH. The workflow now discovers its absolute executable location under ANDROID_HOME/cmdline-tools, rather than assuming PATH. Compiling the app remains a separate verification step.

- PR #227 follow-up: automation device secret had remained embedded in native general preferences; now stored only in the platform vault after write-first migration, scrubbed from mirrored preferences, and safely rotated before old-token revocation. Native/browser behavior covered by additional unit and source contract tests. Native CI and physical-device validation still required.
