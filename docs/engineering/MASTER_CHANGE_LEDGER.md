# MOVO Master Change Ledger

## Latest audit snapshot — 2026-10-30 09:20 Asia/Manila (01:20 UTC)

**This section supersedes older status rows below wherever they disagree.**

- **Current main:** `bb30c8e87722e51d0df07eef8031ebc5435b4093` (merged PR #57).
- **Current production:** [Vercel deployment dpl_6tmjn2FNfCFEpwCessZcjE2ibBjq](https://vercel.com/nasrin-ai/movo/6tmjn2FNfCFEpwCessZcjE2ibBjq) is READY at the same SHA. This is deployment/build evidence, not proof that embedded NasrinAI chat is authenticated and functional.
- **PR #57:** merged; exact-head CI #40982977495 passed install, production-only npm audit, tests, and production bundle. `react-scripts@5.0.1` moved to devDependencies; `npm audit --omit=dev` is now a CI gate. Full-tree audit still reports 34 development/build-tool findings (16 low, 5 moderate, 13 high).
- **PR #56:** open/draft at `36c486424a2f37591edb13d5a43936140515e217`; current-head CI #40985264768 passed and Vercel preview is READY. Branch is 10 commits ahead / 2 behind current main; reconcile before merge. Previous preview at `d822aa0...` failed 2 tests; latest head mocks `AbortSignal.timeout` and now passes CI. Production scope-canary verification remains unverified.
- **PR #55:** open/draft at `e191c8c421f5410d099da903c3ab3541ae03a65e`; exact-head CI #40984662087 passed and preview is READY. Branch is 26 ahead / 2 behind main. Manual keyboard, screen-reader, mobile, and finance-flow QA remain outstanding.
- **Upstream chat authentication:** Vercel logs over the prior 24 hours still returned repeated `POST /api/nasrinai/chat` HTTP 401 events, latest observed at `2026-10-29T15:37:50.463Z`. No production error/warning logs matched the last-hour query, but no successful authenticated chat was established. Do not infer recovery.
- **Release blockers:** reconcile PRs #56/#55 with current main; run exact-head CI after reconciliation; verify the server credential through authorized secret management without exposing it; run authenticated MOVO-only canary tests and prove unrelated content is absent from retrieval, provider requests, replies, transcripts, caches, and logs.
- No production secret, financial data, database schema, application code, or deployment was changed by this audit. See [the 09:20 audit delta](engineering/updates/2026-10-30-0920-runtime-dependency-and-context-isolation.md).



## Latest audit snapshot — 2026-10-30 08:50 Asia/Manila (2026-10-30 00:50 UTC)

**This snapshot supersedes older status rows below wherever they disagree.** The lower sections remain historical audit records and should not be read as the current PR inventory.

- **Repository scope:** MOVO only. The separate NasrinAI repository is not being modified by this workflow.
- **Current `main`:** `bbd3183553fde00206d65639ecbf042b20d28a67` (documentation-only merge of PR #54).
- **Production:** deployment `dpl_7XobXwSNWuLa5a9HChdafyGoECeR` is READY at source SHA `82172294f80e360af9e7043de425a454c211078c`, which is behind current main by the documentation-only merge. The four application PRs below are not deployed to production.
- **Open implementation PRs:** #43 finance ledger/currency, #52 chart formatting/validation, #55 UI control and ARIA audit, #56 MOVO-only NasrinAI context boundary. All remain drafts. No application PR was merged in this audit.
- **PR #43:** head `7f073831833a4078ef428632cafa69bfdb1f63eb`; historical exact-head CI reported 19 suites / 111 tests, typecheck and production compilation passing. Authenticated finance-flow and responsive/accessibility verification remain unverified. Its PR description contains both a checked manual-smoke-test item and later notes saying manual verification is outstanding; the latter is the conservative release status until evidence is reconciled.
- **PR #52:** head `58b7a9e32dac650d517aa99bf7bfb94c4b39ac01`; exact-head CI reported 18 suites / 99 tests, typecheck and production compilation passing; Vercel status success. Live authorized-finance chart verification remains unverified.
- **PR #55:** head `dcf625c057607f6d5566054d8eba58e1a3c6a2e5`; exact-head CI reported 19 suites / 105 tests, typecheck, static control audit and production compilation passing; Vercel status success. Interactive browser, keyboard, screen-reader and mobile checks remain outstanding.
- **PR #56:** head `62eda3c7fe763db219a5340f49cef8540c13c614`; exact-head GitHub Actions run [40979832794](https://github.com/nasrinaiv0/movo/actions/runs/40979832794) passed 17 suites / 98 tests, typecheck and production compilation; exact-head Vercel preview is READY. It adds stale-response invalidation after account/mode changes. **Authenticated deployed upstream scope confirmation and the cross-project canary are still unverified**, so keep the PR draft and do not declare issue #47 resolved.
- **Production HTTP smoke check:** `https://movo.nasrinai.com` returned HTTP 200 at 2026-10-30 00:51 UTC. This confirms only HTML delivery, not a successful authenticated app/API flow.
- **Production NasrinAI telemetry:** in the latest 24-hour window, Vercel grouped 8 upstream HTTP 401 events tagged `key_format_secret_format`, 7 additional upstream HTTP 401 events, one timeout, and one network error for `/api/nasrinai/chat`. The latest recorded 401 was 2026-10-29 15:37 UTC. This is evidence of previous production failures, not proof of current failure or recovery. The `NASRINAI_API_KEY` variable exists as a sensitive Production variable; its value was not decrypted. A successful authenticated request is still required.
- **Dependency audit:** fresh install without a committed lockfile produced 34 full-tree npm advisories (16 low, 5 moderate, 13 high, 0 critical), all in the legacy `react-scripts@5.0.1` build/test dependency tree. A dedicated branch `chore/movo-runtime-dependency-scope` moves CRA to `devDependencies` and adds a production-only `npm audit --omit=dev` CI gate. In a temporary sandbox experiment, production-only audit reported zero advisories and build/typecheck/tests passed (17 suites / 98 tests); exact-branch Node 20 CI is still pending. **The 34 full build-toolchain findings are not fixed** and must not be described as resolved.
- **Database security:** latest read-only catalog check confirmed RLS enabled on seven checked public tables, 22 owner-scoped policies across six user-facing tables, no `anon`/`PUBLIC` grants on the checked tables, and the upstream conversation mapping remains service-role-only. Supabase leaked-password protection is still disabled; no setting or policy was changed.
- **Legal publication:** Terms/Privacy navigation and automated page tests exist, but publication is not complete. Formal operator/controller identity and address, the real retention schedule, verified provider/data-recipient disclosures, and jurisdiction-specific review are still missing. Keep the warning visible and do not invent legal facts.
- **Next priority:** (1) complete the credential rotation/verification through the authorized secret-management path without exposing the value; (2) obtain authenticated MOVO-only canary evidence for PR #56; (3) complete interactive finance/chart/control QA; (4) resolve the full build-toolchain audit; (5) complete legal disclosures with verified facts; (6) repeat CI/security/RLS checks and merge only PRs whose own release gates are met.

---

# MOVO Master Change Ledger

**Snapshot:** 2026-10-30 06:14 Asia/Manila (2026-10-29 22:14 UTC)  
**Repository:** https://github.com/nasrinaiv0/movo  
**Current main SHA:** 82172294f80e360af9e7043de425a454c211078c  
**Current production deployment:** dpl_7XobXwSNWuLa5a9HChdafyGoECeR, READY at the current main SHA  
**Scope:** MOVO implementation only. NasrinAI is referenced only as the intentional upstream dependency for embedded chat.

## Executive status

| Area | Status | Evidence / caveat |
|---|---|---|
| Production source | **Verified READY** at main SHA 82172294f80e360af9e7043de425a454c211078c | [Vercel deployment](https://vercel.com/nasrin-ai/movo/7XobXwSNWuLa5a9HChdafyGoECeR) |
| Production application code | **Effectively unchanged from PR #50** | PR #51 merged a documentation-only handoff; prior application-code baseline is 94d089d35483558b320f751cf122aa68755ef0eb. Do not mistake a docs deployment for a chat fix. |
| Unrelated context issue #47 | **OPEN / NOT RESOLVED IN PRODUCTION** | Screenshot demonstrates unrelated portfolio content in finance chat; it does not alone prove cross-user data exposure. |
| PR #48 context isolation client | **Open; preview only; branch needs reconciliation** | Exact preview deployment dpl_Ei7vXK2BVanYgcZWBhiuY6j9LZrH is READY for 6b4f0bb809151ffe7e3aa78494e7b651cdcbcba5. Branch comparison says 36 ahead / 11 behind main with merge base 94d089d... |
| Upstream service enforcement | **Merged/deployed in NasrinAI** | NasrinAI PR #699 merged as 4b61cae... and is included in current NasrinAI production history. This does not deploy the MOVO client. |
| Authenticated end-to-end isolation | **NOT VERIFIED** | No live signed-in MOVO-to-NasrinAI smoke test or canary test was run in this review. |
| Chart correctness PR #52 | **Open; preview/test state carried from PR report** | Currency-aware axis/tooltips and pie values are described; real financial-data rendering remains unverified. |
| Disclaimer filter PR #53 | **Open; presentation-only** | Hides a known irrelevant disclaimer; does not prevent unrelated content from entering model context. |
| UI control audit PR #46 | **Open** | Adds a static guard; not a substitute for manual keyboard, screen-reader, mobile and browser testing. |

## Change record 2026-10-30 06:14 Asia/Manila

### A. PR #51 — Claude handoff documentation

- **Verified:** merged as 82172294f80e360af9e7043de425a454c211078c. The merge commit adds docs/claude/MOVO_IMPLEMENTATION_STATUS_AND_CLAUDE_HANDOFF.md.
- **Deployment:** dpl_7XobXwSNWuLa5a9HChdafyGoECeR is READY at the merge commit. The merge diff is documentation-only; it does not deploy PR #48's API/client changes.
- **Value:** preserves phase priorities, separates implemented/tested/integration-verified/manual-QA/deployed-and-smoke-tested states, and identifies context isolation, rich reply rendering, frontend control audit, security/legal gates, and production verification as outstanding.
- **Tests:** no new application tests are established by this documentation-only commit. Vercel READY confirms the docs-only commit built/deployed, not that MOVO features are complete.

Evidence: [PR #51 merge commit](https://github.com/nasrinaiv0/movo/commit/82172294f80e360af9e7043de425a454c211078c), [production deployment](https://vercel.com/nasrin-ai/movo/7XobXwSNWuLa5a9HChdafyGoECeR).

### B. PR #48 — stateless MOVO-only NasrinAI integration

- **State:** open. Exact preview deployment dpl_Ei7vXK2BVanYgcZWBhiuY6j9LZrH is READY at SHA 6b4f0bb809151ffe7e3aa78494e7b651cdcbcba5. Combined status for that SHA reports a successful Vercel status.
- **Branch reconciliation:** compare main (82172294...) to fix/movo-nasrinai-context-isolation reports 36 commits ahead, 11 behind, merge base 94d089d35483558b320f751cf122aa68755ef0eb. This is a direct discrepancy with any older statement that the branch is fully reconciled to current main. Reconcile to current main and rerun all gates before merge; do not infer mergeability from a READY preview.
- **Changed paths in current comparison:** api/nasrinai/chat.js (+116/-81), docs/NASRINAI_CHAT_INTEGRATION.md (+33/-10), src/components/NasrinAIChat.js (+49/-9), src/components/NasrinAIChat.test.js (+69), src/lib/nasrinaiChat.test.js (+90/-19).
- **Behavior intended:** send the actual user question separately from bounded finance JSON; send context_scope "movo"; do not send upstream conversation_id; require explicit scope confirmation or fail closed; clear chat state on account switch; start a one-time clean chat for each user to avoid restoring a legacy contaminated thread; normalize financial context and exclude malformed values rather than inventing PHP/zero/date defaults; clean up newly created empty conversations after upstream failure without deleting existing conversations.
- **Tests reported by PR body:** exact head 6b4f0bb... has 17 suites / 96 tests passing, typecheck and production compilation passing. GitHub Actions run 40957870245 is cited in the PR body. This review also fetched GitHub Actions run 40957870245 and confirmed its verify job completed successfully; Install dependencies, Run tests, and Build production bundle all completed with success. The 17-suite / 96-test count is recorded in the PR body/build evidence; this review did not extract the exact test total from Actions logs.
- **Privacy/security:** client-side account switch clears visible messages, conversation ID, draft, error, and consent before paint. Server-side finance queries should remain authenticated and owner-scoped. Verify no old response can be rendered or persisted after account switch, retry, cache restore, or an upstream scope failure.
- **Critical integration boundary:** NasrinAI PR #699 is now merged/deployed, but MOVO PR #48 is not in production. The current production client remains on the #50 application code plus #51 docs-only change. Therefore the complete scoped request/response contract is not live end-to-end.
- **Next test:** use a signed-in synthetic account; request a normal finance answer; inspect a redacted trace to confirm only allowlisted finance fields are sent; confirm response scope is "movo"; ensure a portfolio canary is absent from retrieval, provider prompt, response, transcript, cache, and logs; verify invalid scope and upstream failure do not display/save an answer; test sign-out/sign-in and switching users while history is pending.

Evidence: [PR #48](https://github.com/nasrinaiv0/movo/pull/48), [exact-head preview](https://vercel.com/nasrin-ai/movo/Ei7vXK2BVanYgcZWBhiuY6j9LZrH), [NasrinAI PR #699](https://github.com/nasrinaiv0/nasrinAI/pull/699).

### C. PR #52 — financial chart correctness

- **State:** open according to current open-PR search. The PR description says chart axis ticks and tooltips honor each series' currency/format, pie values show prefix/percentage, and pie categories beyond seven are aggregated into an Other category.
- **Verification:** exact current head and current CI were not revalidated during this review. A READY preview or component test is not proof that production charts use correct authorized ledger data.
- **Next checks:** malformed chart JSON, unknown currency, large/negative values, rounding, zero/empty datasets, series count bounds, accessibility labels, and responsive behavior on authenticated real-data fixtures.

Evidence: [PR #52](https://github.com/nasrinaiv0/movo/pull/52).

### D. PR #53 — unrelated-document disclaimer filter

- **State:** open according to current open-PR search. The PR description says it suppresses a known portfolio/development-services disclaimer in two phrasings when the response itself says the document is not relevant to finance.
- **Security boundary:** this is presentation filtering only. It must never be described as context isolation or a fix for unauthorized retrieval. It can hide evidence of contamination while leaving the underlying prompt/retrieval problem intact.
- **Next checks:** keep the filter narrow, test both phrasings and near-misses, ensure it does not remove legitimate finance explanations, and prioritize server/client scope isolation over this cosmetic mitigation.

Evidence: [PR #53](https://github.com/nasrinaiv0/movo/pull/53).

### E. PR #46 — repeatable UI control audit

- **State:** open according to current open-PR search.
- **Intended behavior:** AST-based static audit for inert buttons, anchors, forms, non-native interactive elements, and disabled controls without explanatory text/busy state; adds audit:controls to the build precheck.
- **Reported exact-head evidence in PR body:** after branch reconciliation, 17 suites / 93 tests passed, typecheck and static audit ran, and Vercel build succeeded. The latest body describes three disabled-control explanation warnings in finance save/import actions.
- **Risk:** static checks cannot prove the control works or that keyboard/mobile/screen-reader behavior is correct.
- **Dependency carry-forward:** the PR body reports 34 npm audit findings (16 low, 5 moderate, 13 high). This was not freshly run in this review.

Evidence: [PR #46](https://github.com/nasrinaiv0/movo/pull/46).

## Security and release carry-forward (not freshly re-queried)

- Prior PR documentation reports Supabase RLS enabled on the checked profile/finance/chat tables, owner-scoped policies on user-owned tables, no anon table grants in the checked set, and service_role-only grants on the upstream mapping. This was not independently re-queried at 06:14.
- Supabase leaked-password protection remains reported disabled. Recheck the live Auth setting before release.
- Legal publication, manual keyboard/screen-reader/mobile checks, current dependency audit, and authenticated production integration tests remain outstanding in the existing handoff.
- Do not add browser policies to the server-only upstream mapping merely to silence an RLS-without-policy warning.
- No financial records, schema, policies, grants, provider credentials, or production settings were changed in this review.

## Next actions, ordered

1. Reconcile PR #48 onto current main; preserve rich rendering and docs from #50/#51, inspect the resulting exact diff, rerun all 17+ test suites, typecheck, production build, and security checks on the final SHA.
2. Keep PR #48 unmerged until upstream scope confirmation and authenticated end-to-end tests pass against the deployed services.
3. Reproduce issue #47 with synthetic canaries and redacted traces. Verify isolation across retrieval, provider prompt, transcript, cache, logs, retries, account switch, and sign-out/sign-in.
4. Recheck current heads/checks for PRs #46, #52, #53 and reconcile stale branch/status notes.
5. Independently re-query Supabase RLS/grants/Auth protection and npm audit before declaring release readiness.
6. Complete manual browser, mobile, keyboard, and screen-reader verification; publish/review legal documents before release.

## Change-control statement

This review changed documentation only on branch docs/change-ledger-refresh-2026-10-30-0614. No application code, database settings, migrations, deployments, PR states, or financial data were changed. The documentation branch is for review and has not been merged.


## Change record — 2026-10-30 06:29 Asia/Manila — UI audit expansion

- Opened [PR #55](https://github.com/nasrinaiv0/movo/pull/55) from `chore/aria-control-audit-current-main`, based directly on main `82172294f80e360af9e7043de425a454c211078c`.
- Expanded the TypeScript-AST scanner to cover placeholder links, non-native interactive ARIA roles, tab selection state, checked/selected state, dialog accessible names, and human-review warnings for disabled explanations and dialog modality/focus.
- Added `src/lib/uiControlAudit.test.js` and wired `npm run audit:controls` into the production prebuild gate after typecheck and the full Jest suite.
- Updated `docs/UI_CONTROL_AUDIT.md` with scanner scope and limitations.
- Closed PR #46 as superseded (not merged) to avoid duplicate open audit implementations; its useful changes were copied to the current-main branch and expanded.
- Exact head `76851d33b07126a63c34922adedc04464995e157`: GitHub Actions run [40966145454](https://github.com/nasrinaiv0/movo/actions/runs/40966145454) was still installing dependencies at the 06:29 check. Tests, the audit gate and production build had not yet completed; Vercel preview was queued/building, not READY. Do not claim validation until exact-head checks finish.
- No application finance logic, auth, RLS, database, secrets, or production configuration changed. Issue #47 and PR #48 remain separate privacy work; this static audit does not fix context isolation.
- Detailed delta: `docs/engineering/updates/2026-10-30-0629-ui-audit-delta.md`.


## Validation follow-up — 2026-10-30 06:30 Asia/Manila

- PR #55 exact head `76851d33b07126a63c34922adedc04464995e157` completed GitHub Actions run [40966145454](https://github.com/nasrinaiv0/movo/actions/runs/40966145454) successfully.
- Confirmed: typecheck passed; **18 test suites / 99 tests passed**; `npm run audit:controls` passed; production bundle compiled successfully.
- Audit output: 31 source files; 93 buttons (9 disabled); 9 links; 5 forms; 4 interactive ARIA widgets; 2 dialogs. No obvious unhandled controls; three disabled-control explanation warnings remain at `src/App.js:596`, `:608`, and `:635`.
- Exact-head Vercel deployment [dpl_9WXj8JdbfmMDb14TT4gr2d44A2PH](https://vercel.com/nasrin-ai/movo/9WXj8JdbfmMDb14TT4gr2d44A2PH) is READY. This is a preview, not a production release or interactive accessibility sign-off.
- PR #55 remains a draft; PR #46 is closed as superseded, not merged. No production changes or database/security changes occurred.


## Read-only Supabase security recheck — 2026-10-30 06:30 Asia/Manila

- Queried production catalog metadata and grants for `profiles`, `financial_accounts`, `transactions`, `budgets`, `movo_ai_conversations`, `movo_ai_messages`, and `movo_ai_upstream_conversations`; no database writes were run.
- RLS is enabled on all seven tables. The six user-facing tables have 22 policies; the policy expressions are owner-scoped to `auth.uid()` in `USING` and/or `WITH CHECK`.
- No `anon` table grants were returned for the checked set. `authenticated` retains SELECT/INSERT/UPDATE/DELETE on the user-facing tables. The upstream conversation mapping has no client policies and its table grants are limited to `service_role`.
- Supabase Security Advisor still reports `auth_leaked_password_protection` as WARN (disabled) and `rls_enabled_no_policy` on the upstream mapping as INFO (consistent with intended server-only isolation). Do not add a permissive browser policy to the mapping. Leaked-password protection remains an authorized configuration release blocker.
- No RLS policies, grants, schema, financial data, or secrets were changed.


## Finance PR validation correction — 2026-10-30 06:31 Asia/Manila

- Rechecked PR #43 current code/test head `7f073831833a4078ef428632cafa69bfdb1f63eb`.
- GitHub Actions [run 40930065725](https://github.com/nasrinaiv0/movo/actions/runs/40930065725) completed successfully: typecheck passed, **19 test suites / 111 tests passed**, production build compiled.
- Vercel deployment [dpl_3Aey3AMPgXCrdSdjk6QkNAdSvyiB](https://vercel.com/nasrin-ai/movo/3Aey3AMPgXCrdSdjk6QkNAdSvyiB) is READY for that exact SHA.
- Updated PR #43's body to replace the stale statement that CI was still running.
- PR #43 remains a draft pending manual authenticated finance-flow, currency presentation, keyboard/screen-reader and mobile verification. No production merge occurred.


## Status correction — 2026-10-30 06:35 Asia/Manila

- **PR #55 — UI audit expansion:** exact head `76851d33b07126a63c34922adedc04464995e157`; Actions [40966145454](https://github.com/nasrinaiv0/movo/actions/runs/40966145454) passed **18 suites / 99 tests**, typecheck, `audit:controls`, and production build. Exact-head Vercel preview [dpl_9WXj8JdbfmMDb14TT4gr2d44A2PH](https://vercel.com/nasrin-ai/movo/9WXj8JdbfmMDb14TT4gr2d44A2PH) is READY. Three human-review warnings remain for disabled finance controls. PR #55 remains draft.
- **PR #56 — context-isolation current-main reconciliation:** exact head `c93b2393133f6b200f5ace83a8d5f78d1441e626`; Actions [40966718902](https://github.com/nasrinaiv0/movo/actions/runs/40966718902) passed **17 suites / 96 tests**, typecheck, and production build. Exact-head Vercel preview [dpl_9u9GwG5BRYPn3eqGci5uZGR3kVbk](https://vercel.com/nasrin-ai/movo/9u9GwG5BRYPn3eqGci5uZGR3kVbk) is READY. PR #56 remains draft pending authenticated end-to-end context-canary verification.
- **PR #43 — finance calculations/currency:** exact head `7f073831833a4078ef428632cafa69bfdb1f63eb`; Actions [40930065725](https://github.com/nasrinaiv0/movo/actions/runs/40930065725) passed **19 suites / 111 tests**, typecheck, and production build. Vercel preview [dpl_3Aey3AMPgXCrdSdjk6QkNAdSvyiB](https://vercel.com/nasrin-ai/movo/3Aey3AMPgXCrdSdjk6QkNAdSvyiB) is READY. PR #43 remains draft pending manual finance/accessibility verification.
- **Superseded branches:** PR #46 and PR #48 are closed as superseded, not merged; their current-main replacements are #55 and #56.
- **Production boundary:** all three implementation PRs remain preview-only. Issue #47 remains open until authenticated deployed context-isolation testing proves the MOVO scope is enforced end-to-end.


## Change-ledger documentation validation — 2026-10-30 06:37 Asia/Manila

- Current PR #54 documentation head: `45f0460fbcc0d20b05458f7900072fb6f3b55c36`.
- GitHub Actions [run 40967009818](https://github.com/nasrinaiv0/movo/actions/runs/40967009818) passed: **17 suites / 93 tests**, typecheck, and production compilation.
- Vercel exact-head deployment [dpl_2sJv43aawa41dx5U8k9HBMnMuSRB](https://vercel.com/nasrin-ai/movo/2sJv43aawa41dx5U8k9HBMnMuSRB) is READY.
- PR #54 remains draft and documentation-only. Its preview does not include the application changes in PRs #43, #55 or #56.


## Context-isolation PR consolidation — 2026-10-30 06:38 Asia/Manila

- PR #56 is the current-main context-isolation candidate, exact head `c93b2393133f6b200f5ace83a8d5f78d1441e626`, with Actions [40966718902](https://github.com/nasrinaiv0/movo/actions/runs/40966718902) passing 17 suites / 96 tests, typecheck and production build; exact-head Vercel preview [dpl_9u9GwG5BRYPn3eqGci5uZGR3kVbk](https://vercel.com/nasrin-ai/movo/9u9GwG5BRYPn3eqGci5uZGR3kVbk) is READY.
- Closed old PR #48 as superseded (not merged) by #56 because its branch was stale relative to current main.
- Closed PR #53 as a presentation-only workaround (not merged). Hiding the known unrelated paragraph could mask evidence of contamination and does not prevent it from entering model context, transcript, cache or logs.
- Issue #47 remains open. The fix is not considered complete until authenticated deployed tests with synthetic data and an unrelated-project canary prove the context boundary end-to-end.


## Chart PR validation correction — 2026-10-30 06:40 Asia/Manila

- Rechecked [PR #52](https://github.com/nasrinaiv0/movo/pull/52) current head `58b7a9e32dac650d517aa99bf7bfb94c4b39ac01`.
- GitHub Actions [run 40939100412](https://github.com/nasrinaiv0/movo/actions/runs/40939100412) completed successfully: **18 suites / 99 tests passed**, typecheck passed, production compilation succeeded.
- Vercel exact-head preview [dpl_9RQfwVQ6QChw2DrAoZw9ts6NW6ii](https://vercel.com/nasrin-ai/movo/9RQfwVQ6QChw2DrAoZw9ts6NW6ii) is READY.
- This corrects the earlier snapshot note that PR #52's current checks had not been revalidated. Real authenticated financial-data chart smoke testing, responsive rendering, and chart-data provenance remain unverified; PR #52 stays draft.


## Audit update — 2026-10-30 07:11 Asia/Manila — cross-project verification

MOVO main and production deployment remain unchanged at `82172294f80e360af9e7043de425a454c211078c` / deployment `dpl_7XobXwSNWuLa5a9HChdafyGoECeR` (READY). PR #56 remains open/draft at `c93b2393133f6b200f5ace83a8d5f78d1441e626`; exact-head Actions run [40966718902](https://github.com/nasrinaiv0/movo/actions/runs/40966718902) remains successful (17 suites / 96 tests, typecheck and build as recorded in the PR). No fresh run was returned for that unchanged SHA, and no authenticated production isolation test was performed.

NasrinAI upstream main advanced to `52392234ce7583303d4d25880296c06d7ad529b1` after PR #707's schema/security reconciliation. This does not itself deploy MOVO's context-isolation client. The current MOVO application-code baseline is still PR #50 merge `94d089d35483558b320f751cf122aa68755ef0eb`; issue #47 remains unresolved until authenticated canary testing proves the complete boundary.

Detailed checkpoint: [Audit delta](https://github.com/nasrinaiv0/movo/blob/docs/change-ledger-refresh-2026-10-30-0614/docs/engineering/updates/2026-10-30-0711-cross-project-monitoring.md) (commit 1f9f2c0f992fe4e595718404fc25750fdddd9dd1). No MOVO code, database, financial data, production settings, or PR states were changed.


## Audit checkpoint — 2026-10-30 08:17 Asia/Manila

- **MOVO main/production unchanged:** main `82172294f80e360af9e7043de425a454c211078c`; production deployment `dpl_7XobXwSNWuLa5a9HChdafyGoECeR` READY. Effective application-code baseline remains PR #50 merge `94d089d35483558b320f751cf122aa68755ef0eb`.
- **PR #56 remains the release-critical integration candidate:** documented head `c93b2393133f6b200f5ace83a8d5f78d1441e626`, open/draft. Existing CI #40966718902 and exact-head Vercel preview were successful, but no fresh authenticated context-canary test was performed. Issue #47 remains open and unresolved until unrelated context is proven absent from retrieval, provider prompts, responses, transcripts, caches, and logs.
- **PR #54 documentation branch:** current head `283a740c4ab1e2b5a98215dadd01beabd95aedd6`; branch is 35 ahead / 0 behind main. Current workflow #40973302563 `verify` job passed and Vercel preview `dpl_DpYqv38sEHF5eLtydgzd37z6aF5m` is READY. This is documentation validation only, not app behavior verification.
- **Other open implementation PRs:** #43, #52, and #55 remain open/draft in the current PR search. Their last recorded passing test results are historical exact-head evidence, not reruns in this cycle.
- **Carried-forward security warning:** leaked-password protection was previously reported disabled; Auth/RLS/grant checks must be freshly repeated before release.
- **No MOVO application or production state was changed in this monitoring cycle.**

Detailed evidence: [Audit delta — 2026-10-30 08:17](updates/2026-10-30-0817-movo-release-status.md).


## Follow-up status after documentation commit — 2026-10-30 08:18 Asia/Manila

The documentation update advanced PR #54 to head `7a0c9f4bcd032cef3268c06ee48465ccb3547feb`. The exact-head workflow run [#40979002452](https://github.com/nasrinaiv0/movo/actions/runs/40979002452) is still **in progress** (`verify` job in progress), and Vercel preview `dpl_HUmTRKLDHWy4qH9rhZjUDZN1RwYc` is **QUEUED**. The earlier head `283a740c4ab1e2b5a98215dadd01beabd95aedd6`, run #40973302563, and READY preview are prior-head evidence only. Do not claim the current documentation head is validated until the new workflow and preview finish.


## Final documentation-head correction — 2026-10-30 08:19 Asia/Manila

The SHA references in the earlier follow-up paragraphs are **intermediate commits**, not the final branch head: the master-ledger and detailed-delta updates were committed sequentially. After the last update in this checkpoint, the exact current head is the latest commit shown on [PR #54](https://github.com/nasrinaiv0/movo/pull/54). The previous workflow run was still in progress for an intermediate head, and the latest preview had been queued. Validation for the final documentation head is pending; use PR metadata and exact-head CI/Vercel status as the source of truth.

- **Current audit-document PR:** [#58](https://github.com/nasrinaiv0/movo/pull/58), open/draft, based on current main `bb30c8e...`; final-head CI and Documentation Gate must pass before merge.


## Production demo disclosure and current release gates — 2026-10-30 09:35 Asia/Manila

### Merged and production-verified
- PR #57 merged as `bb30c8e87722e51d0df07eef8031ebc5435b4093`. It moves the CRA build tool out of runtime dependencies and adds a production dependency audit gate. Exact-head GitHub Actions run [40982977495](https://github.com/nasrinaiv0/movo/actions/runs/40982977495) passed; `npm audit --omit=dev --audit-level=moderate` found **0 production dependency vulnerabilities**. The full install tree still reports **34 findings (16 low, 5 moderate, 13 high)**, largely in the CRA/build toolchain; this is not fully remediated.
- PR #59 merged as `277051e4ec2216a6b598c784a50b32ba37b89dee`. It replaces the unauthenticated demo's owner-like name/email with a generic demo identity and adds an accessible, responsive disclosure that the balances/transactions are fictional, not bank-linked, and not saved/synced as personal records. Its Sign in action is functional and the notice is hidden on sign-in/legal screens and in cloud mode.
- Production deployment [dpl_FRVNFKYmKHcrhnfvF8uhi7fwELVh](https://vercel.com/nasrin-ai/movo/FRVNFKYmKHcrhnfvF8uhi7fwELVh) is READY for the PR #59 merge SHA. Playwright Chromium against `https://movo.nasrinai.com` returned HTTP 200; the notice and generic demo identity were visible, neither `Nasrin Abubakar` nor `nasrin@nasrinai.com` appeared, there was no horizontal overflow at 390px, Sign in worked, Terms of Service and Privacy Policy opened/cross-linked, and no browser console/page errors or failed requests were recorded.
- Additional preview smoke verified Home, Wallet, Transactions, NasrinAI, Profile, Settings, Notifications, Search dialog open/Escape close, and Profile navigation without browser errors.
- A synthetic production POST to `/api/nasrinai/chat` with the allowed production origin but no Authorization header returned HTTP 401 `sign_in_required`. No user token, financial record, or provider secret was used.

### NasrinAI isolation: still a release blocker
- MOVO PR #56 exact head `36c486424a2f37591edb13d5a43936140515e217` passed GitHub Actions [40985264768](https://github.com/nasrinaiv0/movo/actions/runs/40985264768): **18 suites / 101 tests**, typecheck, production dependency audit, and production compilation. Its exact-head preview [dpl_BFQWqa1kAJu8mCpqMs3btR9j9ydj](https://vercel.com/nasrin-ai/movo/BFQWqa1kAJu8mCpqMs3btR9j9ydj) is READY.
- Added API-handler regression tests: unconfirmed scope returns 502 without persisting user/assistant messages; confirmed MOVO scope persists the authenticated user's turn; a conversation ID not owned by that user returns 404 before contacting upstream.
- Upstream NasrinAI PR #699 is merged. The latest NasrinAI production deployment is READY at commit `b39f4dcd62641d5f601e4e707cb46155ca8e135e`; source search at that deployed SHA finds the server-enforced `context_scope: "movo"` implementation in `src/chat.js`. This is deployment/source evidence, not a successful MOVO-authenticated request.
- The exact-head MOVO preview API could not be exercised through its protected route: Vercel SSO intercepted direct requests, and a browser request from the preview origin was rejected by the origin allowlist before reaching the auth gate. Production's no-token 401 is useful security evidence but does not prove the PR #56 scoped integration.
- **Do not merge PR #56 or close issue #47** until an authenticated end-to-end request proves the upstream returns the explicit MOVO scope marker and a synthetic unrelated-document canary is excluded from retrieval, provider prompt, response, transcript, caches, and logs. Do not expose/print/rotate keys without an authorized secret update.

### Open PRs and verification boundaries
- PR #43 (finance/currency) and PR #52 (chart formatting/validation) remain draft. Their automated source/test checks passed on their recorded heads, but authenticated finance writes, mixed-currency behavior against owned data, and chart provenance/rendering remain unverified.
- PR #55 (control/accessibility audit) remains draft and is currently reported as not mergeable against the newer main. Reconcile its branch with PR #59's demo disclosure and current main before considering merge. Static audit and automated tests do not replace interactive keyboard/screen-reader checks.
- PR #58 is the documentation reconciliation PR and should include this latest snapshot before merge.

### Remaining security/legal gates
- Read-only Supabase checks still show RLS enabled on the seven checked public profile/finance/chat tables, with 22 owner-scoped policies across the six user-facing tables and no `anon`/`PUBLIC` grants in the checked set. `movo_ai_upstream_conversations` intentionally remains server-only with `service_role` access and no browser policy.
- Supabase leaked-password protection is still disabled; enable it through authorized Auth settings and recheck the Security Advisor.
- Terms of Service and Privacy Policy navigation is now browser-verified in production, but publication warnings must remain until the operator/data-controller identity and address, actual retention/deletion schedule, provider/data-recipient disclosures, and jurisdiction-specific wording are verified. Do not invent legal facts.
- Full-tree dependency findings, authenticated finance/chat flows, CSV import/export, complete keyboard/focus and screen-reader behavior remain release gates.
- No database schema, RLS/grants, production financial data, or secrets were changed by the demo-disclosure implementation or this audit update.


## Current-state correction — 2026-10-30 10:10 Asia/Manila

This section supersedes any older snapshot text that still says PR #58 is awaiting merge.

- **Current main:** `ca1a680c78baf7c87347c960d56c7bc207041bc3`. PR #58 (audit-ledger reconciliation) merged at this commit; it is no longer an open PR.
- **New production app change:** PR #59 merged at `277051e4ec2216a6b598c784a50b32ba37b89dee`. It replaces owner-like identity in the unauthenticated sample demo with a generic Demo identity and adds an accessible disclosure that sample balances/transactions are fictional, not bank-linked, and not saved/synced as personal records. The READY production deployment is [dpl_FRVNFKYmKHcrhnfvF8uhi7fwELVh](https://vercel.com/nasrin-ai/movo/FRVNFKYmKHcrhnfvF8uhi7fwELVh). The production Playwright evidence is recorded in `docs/engineering/updates/2026-10-30-0935-production-demo-disclosure-and-chat-checks.md`; it was not re-run during the 10:10 monitoring pass.
- **PR #60 accessibility scanner:** current head `d80077b05067282fa76de16e7947aa73557e7550`, 23 commits ahead / 0 behind main, open/draft/mergeable. Exact-head Actions [#40989633601](https://github.com/nasrinaiv0/movo/actions/runs/40989633601) passed 20 suites / 111 tests, typecheck, `audit:controls`, production build, and production-only dependency audit (0 production findings). Preview [GYUYgJVSG3H3aHbeRvpH1b246vr7](https://vercel.com/nasrin-ai/movo/GYUYgJVSG3H3aHbeRvpH1b246vr7) reports success. Manual keyboard/focus, screen-reader, responsive and authenticated finance-flow verification remain open. Full dependency tree still reports 34 findings (16 low, 5 moderate, 13 high).
- **PR #56 context isolation:** current head `30aaaf0fedb50e7b73bb36f285c5b744247a2c0c`, 19 commits ahead / 0 behind main, open/draft/mergeable. Current Actions run [#40990086352](https://github.com/nasrinaiv0/movo/actions/runs/40990086352) was in progress at the time of this update; Vercel preview check [CaaFALv6sPd7vWa1xRFqUwDRiHh2](https://vercel.com/nasrin-ai/movo/CaaFALv6sPd7vWa1xRFqUwDRiHh2) reports success. Earlier passing run #40989833432 validates implementation head `1b3c939`, not the current documentation head `30aaaf0`.
- **Critical unresolved gate:** issue #47 remains open. No authenticated live scoped POST and unrelated-project canary has proven the full deployed context boundary. A no-token 401 is only auth-gate evidence.
- **Security/legal carry-forward:** Supabase leaked-password protection remains reported disabled; full-tree dependency findings and legal disclosure gaps remain open. No database/Auth/secrets changes were made in this review.
- Full details: [10:10 monitoring delta](updates/2026-10-30-1010-monitoring-delta.md).



### Exact-head follow-up — 2026-10-30 10:11 Asia/Manila

Correction to the initial 10:10 snapshot: PR #56 run [#40990086352](https://github.com/nasrinaiv0/movo/actions/runs/40990086352) has now completed successfully on exact head `30aaaf0fedb50e7b73bb36f285c5b744247a2c0c). It passed 18 suites / 103 tests, TypeScript typecheck, production-only dependency audit (0 vulnerabilities), and production compilation. Vercel check [CaaFALv6sPd7vWa1xRFqUwDRiHh2](https://vercel.com/nasrin-ai/movo/CaaFALv6sPd7vWa1xRFqUwDRiHh2) remains successful. The full dependency install still reports 34 findings (16 low, 5 moderate, 13 high), plus deprecation warnings for `glob@7.2.3`, `eslint@8.57.1`, and the Node.js 20 GitHub Actions runtime transition. These are not resolved by the clean production-only audit. The authenticated context-scope/canary gate remains unverified.


## Monitoring checkpoint — 2026-10-30 10:35 Asia/Manila
- No new application-code merge or production application deployment was detected since the 10:12 checkpoint. Main is ca1a680c78baf7c87347c960d56c7bc207041bc3 (documentation-only follow-up); production remains READY at application commit 277051e4ec2216a6b598c784a50b32ba37b89dee.
- Newly verified high-priority governance gap: main branch metadata reports protected=false and required checks enforcement off; repository rulesets endpoint returned an empty array. External organization/user-level rules were not separately verified. See [10:35 audit delta](updates/2026-10-30-1035-branch-protection-and-release-control.md).
- PR #61 documentation CI #40990360004 passed on exact head 04dea558066d56be34f2babe844ed0f5bed8d4c2 and its preview dpl_DgProVYtiyPMD7ZQEndJt1b9Zhjh is READY. PR remains open/draft.
- PR #56 exact-head CI #40990086352 passed (18 suites / 103 tests); authenticated context-scope/canary remains unverified. PR #60 exact-head CI #40989633601 passed (20 suites / 111 tests); manual accessibility checks remain open. PR #52's recorded exact-head run #40988481343 passed (18 suites / 101 tests); authorized financial-data chart verification remains open.
- Full dependency tree remains 34 findings (16 low, 5 moderate, 13 high) while production-only audit reports zero; keep these scopes distinct.
- No branch settings, code, database, secrets, or deployments were changed by monitoring.

## Monitoring record — 2026-10-30 11:14 Asia/Manila

### Repository/main
- Current main: `815ab66919894b271b90a5b1570b2fae949406c9`; documentation-only PR #61 is merged. Current main deployment dpl_CcPMxYfkaTHk4sdASzTA83QNNEAb is READY.
- All four open application PRs are zero commits behind main and mergeable, but intentionally remain drafts pending end-to-end/manual release gates.

### Finance UI fix in PR #43
- Current branch head: `600c49ab9f1b5cb0e0034afe59d00fdbd4a0d6dc`; implementation/test head: `5308948502127be913921522b598693feb21e533`.
- Found: Profile's top summary metrics used PHP-default formatting and account-type subtotals forced PHP even when the selected display currency was USD. Hidden balances also used the PHP mask.
- Fix: pass selected `displayCurrency` through `money()` and `shown()` for profile balance/income/expense and bank/card/e-wallet subtotals; no cross-currency aggregation or FX conversion introduced.
- Regression uses synthetic USD/PHP accounts and transactions, verifies USD metrics/subtotal and absence of PHP contamination, then verifies the `USD ••••••` privacy mask.
- Exact-head Actions #40996734432 (code/test head) and #40997019508 (latest docs head) passed 20 suites / 118 tests, typecheck, production-only audit (0 vulnerabilities), and production build. Latest preview dpl_FxojvcDKrnLv1rQJC1HfewT6mJwy READY.
- Still draft: authenticated cloud writes, CSV import/export, and real owner-scoped currency isolation are not verified. Full dependency tree has 34 findings (16 low, 5 moderate, 13 high), distinct from the clean production-only audit.

### Current validation snapshots
- **PR #52** head `64cfa5b9e746b249a07735ae934badcb7d842610`; Actions #40996821611 passed 18 suites / 101 tests, typecheck, production-only audit (0), build; preview dpl_HkwPPhisFzvU6MqLCW5uXvXvKmMF READY, root HTTP 200. Authenticated chart provenance remains unverified.
- **PR #56** head `337332bea5cabd533447e0913503b188794bca8e`; Actions #40996840860 passed 18 suites / 103 tests, typecheck, production-only audit (0), build; preview dpl_9t1ykdVhWkhHxLanDZK2xFnh33Wp READY, root HTTP 200. Authenticated scoped POST and unrelated-project canary are still absent; issue #47 remains open.
- **PR #60** head `015c35d041972080249e0bc71a6114bbbc4e6e19`; Actions #40996861622 passed 20 suites / 111 tests, typecheck, `audit:controls`, production-only audit (0), build; preview dpl_3zM4sjjSTbQbTkrGuv9sTPZ9pnJp READY, root HTTP 200. Manual keyboard/focus, screen-reader, responsive, and finance-flow checks remain open.

### Security/legal carry-forward
- Fresh read-only catalog check: 7 checked tables with RLS enabled; 22 policies across six user-facing tables all reference `auth.uid()`; no `anon`/`PUBLIC` grants on the checked tables; upstream mapping has no policies and no authenticated grants, with service-role-only grants.
- Security Advisor still reports leaked-password protection disabled. The available connector has no Auth-setting write action; no change was made.
- Terms/Privacy revisions in PR #56 are not yet deployed. Keep the publication warning until operator/controller identity/address, actual retention/deletion schedule, provider/data-recipient disclosures, and jurisdiction-specific review are confirmed.
- The protected deployment fetch in this checkpoint failed at Vercel's share-link/authentication layer before reaching the app; it is not API evidence. No authenticated chat canary was completed.
- No production data, database/RLS/grants, Auth settings, or secrets were changed.

## PR #63 — production disclosure correction and post-merge verification (2026-10-30 11:30 Asia/Manila)

- **PR:** [#63](https://github.com/nasrinaiv0/movo/pull/63); merged commit `1df043bcc54d59bee16fce806b601e09d647b06e`.
- **Scope:** copy/legal metadata only. Replaced the absolute “Your account stays isolated” claim with an explicit limitation stating that the upstream context boundary has not yet been independently verified end to end; users should avoid real/highly sensitive financial details until verification is complete. Added the same caveat to Privacy Policy and split Terms/Privacy effective dates (October 29 / October 30, 2026).
- **Exact-head CI:** [#40997576900](https://github.com/nasrinaiv0/movo/actions/runs/40997576900) passed 17 suites / 95 tests, TypeScript typecheck, production-only audit (0 vulnerabilities), and production build.
- **Preview:** dpl_8g7qW9jw11r68N6ygt2MbqzeBxHb READY, root HTTP 200; served bundle contained the caveat and no longer contained the old absolute claim.
- **Production:** deployment dpl_CoSq9dcgCG2qVbCkm1BBSeRU2r1U READY at merged commit; root HTTP 200. Served bundle verification confirmed the caveat, October 30 Privacy Policy date, and absence of the old claim.
- **Limit:** this improves transparency only; it does not establish or implement the upstream isolation boundary. Issue #47 and PR #56 remain open/draft pending authenticated scoped POST and unrelated-project canary.
- **Security:** no API behavior, data retrieval, auth, RLS, grants, database schema, financial records, or secrets changed.

## Post-hotfix current release snapshot — 2026-10-30 11:30 Asia/Manila
- #43 head `d6f2fcd40ad9c5438e031400dd5120d77272bec0`: 20 suites / 118 tests; typecheck; production-only audit (0); build; preview READY/root 200. Finance profile currency fix present; auth CRUD/CSV/currency-isolation gates open.
- #52 head `4b645666108174f31d4875d0da063bd8fe1c0170`: 18 suites / 101 tests; typecheck; production-only audit (0); build; preview READY/root 200. Authenticated chart provenance gate open.
- #56 head `06b5680b069ce17b75b9e2d63e3e0904bdda703e`: 18 suites / 103 tests; typecheck; production-only audit (0); build; preview READY/root 200. Upstream context canary gate open.
- #60 head `43087d907be095ef42d8fbcd7b8d9b2cc6723662`: 20 suites / 111 tests; typecheck, `audit:controls`, production-only audit (0), build; preview READY/root 200. Manual accessibility gate open.
- Fresh catalog: 7/7 checked tables RLS enabled; 22/22 policies on six user-facing tables reference `auth.uid()`; no checked anon/public grants; upstream mapping has no policies or authenticated grants and remains service-role-only.
- Rechecked governance: main branch API says protected=false, required checks enforcement off, and repository rulesets list empty. Full dependency tree 34 findings (16 low, 5 moderate, 13 high); production-only audit zero. Leaked-password protection remains disabled. Legal publication warning remains.


## Monitoring checkpoint — 2026-10-30 12:06 Asia/Manila (04:06 UTC)

**Scope and evidence standard:** This checkpoint uses current GitHub PR metadata, exact-head GitHub Actions workflow/job logs, current-main commit metadata, and Vercel deployment metadata. “READY” is deployment/build evidence, not proof of authenticated business behavior. No application code, production configuration, database, Auth setting, financial data, or secret was changed by this monitoring run.

### PR #63 — production privacy-disclosure correction

- **Status:** merged.
- **Merge commit:** `1df043bcc54d59bee16fce806b601e09d647b06e`.
- **Changed files:** `src/App.test.js`, `src/components/NasrinAIChat.js`, `src/screens/Legal.js`.
- **Before:** the chat disclosure said “Your account stays isolated,” an absolute guarantee not yet demonstrated by authenticated end-to-end tests. Terms and Privacy Policy shared the October 29, 2026 effective date.
- **After:** the chat and Privacy Policy disclose that the upstream context boundary has not yet been independently verified end to end and advise against sending real/highly sensitive financial details until verification is complete. Terms remains dated October 29, 2026; Privacy Policy is dated October 30, 2026. Regression tests assert the caveat, absence of the old absolute claim, and Privacy Policy date.
- **Rationale:** correct user-facing privacy claims to match verified evidence; do not represent a design intention as a proven production safeguard.
- **Dependencies/migrations:** none. The patch is copy, legal metadata, and regression assertions only; it does not change API handlers, retrieval, provider request shape, conversation persistence, authentication, RLS, grants, schema, or provider credentials.
- **Security/privacy impact:** materially improves disclosure accuracy, but does not implement or prove isolation.
- **Exact-head validation:** Actions run [#40997576900](https://github.com/nasrinaiv0/movo/actions/runs/40997576900) passed 17 suites / 95 tests, TypeScript typecheck, production-only dependency audit (0 vulnerabilities), and production build.
- **Production evidence:** Vercel deployment [dpl_CoSq9dcgCG2qVbCkm1BBSeRU2r1U](https://vercel.com/nasrin-ai/movo/CoSq9dcgCG2qVbCkm1BBSeRU2r1U) reached READY for the merged commit. The recorded post-merge smoke returned HTTP 200 and inspected the served bundle: caveat present, October 30 Privacy Policy date present, old “Your account stays isolated” claim absent. This smoke was recorded in the merged audit; it was not rerun by this monitoring call.
- **Unresolved gate:** issue [#47](https://github.com/nasrinaiv0/movo/issues/47) and PR [#56](https://github.com/nasrinaiv0/movo/pull/56) remain open/draft until an authenticated scoped POST and unrelated-project canary prove the boundary across retrieval, provider prompt/request, response, transcript, cache, and logs, including retries, missing scope confirmation, account switching, and sign-out/sign-in.

### PR #64 — post-merge audit documentation

- **Status:** merged; merge commit `9438e7c01c916a6b27f62e026fe9b4a4f6952f94`.
- **Changed files:** `docs/PR_PROGRESS.md`, `docs/claude/MOVO_IMPLEMENTATION_STATUS_AND_CLAUDE_HANDOFF.md`, `docs/engineering/MASTER_CHANGE_LEDGER.md`, `docs/engineering/updates/2026-10-30-1130-disclosure-hotfix.md`.
- **Behavior:** documentation-only; reconciles the merged disclosure fix, exact-head evidence, security findings, and remaining release gates. No runtime behavior changed.
- **Validation:** PR metadata confirms merge. Current-main Vercel deployment [dpl_3kHKpwFatSAawrVCtU19XNEECR3E](https://vercel.com/nasrin-ai/movo/3kHKpwFatSAawrVCtU19XNEECR3E) is READY at commit `9438e7c01c916a6b27f62e026fe9b4a4f6952f94`; aliases include `movo.nasrinai.com`. Main combined status reports Vercel success. The latest master ledger file was fetched from main; its content includes the PR #63 and post-hotfix release snapshot.

### Exact-head application candidates — current check

| PR | Exact current head | CI evidence | Preview | Status and remaining gate |
|---|---|---|---|---|
| [#43 Finance ledger/currency](https://github.com/nasrinaiv0/movo/pull/43) | `ad532e1df7ca14a0c0aebe0244d7b82d2bb0578e` | [#41000693424](https://github.com/nasrinaiv0/movo/actions/runs/41000693424): 20 suites / 125 tests passed; production audit 0; build compiled | [dpl_J9fnf3wcBzhUqyFZsmp9eVJypsiz](https://vercel.com/nasrin-ai/movo/J9fnf3wcBzhUqyFZsmp9eVJypsiz) READY | Open/draft. Authenticated finance CRUD/CSV and owner-scoped currency isolation remain unverified. |
| [#52 Chart currency/validation](https://github.com/nasrinaiv0/movo/pull/52) | `78b776497c8125f1637b2fb601965c1cc94e9b03` | [#40999382232](https://github.com/nasrinaiv0/movo/actions/runs/40999382232): 18 suites / 101 tests passed; production audit 0; build compiled | [dpl_76bUJdnfATaWSKRof8z33HKyZXzu](https://vercel.com/nasrin-ai/movo/76bUJdnfATaWSKRof8z33HKyZXzu) READY | Open/draft. Chart provenance and values against authorized finance records remain unverified. |
| [#56 Context isolation](https://github.com/nasrinaiv0/movo/pull/56) | `15e112149bf70b6ee1f141365a4b9ed9ffb9e6e5` | [#40999433274](https://github.com/nasrinaiv0/movo/actions/runs/40999433274): 18 suites / 103 tests passed; production audit 0; build compiled | [dpl_2EsxdALcYGPnwUWi9zydjTf8uahs](https://vercel.com/nasrin-ai/movo/2EsxdALcYGPnwUWi9zydjTf8uahs) READY | Open/draft. Authenticated scope-confirmation and unrelated-project canary remain the highest-priority release gate. |
| [#60 Accessibility/control audit](https://github.com/nasrinaiv0/movo/pull/60) | `12ba5b3b45065949626e3ecf49a777b9de44387b` | [#41000977707](https://github.com/nasrinaiv0/movo/actions/runs/41000977707): 20 suites / 112 tests passed; TypeScript typecheck, `audit:controls`, production audit (0), and build passed | [dpl_8TrpytetCKee3BJaNjMcXuVk64ac](https://vercel.com/nasrin-ai/movo/8TrpytetCKee3BJaNjMcXuVk64ac) READY | Open/draft. Manual keyboard/focus, screen-reader, responsive, live-control and authenticated finance-flow checks remain outstanding. |

For all four runs, the job logs show the full dependency install still reports **34 findings (16 low, 5 moderate, 13 high)**, while `npm audit --omit=dev` reports **0 production dependency vulnerabilities**. These are different scopes; do not describe the full dependency tree as clean.

### Security/privacy and governance findings carried forward

- The merged PR #64 ledger records a fresh read-only Supabase catalog check: 7/7 checked tables have RLS enabled; all 22 policies across six user-facing tables reference `auth.uid()`; no checked `anon`/`PUBLIC` grants; the upstream conversation mapping has no browser policy or authenticated grant and remains service-role-only.
- Supabase Security Advisor still reports leaked-password protection disabled. No Auth-setting write was performed or available in the recorded check.
- Repository-level GitHub checks still report MOVO `main` unprotected, required-check enforcement off, and no repository rulesets. This remains a release-governance blocker; no branch settings were changed.
- Legal publication warning remains until formal operator/controller identity and registered address, actual retention/deletion schedule, complete provider/data-recipient disclosures, and jurisdiction-specific review are confirmed.
- The static accessibility scan is not a substitute for manual interaction testing. Passing CI and READY previews do not prove authenticated financial correctness or upstream context isolation.

### Next actions

1. Keep #56 and issue #47 open until authenticated canary evidence verifies the entire context boundary.
2. Complete authenticated finance CRUD/CSV and currency-isolation checks for #43; validate chart provenance for #52.
3. Complete manual keyboard/focus, screen-reader, responsive and live-control checks for #60.
4. Enable and verify leaked-password protection through authorized Auth settings.
5. Establish required PR reviews/checks and anti-force-push rules for `main`.
6. Triage full-tree dependency findings separately from the clean production-only audit.
7. Keep the legal publication warning until the missing facts are verified; do not invent legal identity, retention, or provider details.


## Latest exact-head implementation checkpoint — 2026-10-30 12:52 Asia/Manila

### PR #56 — MOVO-only NasrinAI context isolation
- Current validated head: `ebb9156c9ee53507f577c468aea3c47d70e98501`.
- Added a fail-closed configuration guard: the server trims `NASRINAI_API_KEY`; an absent or whitespace-only value returns a generic HTTP 503 before database access or upstream fetch.
- Added a regression test proving the missing-key path makes no upstream request and persists no chat messages.
- GitHub Actions run [41004999162](https://github.com/nasrinaiv0/movo/actions/runs/41004999162) completed successfully: **18 suites / 104 tests passed**, TypeScript typecheck passed, production-only npm audit reported **0 production vulnerabilities**, and the production bundle compiled successfully.
- Exact-head Vercel preview [dpl_3a9cpyAxbi6czd3He8sPwFbxDKYw](https://vercel.com/nasrin-ai/movo/3a9cpyAxbi6czd3He8sPwFbxDKYw) is **READY**; the preview root returned HTTP 200.
- The guard improves missing-configuration behavior but does not resolve an upstream HTTP 401 for a non-empty credential that the upstream rejects. Vercel logs previously recorded 8 upstream 401s, last at 2026-10-29 15:37:46 UTC. A one-hour runtime-error check on this run returned no new error groups; that absence is not evidence that chat works.
- The authenticated preview API request was blocked by Vercel Authentication before reaching the application endpoint. No authenticated live POST, upstream scope confirmation, or unrelated-project canary was completed. Issue #47 stays open; PR #56 stays draft.

### PR #60 — unsupported Settings controls
- Current validated head: `f063cd5a1f4be085aac34f947816bfdffe2c8a82`.
- Added regression coverage for Push Notifications, Email Notifications, Face ID/Touch ID, Local Storage, and Auto Categorization. Each must be disabled and have its visible explanation associated through `aria-describedby`. The same test confirms In-App Alerts remains enabled and updates its preference.
- GitHub Actions run [41005003149](https://github.com/nasrinaiv0/movo/actions/runs/41005003149) completed successfully: **20 suites / 113 tests passed**, TypeScript typecheck passed, `audit:controls` passed, production-only npm audit reported **0 production vulnerabilities**, and the production bundle compiled successfully.
- Exact-head Vercel preview [dpl_2jdQniZNbdppvmTQ88JcYyfuqGWb](https://vercel.com/nasrin-ai/movo/2jdQniZNbdppvmTQ88JcYyfuqGWb) is **READY**; the preview root returned HTTP 200.
- Automated tests do not replace keyboard-only/focus, screen-reader, responsive, and authenticated finance-flow checks. PR #60 stays draft until these gates are completed.

### Security and release boundary
- The full dependency-tree audit still reports **34 findings (16 low, 5 moderate, 13 high)**. The zero-vulnerability result is limited to the production dependency tree; no broad forced upgrade was applied.
- Previously recorded read-only Supabase catalog evidence remains the latest available snapshot: RLS enabled on the seven checked public tables, 22 policies across six user-facing tables referencing `auth.uid()`, no checked `anon`/`PUBLIC` table grants, and the upstream mapping restricted to server-side service-role access. No database schema, RLS policy, grant, Auth setting, financial record, or secret was changed in this run.
- Supabase leaked-password protection remains an owner-authorized configuration blocker. Repository branch protection was previously found disabled with no required status checks; no branch-governance write action is available through the connected GitHub tools.
- Terms and Privacy Policy remain linked and explicitly warn that formal controller/operator identity and address, a fixed retention/deletion schedule, complete provider/data-recipient details, and jurisdiction-specific review are outstanding. Do not invent those legal facts.
- Authenticated cloud finance/CSV/currency-isolation verification, chart provenance against authorized records, the upstream MOVO-scope canary, and interactive accessibility QA remain unverified.
- No database schema/RLS/grants, production financial records, Auth settings, provider secret, or separate NasrinAI repository was changed in this run.

### Next actions
1. Obtain an authorized, valid MOVO service credential through the NasrinAI owner/control plane and verify a successful authenticated request without logging the credential.
2. Run the synthetic unrelated-document canary across retrieval, prompt, response, transcript, cache, retries, and logs; verify missing scope fails closed.
3. Verify signed-in financial CRUD, CSV import/export, currency isolation, and chart provenance with synthetic user-owned records.
4. Complete interactive keyboard/focus, screen-reader, and responsive checks for all visible controls.
5. Have the owner/legal reviewer supply missing publication facts; enable leaked-password protection and required branch checks through authorized project settings.


## Fresh Supabase read-only security recheck — 2026-10-30 12:54 Asia/Manila

- Catalog query: RLS is enabled on **7/7 checked public tables**: profiles, financial_accounts, transactions, budgets, movo_ai_conversations, movo_ai_messages, and movo_ai_upstream_conversations.
- The six user-facing tables have **22 policies**; each checked policy expression references `auth.uid()`. The upstream mapping has no client policy.
- `information_schema.role_table_grants` returned **73 grants** for `authenticated` and `service_role` across the checked tables, with **no `anon` or `PUBLIC` grants** in the checked set. The upstream mapping grants are limited to `service_role`; do not add a client policy/grant.
- Fresh Security Advisor findings: `auth_leaked_password_protection` remains WARN (disabled); `rls_enabled_no_policy` for the server-only upstream mapping remains INFO and intentional. Performance Advisor reports seven unused indexes; no index was dropped without query evidence.
- This was a read-only metadata/advisor check. No schema, RLS policy, grant, Auth setting, financial row, or secret was changed.

## PR #60 currency settings copy reconciliation — 2026-10-30 12:04 Asia/Manila

- Removed an obsolete Settings row claiming only PHP is available; it conflicts with PR #43's multi-currency/display-currency implementation.
- Added a regression test; removed a temporary placeholder object before validation.
- Commits: `4baa597637f9888be4698ee055dc43da775028fa`, `df85cae40c666b19d162e0747898e3da98194e48`, `110c5d79d7b5623972d71ada13883161f1ec2576`.
- Evidence: [currency settings copy reconciliation](updates/2026-10-30-1204-currency-settings-copy.md).
- Exact final-head checks pending. No finance logic, database, Auth settings, production data, or secrets changed.

## Exact-head validation result — 2026-10-30 12:05 Asia/Manila

- Validated source/test/documentation head: `97f206a33ad3c9c4f6483dc8fee7f37c17f8be54`.
- GitHub Actions run [41000813433](https://github.com/nasrinaiv0/movo/actions/runs/41000813433) completed successfully: **20/20 test suites and 112/112 tests passed**, TypeScript typecheck passed, `audit:controls` passed, production-only npm audit reported **0 vulnerabilities**, and production compilation succeeded.
- Vercel preview [dpl_HT8FavT14Eg6aGjnyoAeUiYAT5SY](https://vercel.com/nasrin-ai/movo/HT8FavT14Eg6aGjnyoAeUiYAT5SY) reached **READY** for the same head; the preview root returned HTTP 200.
- The Settings regression prevents the stale PHP-only claim from returning. The static control audit is still only a source-level guardrail; it does not prove callback business correctness or real assistive-technology behavior.
- The full dependency tree still reports 34 findings (16 low, 5 moderate, 13 high); the production-only audit does not clear those development/build-tool findings.
- **Still outstanding:** interactive keyboard/focus and screen-reader checks, responsive interactions, authenticated finance/CSV/currency verification, upstream MOVO-scope canary, legal publication details, and Supabase leaked-password protection. PR #60 remains draft.
- No finance data logic, database schema/RLS/grants, Auth settings, production records, or secrets changed in this increment.

## PR #60 — notification settings disabled-state verification — 2026-10-30 12:58 Asia/Manila

- Current code/test head before reconciliation: `9c38028cbf3a11675f16db09d0fb41190fd5f71d`.
- Added regression coverage for unsupported notification channels and demo-only notification categories. Push Notifications, Email Notifications, Account & Security, NasrinAI Updates, Promotions, and Reports must be disabled and have their visible reason linked through `aria-describedby`. In-App Alerts and Transactions category toggles remain functional.
- Improved visible copy for demo-only categories so disabled-state explanations explicitly say that live delivery is not connected and only sample/demo alerts are available.
- The first test attempt at `776b9af8d955f220406f48dbc7f573950ae89380` failed: **1 test failed / 113 passed** because the test expected a sample/demo explanation that the rendered description did not contain. The next source-only commit `02155f4501f56d8b7fa2fb79143af33730dc28a1` also failed while the assertion still expected the old text. The assertion was corrected in `9c38028cbf3a11675f16db09d0fb41190fd5f71d`; latest Vercel build logs confirm **20 suites / 114 tests passed**, `tsc --noEmit` passed, `audit:controls` ran, and the production bundle compiled successfully.
- Exact-head preview [dpl_HGwfQSwmFiJ5j17MzDmoLKB2he4X](https://vercel.com/nasrin-ai/movo/HGwfQSwmFiJ5j17MzDmoLKB2he4X) is READY. Preview root and JS bundle returned HTTP 200; the bundle contains all four explicit sample/demo-only descriptions.
- No GitHub Actions run was available for the exact head `9c38028` during this checkpoint. The preceding exact-head Actions run [41005003149](https://github.com/nasrinaiv0/movo/actions/runs/41005003149) passed **20 suites / 113 tests**, typecheck, `audit:controls`, production-only audit (0 vulnerabilities), and build at `f063cd5a1f4be085aac34f947816bfdffe2c8a82`. The dependency manifest is unchanged since that run, but the production-only audit was not independently rerun on `9c38028`. Full dependency-tree audit still reports 34 findings (16 low, 5 moderate, 13 high).
- **Keep draft:** interactive keyboard/focus, screen-reader, responsive behavior, and authenticated finance/CSV/currency flows remain unverified. This PR is also being reconciled with current main's documentation-only merge.
- No database schema, RLS/grants, Auth setting, financial records, provider secrets, or other repository were changed.
