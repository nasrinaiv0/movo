# MOVO Audit Delta — 2026-10-30 09:20 Asia/Manila (01:20 UTC)

- Repository: https://github.com/nasrinaiv0/movo
- Scope: MOVO repository, its own deployment, and its observed upstream chat integration.
- Current main: `bb30c8e87722e51d0df07eef8031ebc5435b4093`, merge of PR #57.
- Current production: [Vercel deployment dpl_6tmjn2FNfCFEpwCessZcjE2ibBjq](https://vercel.com/nasrin-ai/movo/6tmjn2FNfCFEpwCessZcjE2ibBjq) is READY at the same SHA and carries the `movo.nasrinai.com` alias.
- No application code, production configuration, secret values, user financial records, migrations, merges, or deployments were changed by this audit.

## PR #57 — runtime dependency classification and production audit gate

- PR: https://github.com/nasrinaiv0/movo/pull/57; head `86b187c40633550ff4fd34a8b41cb19d0cb7311e`; merge/main commit `bb30c8e87722e51d0df07eef8031ebc5435b4093`; merged 2026-10-30T01:18:27Z.
- Changed paths: `.github/workflows/phase1-ci.yml`, `docs/NASRINAI_MOVO_INTEGRATION.md`, `docs/engineering/MASTER_CHANGE_LEDGER.md`, `docs/engineering/updates/2026-10-30-0850-runtime-dependency-scope.md`, `package.json` (5 files; 91 additions, 2 deletions).
- Before: `react-scripts@5.0.1` was classified as a production dependency, and CI lacked a required production-only dependency audit.
- After: `react-scripts` is in `devDependencies`; `npm run audit:production` executes `npm audit --omit=dev`; Phase 1 CI runs the production audit before tests and the production build.
- Exact-head CI: [#40982977495](https://github.com/nasrinaiv0/movo/actions/runs/40982977495) succeeded; install, production dependency audit, tests, and production bundle steps all passed.
- Production: deployment `dpl_6tmjn2FNfCFEpwCessZcjE2ibBjq` is READY at main SHA `bb30c8e87722e51d0df07eef8031ebc5435b4093`.
- Dependency status: the recorded sandbox experiment reported zero production-tree advisories, while the full development/build tree still had 34 advisories (16 low, 5 moderate, 13 high, 0 critical), concentrated in CRA tooling. Do not call the full tree clean.
- Reproducibility follow-up: no lockfile was included among the changed paths; the audit record says the install was performed without a committed lockfile. Verify whether a lockfile is absent and consider a separate reproducible-install change.
- This change does not rotate the upstream API key or prove embedded chat works.

## PR #56 — MOVO-only chat context boundary

- PR: https://github.com/nasrinaiv0/movo/pull/56; current head `36c486424a2f37591edb13d5a43936140515e217`; open/draft.
- Compared with current main `bb30c8e87722e51d0df07eef8031ebc5435b4093`: 10 commits ahead / 2 behind. Reconcile with current main and rerun checks before merge.
- Changed paths: `api/nasrinai/chat.js`, `docs/NASRINAI_CHAT_INTEGRATION.md`, `src/components/NasrinAIChat.js`, `src/components/NasrinAIChat.test.js`, `src/lib/nasrinaiApiHandler.test.js`, `src/lib/nasrinaiChat.test.js` (6 files; 639 additions, 121 deletions).
- Before: production client remains on the older integration. A prior preview at commit `d822aa094b5205b688505921e03d6ea2693dfc6b` failed `npm run build` with 2 failing tests, 99 passing tests (101 total; 1 of 18 suites failed).
- Current candidate behavior: send the actual question separately from bounded allowlisted financial JSON; use server-enforced `context_scope: "movo"`; do not send an upstream conversation ID; require explicit scope confirmation; reject/unpersist unconfirmed replies; normalize malformed financial fields without defaulting invalid values to zero/PHP; clear legacy chat state on account switch/rollout.
- Latest test-only commit `36c4864` mocks `AbortSignal.timeout` in API-handler tests and restores the original global after each test.
- Exact-head CI: [#40985264768](https://github.com/nasrinaiv0/movo/actions/runs/40985264768) passed; install, production dependency audit, tests, and production bundle steps succeeded.
- Preview: [dpl_BFQWqa1kAJu8mCpqMs3btR9j9ydj](https://vercel.com/nasrin-ai/movo/BFQWqa1kAJu8mCpqMs3btR9j9ydj) is READY at exact head `36c4864...`; preview only.
- Production authenticated scope confirmation and a harmless unrelated-project canary are not verified. Issue #47 remains open until unrelated content is proven absent from retrieval, provider requests, responses, persisted transcripts, caches, and logs.

## PR #55 — repeatable UI control/ARIA audit

- PR: https://github.com/nasrinaiv0/movo/pull/55; head `e191c8c421f5410d099da903c3ab3541ae03a65e`; open/draft; 26 ahead / 2 behind current main.
- Changed paths: `docs/UI_CONTROL_AUDIT.md`, `package.json`, `scripts/audit-ui-controls.js`, `src/App.css`, `src/App.js`, `src/App.test.js`, `src/components/ui.js`, `src/components/ui.test.js`, `src/lib/format.js`, `src/lib/uiControlAudit.test.js`, `src/screens/Legal.test.js`, `src/screens/Profile.js`, `src/screens/Settings.js`, `src/screens/Settings.test.js`, `src/screens/Wallet.js` (15 files; 620 additions, 45 deletions).
- Adds an AST-based control/ARIA scanner and `npm run audit:controls` prebuild gate with regression tests. It cannot prove runtime focus or screen-reader behavior.
- Exact-head CI: [#40984662087](https://github.com/nasrinaiv0/movo/actions/runs/40984662087) passed. Preview [dpl_69NHnHj1DYxeFNQiA1UovXe1Qgwb](https://vercel.com/nasrin-ai/movo/69NHnHj1DYxeFNQiA1UovXe1Qgwb) is READY.
- Manual keyboard, screen-reader, mobile, and authenticated finance-flow QA remain outstanding.

## Production telemetry — upstream authentication remains unproven

- A Vercel production query over the prior 24 hours returned repeated `POST /api/nasrinai/chat` upstream HTTP 401 events. Latest returned event: `2026-10-29T15:37:50.463Z`; several were tagged `key_format_secret_format`. These came from earlier production deployments, not the new package/CI commit.
- A separate production error/warning query for the latest hour returned no matching logs.
- No successful authenticated chat request was established. Absence of recent error logs is not proof of recovery. The credential was not decrypted or logged.
- Verify/rotate the server credential only through authorized secret management, then run one authenticated production chat smoke test and record sanitized success evidence.

## Next actions

1. Reconcile PRs #56 and #55 with current main `bb30c8e87722e51d0df07eef8031ebc5435b4093`; rerun exact-head CI after reconciliation.
2. For PR #56, test missing scope confirmation, retries, account switching, sign-out/sign-in, transcript persistence, cache behavior, and exclusion of a harmless unrelated-project canary.
3. Verify upstream authentication in production without exposing the credential value; keep issue #47 open until isolation is demonstrated.
4. For PR #55, complete keyboard, screen-reader, mobile and authenticated finance-flow QA.
5. Track the 34 full-tree CRA/toolchain advisories separately; production-only audit passing does not eliminate build-toolchain risk.

## Evidence

- Main commit: https://github.com/nasrinaiv0/movo/commit/bb30c8e87722e51d0df07eef8031ebc5435b4093
- PR #57 / CI: https://github.com/nasrinaiv0/movo/pull/57 and https://github.com/nasrinaiv0/movo/actions/runs/40982977495
- PR #56 / CI: https://github.com/nasrinaiv0/movo/pull/56 and https://github.com/nasrinaiv0/movo/actions/runs/40985264768
- PR #55 / CI: https://github.com/nasrinaiv0/movo/pull/55 and https://github.com/nasrinaiv0/movo/actions/runs/40984662087
- Production: https://vercel.com/nasrin-ai/movo/6tmjn2FNfCFEpwCessZcjE2ibBjq
- PR #56 preview: https://vercel.com/nasrin-ai/movo/BFQWqa1kAJu8mCpqMs3btR9j9ydj
- Earlier failed preview: https://vercel.com/nasrin-ai/movo/HWUUacvCA1uVFR3u6xJdWX75dRVT
