# MOVO Pull Request Progress Register

**Last reconciled:** 2026-10-29 13:02 UTC  
**Source of truth:** GitHub PR pages, commit SHAs, Actions runs, and Vercel deployment records. This register is a concise operational index, not a substitute for those records.

## Open pull requests

| PR | Scope | Current state | Next action |
|---|---|---|---|
| [#41 — NasrinAI financial-context consent](https://github.com/nasrinaiv0/movo/pull/41) | Clearer opt-in disclosure, accessible disabled-send guidance, consent/legal-link regression tests. | Open; latest reviewed head `b93afb517dbdaad53dc07423b5b36571439d4c39`; historical CI run [40874336883](https://github.com/nasrinaiv0/movo/actions/runs/40874336883) passed 15 suites / 88 tests, typecheck, and production build. Its branch predates the latest main merge; recheck mergeability and exact-head checks. | Reconcile the branch with current main without losing the consent changes, then complete preview/browser verification. |
| [#42 — Accessible disabled cloud-auth guidance](https://github.com/nasrinaiv0/movo/pull/42) | Associate disabled Google/email sign-in actions with visible configuration guidance and add regression tests. | Draft; branch `fix/auth-disabled-control-guidance`; exact head `e695e24ecb57dd610226ddffdb2bc1d7846d8b89` passed GitHub Actions run [40877723949](https://github.com/nasrinaiv0/movo/actions/runs/40877723949): 15 suites / 88 tests, typecheck, production build; matching Vercel preview `dpl_2vZfsvxJ77AAjnnRhnCB5QpaJwNu` is READY. | Recheck CI on the latest docs-refresh commit, then complete browser, keyboard, and screen-reader verification before marking ready. |

PR #40 (UI motion refinement) is merged into main as `f1db0aaea96f5fae9983013bb63fcf4087657187`. Reconcile this register against live GitHub state before each follow-up pass.
  
## Recent merged implementation

| PR | Result | Validation / notes |
|---|---|---|
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

## Current release blockers

These are not resolved by a green frontend CI run or a READY deployment:

- **Legal readiness:** Formal operator/data-controller identity and address, actual retention periods, provider details, and jurisdiction-specific disclosures still need verification and legal review. The in-app pages explicitly warn users about the missing details; do not invent them.
- **Supabase Auth:** Security Advisor still reports leaked-password protection disabled. Enable it through authorized project settings: [Supabase password-security guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- **Dependencies:** Latest main CI install reports 34 npm audit findings (16 low, 5 moderate, 13 high). Review advisories and use targeted upgrades with regression tests rather than a blind forced upgrade.
- **NasrinAI chat:** Production logs show 7 upstream HTTP 401 responses in the last 24-hour window, last observed at 2026-10-29T05:42:54Z. No successful authenticated production chat request has been confirmed in this run; never expose or log credential values.
- **Interactive verification:** Full browser smoke tests on the production custom domain, including mobile, auth, consent, financial writes, CSV flows, and keyboard/focus behavior, remain unverified.
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


## PR #43 current-main reconciliation — 2026-10-30

- Branch: `fix/finance-calculations-sync`; reconciliation commit: `95ac0d1cff74682d938859d1ae549e1635b34fa2`; current main parent: `ca1a680c78baf7c87347c960d56c7bc207041bc3`.
- Current comparison: 2 commits ahead, 0 behind. The stale documentation copies from the old branch were intentionally not overlaid on current main; finance implementation details were added to `FRONTEND_FUNCTIONALITY_AUDIT.md` instead.
- PR #59's generic demo identity and sample-data notice were explicitly restored and covered by regression tests while retaining PR #43's currency-aware calculations.
- Latest-head CI/preview validation is pending. Older successful runs do not count for the reconciled tree.
- **Merge blocker:** `src/lib/financeCalculations.js` currently treats non-finite monetary values as zero in `toCents`. This must be resolved or proven unreachable before merging, alongside authenticated finance-write and CSV flow verification.


## Invalid monetary value handling — validated follow-up, 2026-10-30

- The prior note that `toCents` converted non-finite values to zero is superseded by code commit `05d3b2007656c467b82b95dc9574a55ffe0aeca9` and Home/accessibility follow-ups `40979b1e196051d5be8acbccbfcc05d9e6622c2c` and `ba5753cd40fca83f445cf22ef9fc2f8602c9b003`.
- Invalid amounts now propagate as invalid instead of zero. Currency formatting and animated amounts display an em dash; account/month totals are unavailable rather than fabricated; chart/trend series are suppressed; the user sees an accessible warning. Home Money Flow changes to “Needs review” / “Summary unavailable” and does not announce NaN or misleading percentages.
- Added regression coverage for invalid arithmetic, invalid formatting, corrupted local transaction data, and accessible Money Flow state.
- Exact-head GitHub Actions run [40989263312](https://github.com/nasrinaiv0/movo/actions/runs/40989263312) passed **20 suites / 117 tests**, typecheck, production-only dependency audit, and production build. The production-only audit reported 0 vulnerabilities.
- Vercel preview [dpl_3pP8bQjDFHJWQek6cmm8f5mYr35T](https://vercel.com/nasrin-ai/movo/3pP8bQjDFHJWQek6cmm8f5mYr35T) reached **READY** for `ba5753cd40fca83f445cf22ef9fc2f8602c9b003`.
- This does not resolve the full dependency tree's 34 reported findings (16 low, 5 moderate, 13 high). Production-only audit success is not a full dependency-tree clearance.
- Remaining gates: authenticated financial writes, CSV import/export, and real user-owned currency-isolation verification. No Supabase schema/RLS/grants, production data, auth configuration, or provider secrets changed.
- This audit update is documentation-only; rerun exact-head CI and preview checks on the resulting branch head before merge.


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

## Finance UI correction — profile summaries honor selected display currency (2026-10-30 11:14 Asia/Manila)

- **Issue found:** `src/screens/Profile.js` formatted profile summary metrics with the default PHP currency and forced account-type subtotals to PHP, even when MOVO's `displayCurrency` preference selected another currency. The account list was already filtered to the selected currency, so the label could be wrong without any conversion having occurred. When balances were hidden, the mask also defaulted to the PHP marker.
- **Fix:** The Profile screen now reads `displayCurrency` from the shared app context (PHP fallback only when the context does not supply it) and passes that currency to both `money()` and `shown()` for the three summary metrics and bank/card/e-wallet subtotals. No exchange rate or cross-currency aggregation is introduced.
- **Regression test:** `src/App.test.js` seeds synthetic USD and PHP accounts plus USD income/expense and a PHP transaction, then verifies Profile shows USD-formatted balance/income/expense and the USD bank subtotal without PHP labels. It rerenders with balances hidden and verifies the mask says `USD ••••••`, not `₱ ••••••`.
- **Security/data:** Local synthetic test fixtures only. No production financial records, schema, RLS, grants, authentication configuration, or secrets were changed.
- **Validation boundary:** This change has been committed to the existing finance PR branch. Fresh exact-head CI and Vercel preview checks are required; previous passing runs do not validate these new commits. Authenticated cloud CRUD/CSV and owner-scoped currency-flow verification remain release gates.

## Exact-head validation — Profile currency correction — 2026-10-30 11:14 Asia/Manila

- Finance PR #43 implementation/test head `5308948502127be913921522b598693feb21e533` passed GitHub Actions [#40996734432](https://github.com/nasrinaiv0/movo/actions/runs/40996734432): **20 suites / 118 tests passed**, TypeScript typecheck passed, production-only dependency audit reported **0 vulnerabilities**, and production build compiled successfully.
- Exact-head Vercel preview [dpl_DQTyWYggxd56XezRUErxs1Je3sa6](https://vercel.com/nasrin-ai/movo/DQTyWYggxd56XezRUErxs1Je3sa6) reached READY. The preview root returned HTTP 200. This is a smoke check, not authenticated finance-flow verification.
- The new regression covers profile balance/income/expense and bank subtotals in selected USD, excludes PHP from the USD summary, and verifies currency-aware masking when balances are hidden.
- Full dependency tree still reports **34 findings (16 low, 5 moderate, 13 high)**; production-only audit is a separate, narrower check.
- Authenticated cloud finance writes, CSV import/export, and real user-owned currency isolation remain unverified; PR #43 stays draft pending those release gates.
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

## Display Currency setting implementation — 2026-10-30 11:35 Asia/Manila

- **Finding:** The finance importer instructed users to change “Display Currency in Settings,” but the Settings UI had no such control. The app context already exposed `displayCurrency`, `availableCurrencies`, and a validated `setPref('displayCurrency', ...)` path, so the user-facing selector was missing.
- **Implementation on PR #43 branch:** Added a native, labelled `Preferences → Display Currency` select wired to the existing preference setter. It lists only validated available three-letter currency codes and follows the selected currency after state updates. When only one currency is available, the select is disabled and its associated description explains how to add another currency. The description explicitly says currencies remain separate and are not automatically converted.
- **Appearance copy:** PR #43 branch does not contain the static “PHP is the only available currency” row found in the separate open PR #60 branch. Before #60 can merge after this feature, that row must be reconciled so it does not contradict the new selector.
- **Regression tests:** Settings tests verify the selector exposes an accessible name and description, changing PHP→USD calls `setPref('displayCurrency', 'USD')`, no-FX wording is visible, and the selector is disabled with a clear explanation when only one currency is available.
- **Validation boundary:** New source/test commit `dac81e426038e0165f235bae882cffdf9ef6c4bf` has not yet been validated by a fresh exact-head run at the time of this entry. Earlier green runs for the previous PR #43 head do not validate this change. Run typecheck, full tests, production build, production-only audit, and preview smoke after this commit.
- No database, RLS/grants, financial records, authentication settings, or secrets changed.
