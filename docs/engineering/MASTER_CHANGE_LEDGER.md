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
