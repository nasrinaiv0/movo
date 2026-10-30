# MOVO Audit Delta — Cross-project verification checkpoint

**Audit timestamp:** 2026-10-30 07:11 Asia/Manila (2026-10-29 23:11 UTC)  
**Repository:** https://github.com/nasrinaiv0/movo  
**Scope:** MOVO application, its production Vercel deployment, and the upstream NasrinAI dependency only where relevant to the integration contract.  
**Method:** Read-only GitHub/Vercel inspection. No MOVO application code, production configuration, database schema, financial data, or PR state was changed.

## Executive status

- **MOVO main remains:** `82172294f80e360af9e7043de425a454c211078c`.
- **Production deployment:** [`dpl_7XobXwSNWuLa5a9HChdafyGoECeR`](https://vercel.com/nasrin-ai/movo/7XobXwSNWuLa5a9HChdafyGoECeR) reports READY at main SHA `82172294...`. This is still the documentation-only PR #51 merge; the effective application-code baseline remains PR #50 merge `94d089d35483558b320f751cf122aa68755ef0eb`.
- **PR #56 — MOVO-only context boundary:** remains open and draft at exact head `c93b2393133f6b200f5ace83a8d5f78d1441e626`. GitHub Actions [run 40966718902](https://github.com/nasrinaiv0/movo/actions/runs/40966718902) is successful. The PR describes 17 suites / 96 tests, typecheck, and production compilation as passing; this audit did not rerun the test suite locally.
- **Production isolation:** not verified. Issue #47 remains the release blocker until authenticated, synthetic-data canary tests prove end-to-end context isolation.
- **Upstream NasrinAI:** main has advanced to `52392234ce7583303d4d25880296c06d7ad529b1` after PR #707 production schema/security reconciliation. This changes OCC/schema/security documentation and migrations 083/084; it does not by itself change MOVO's client integration. The upstream MOVO-scope endpoint from PR #699 was already deployed in the earlier snapshot.

## Change record — no new MOVO application commit observed

The latest MOVO main commit and production deployment are unchanged from the prior audit snapshot. No new MOVO implementation commit, merge, or production application-code deployment was observed in this run.

The current context-isolation candidate remains [PR #56](https://github.com/nasrinaiv0/movo/pull/56). Its intended contract remains:
- Send the actual user question separately from bounded, allowlisted finance JSON.
- Set `context_scope: "movo"`; do not forward an upstream conversation ID.
- Require explicit upstream scope confirmation and fail closed if absent or incorrect.
- Clear visible chat state, draft, consent, error and conversation ID on account switch; start a clean chat for each signed-in user during rollout.
- Validate amounts/currencies/labels without silently inventing zeros or PHP defaults; exclude notes and unexpected columns.
- Preserve authenticated JWT, owner-scoped finance reads, RLS, and server-only upstream mapping/secrets.

**Current-head verification:** GitHub Actions run 40966718902 remains successful for exact head `c93b239...`. No new run was returned for that same SHA, so this is the existing exact-head result, not a fresh rerun. The PR's linked Vercel preview `dpl_9u9GwG5BRYPn3eqGci5uZGR3kVbk` was previously reported READY; this audit did not execute a live authenticated smoke test.

## Security/privacy release gate

Do not mark issue #47 fixed based on a green CI run, a READY preview, or upstream deployment alone. Before merge/release, test with a signed-in synthetic account and unique unrelated-project canary. Verify the canary is absent from retrieval, provider prompt, response, transcript, cache, and logs; verify fail-closed behavior for missing/wrong scope, upstream failure, retry, account switching, sign-out/sign-in, and stale in-flight responses. Confirm the scoped response still supports the Markdown/chart payloads consumed by `NasrinAIMessage`.

The earlier Supabase review reported RLS enabled on the checked MOVO finance/chat tables, owner-scoped policies, no anon table grants in the checked set, and service-role-only access to upstream conversation mapping. Those checks were not rerun during this audit. Supabase leaked-password protection remains a previously documented release blocker and should be freshly checked before release.

## Next actions

1. Reconcile PR #56 to the latest main if it changes; rerun CI on the final exact head.
2. Perform authenticated end-to-end scope-canary tests against the deployed upstream and MOVO preview; keep issue #47 open until successful.
3. Confirm the server request contains only allowlisted finance fields and the actual question is separate from the JSON context.
4. Test scope-missing/wrong, timeout/retry, account switch, sign-out/sign-in, and stale-response paths; inspect redacted traces without exposing financial data.
5. Re-run production Supabase RLS/grant/Auth checks and the dependency audit before release.
6. Complete manual finance, keyboard, screen-reader, mobile, and legal verification for other open MOVO PRs.

## Change-control statement

This checkpoint changed documentation only on the existing MOVO audit branch. No application code, financial records, database settings, migrations, production deployments, PR states, or secrets were changed.
