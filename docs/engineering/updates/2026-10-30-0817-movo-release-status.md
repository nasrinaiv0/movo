# MOVO Audit Delta — release state and context-isolation blocker

**Audit timestamp:** 2026-10-30 08:17 Asia/Manila (2026-10-30 00:17 UTC)  
**Repository:** https://github.com/nasrinaiv0/movo  
**Scope:** MOVO production/main, open implementation PRs, current CI/deployment evidence, documentation PR #54, and the upstream NasrinAI dependency where it affects MOVO's scope contract.  
**Method:** Read-only GitHub/Vercel metadata and CI-job inspection. No MOVO application code, financial data, production database, secrets, configuration, or PR state was changed.

## Executive status

- **MOVO main:** unchanged at `82172294f80e360af9e7043de425a454c211078c`.
- **Production deployment:** `dpl_7XobXwSNWuLa5a9HChdafyGoECeR` reports **READY** at the same main SHA. This deployment corresponds to documentation-only PR #51; it does not include the context-isolation candidate in PR #56.
- **Effective production application-code baseline:** PR #50 merge `94d089d35483558b320f751cf122aa68755ef0eb`.
- **PR #56 — MOVO-only NasrinAI context boundary:** still open and draft at documented exact head `c93b2393133f6b200f5ace83a8d5f78d1441e626`. Existing exact-head CI run #40966718902 was successful (17 suites / 96 tests, typecheck and production compilation as recorded in the PR); this is not a fresh test rerun in this cycle. Vercel preview check remains successful/READY.
- **Issue #47 — unrelated context in finance chat:** remains open in the repository's open-issue search and is still the release blocker.
- **No MOVO application-code merge or production application-code deployment was observed in this cycle.**

## Change record: no new MOVO application-code change observed

The most recent production deployment is unchanged. The latest commits observed on main are still within the documentation-only handoff lineage; the application behavior currently deployed remains the PR #50 rich-reply baseline.

### Current-main / production evidence

- Main commit: https://github.com/nasrinaiv0/movo/commit/82172294f80e360af9e7043de425a454c211078c
- Production deployment: https://vercel.com/nasrin-ai/movo/7XobXwSNWuLa5a9HChdafyGoECeR
- GitHub combined status on main: Vercel success.
- Production deployment is **READY**, but READY does not prove the finance flow or context isolation works correctly end to end.

## Context-isolation release gate: PR #56

**PR:** https://github.com/nasrinaiv0/movo/pull/56  
**Current candidate head recorded by PR:** `c93b2393133f6b200f5ace83a8d5f78d1441e626`  
**Existing CI evidence:** https://github.com/nasrinaiv0/movo/actions/runs/40966718902  
**Exact-head preview:** https://vercel.com/nasrin-ai/movo/9u9GwG5BRYPn3eqGci5uZGR3kVbk

The intended implementation contract is:

1. Send the user's actual question separately from bounded, allowlisted finance JSON.
2. Set `context_scope: "movo"`; send only permitted accounts, recent transactions, and budgets.
3. Do not forward an upstream conversation ID; use stateless requests.
4. Require explicit upstream `context_scope: "movo"` confirmation; fail closed without displaying or saving an unconfirmed reply.
5. Clear visible chat state, draft, consent, errors and conversation ID on account switch; use a clean conversation per signed-in user during rollout to avoid restoring a legacy contaminated thread.
6. Validate finance amounts/currencies/labels; do not silently coerce invalid amounts to zero or unknown currency to PHP; exclude notes and unexpected columns.
7. Preserve authenticated JWT, owner filters and RLS for finance reads. Keep upstream credentials and the conversation mapping server-only.

### Security/privacy boundary

A green CI run and READY preview are not proof that unrelated portfolio/project data is excluded from retrieval, provider prompts, replies, transcripts, caches, or logs. The upstream NasrinAI scope enforcement is deployed, but the complete MOVO integration remains preview-only.

Before merge/release, run authenticated tests with a synthetic MOVO account and unique unrelated-project canary. Verify the canary is absent from each of those data paths. Also test missing/wrong scope confirmation, timeout, retry, upstream failure, account switch, sign-out/sign-in, and stale in-flight responses. Confirm the scoped response still supports the Markdown/chart payload consumed by the rich reply renderer.

**Not performed in this monitoring cycle:** authenticated production or preview finance chat, canary injection, browser inspection, or provider-prompt/log inspection. Issue #47 must remain open until these tests pass.

## Documentation PR #54 — current exact-head status

**PR:** https://github.com/nasrinaiv0/movo/pull/54  
**Head:** `283a740c4ab1e2b5a98215dadd01beabd95aedd6`  
**Base/main:** `82172294f80e360af9e7043de425a454c211078c`  
**Branch comparison:** 35 commits ahead, 0 behind; changes are audit/handoff documentation, not application-code changes.  
**Current workflow:** [run #40973302563](https://github.com/nasrinaiv0/movo/actions/runs/40973302563) completed successfully; the `verify` job passed.  
**Vercel preview:** [deployment `dpl_DpYqv38sEHF5eLtydgzd37z6aF5m`](https://vercel.com/nasrin-ai/movo/DpYqv38sEHF5eLtydgzd37z6aF5m) is READY for the current docs head.

This verifies the documentation branch's current check and preview status. It does **not** validate the production finance flow or the implementation in PRs #43, #52, #55, or #56. PR #54 remains open/draft and has not been merged.

## Other open implementation PRs — carried-forward evidence, not freshly rerun

- **PR #43 — single-currency ledger/balance consistency:** open/draft. Last recorded exact-head CI #40930065725 passed 19 suites / 111 tests, typecheck and production build for `7f073831833a4078ef428632cafa69bfdb1f63eb`; not rerun in this cycle.
- **PR #52 — chart currency/value validation:** open/draft. Last recorded exact-head CI #40939100412 passed 18 suites / 99 tests, typecheck and production compilation for `58b7a9e32dac650d517aa99bf7bfb94c4b39ac01`; not rerun in this cycle.
- **PR #55 — static UI-control/ARIA audit:** open/draft. Last recorded exact-head CI #40966145454 passed 18 suites / 99 tests, typecheck, `audit:controls`, and production compilation for `76851d33b07126a63c34922adedc04464995e157`; not rerun in this cycle. Its documented disabled-control warnings and the need for human accessibility review remain.
- These prior exact-head results should not be mistaken for current-head reruns if a PR head changes.

## Carried-forward security findings (not freshly rechecked in this cycle)

A previous read-only Supabase review reported RLS enabled on the checked finance/chat tables, owner-scoped policies, no `anon` table grants in the checked set, and service-role-only access to the upstream conversation mapping. The same review reported Supabase Auth leaked-password protection disabled. Re-run the production Auth/RLS/grant checks before release; do not treat the older snapshot as fresh evidence.

## Next actions

1. Reconcile PR #56 against current main if any head change occurs; rerun CI on the final exact head.
2. Perform authenticated synthetic-data context-canary tests on the preview and then the intended production release. Keep issue #47 open until all paths are verified.
3. Verify malformed/missing scope responses fail closed and are not saved or displayed.
4. Inspect redacted provider requests and persistence paths without exposing financial data.
5. Re-run production Supabase Auth/RLS/grant checks and dependency audit.
6. Complete manual finance, currency, keyboard, screen-reader, responsive, and legal verification for the other open implementation PRs.
7. Keep PR #54 documentation-only; do not interpret its successful `verify` job as application integration coverage.

## Change-control statement

No MOVO application code, financial records, database schema/policies/grants, production settings, secrets, deployments, or PR states were changed by this monitoring run. The only repository writes are this audit delta and an appended master-ledger entry on the existing documentation branch.


## Follow-up status after documentation commit — 2026-10-30 08:18 Asia/Manila

Writing the audit update advanced PR #54 to current head `7a0c9f4bcd032cef3268c06ee48465ccb3547feb`. Exact-head workflow [#40979002452](https://github.com/nasrinaiv0/movo/actions/runs/40979002452) remains in progress; its `verify` job has not completed. Exact-head Vercel deployment `dpl_HUmTRKLDHWy4qH9rhZjUDZN1RwYc` is queued. The prior successful run #40973302563 and READY preview `dpl_DpYqv38sEHF5eLtydgzd37z6aF5m` apply to the earlier SHA `283a740...` only. Current-head validation is pending.
