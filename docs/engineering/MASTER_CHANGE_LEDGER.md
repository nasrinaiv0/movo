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
