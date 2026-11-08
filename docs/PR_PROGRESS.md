# MOVO Pull Request Progress Register

**Last reconciled:** 2026-11-02 20:00 UTC  
**Source of truth:** GitHub PR pages, commit SHAs, Actions runs, and Vercel deployment records. This register is a concise operational index, not a substitute for those records.

## Open pull requests

| PR | Scope | Current state | Next action |
|---|---|---|---|
| [#149 — Home 3D ram mascot](https://github.com/nasrinaiv0/movo/pull/149) | Home header ram whose mood (smile / cute / disappointed / angry) follows the month's budgets, income when there are none; lazy three.js chunk, assets in `public/mascot/`. | Open; owner asked to ship it. Local: 383 tests, typecheck and strict build green. | Squash-merge once `verify` and the Vercel preview are green, then confirm production. |
| [#93 — Privacy and legal verification](https://github.com/nasrinaiv0/movo/pull/93) | Legal review draft (verification matrix, Philippines notes). | Open; must not merge until every legal/operational item has evidence and counsel review. | Owner supplies verified legal facts; counsel review. |

Checked against GitHub on 2026-11-02 20:00 UTC: #93 is the only open PR. #41 was closed without merging (its consent wording was superseded by later chat work).

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

**Plans: Free, Pro, Pro+ (`feat/paid-plans`, 2026-11-03):** migration `20261104010000_plans_entitlements` (server-written plan grants, one-month trial once per account and device, referral codes with a one-time 3-month Pro reward at 10 subscribed referrals, cloud-write guard for Free, paid-only premium-stickers Storage policy, existing cloud users start the trial). Server checks in `api/log.js` (automation is Pro+) and `api/nasrinai/chat.js` (model is Pro). App: first-launch plans sheet, Settings → MOVO plans, locked portrait cards, card animations (Free gets a crossfade), insights and briefings, Money flow Custom, uploads, premium styles, camera scanning; NasrinAI on Free answers from saved records; Pro+ glow finish; streak tiers renamed Bronze/Silver/Gold; Terms and Privacy updated (effective 2026-11-04). **Not applied to production; billing (App Store / Google Play) is the next PR.**

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
