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
