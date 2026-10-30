# MOVO Implementation Status and Claude Handoff

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



**Repository:** `nasrinaiv0/movo`  
**Branch:** `main` is the target branch; this document was added on a documentation-only branch.  
**Status snapshot:** 2026-10-30  
**Audience:** Claude / the engineer continuing implementation  
**Purpose:** Provide a traceable, evidence-conscious handoff so work can continue without treating prior summaries or merged code as proof of end-to-end functionality.

> **Scope boundary:** This document is for the MOVO repository only. Do not mix MOVO implementation notes, financial records, app state, deployment settings, or product requirements with the separate NasrinAI repository. NasrinAI is relevant only where MOVO intentionally calls its API. Cross-repository changes must be explicitly identified and tracked as dependencies.

## Latest audit addendum — 2026-10-30 06:14 Asia/Manila

- **Current main:** 82172294f80e360af9e7043de425a454c211078c (documentation-only PR #51 merge).
- **Production deployment:** dpl_7XobXwSNWuLa5a9HChdafyGoECeR is READY at current main SHA. The #51 diff only adds this handoff document; the effective application-code baseline remains PR #50 merge 94d089d35483558b320f751cf122aa68755ef0eb.
- **Critical issue #47 remains open.** The production MOVO client does not yet include PR #48's scoped request/fail-closed implementation. The server-side contract in NasrinAI PR #699 is now merged and deployed, but the complete request/response flow is not live end-to-end.
- **PR #48 preview:** dpl_Ei7vXK2BVanYgcZWBhiuY6j9LZrH is READY for SHA 6b4f0bb809151ffe7e3aa78494e7b651cdcbcba5. GitHub Actions run 40957870245 was fetched for this SHA; its verify job and Install dependencies, Run tests, and Build production bundle steps all completed successfully. The PR body reports 17 suites / 96 tests passed; the exact test total was not extracted from Actions logs. Combined status for that SHA reports a successful Vercel check.
- **PR #48 branch drift:** comparing current main to fix/movo-nasrinai-context-isolation reports 36 commits ahead and 11 behind, with merge base 94d089d35483558b320f751cf122aa68755ef0eb. This contradicts older wording that the branch is fully current. Reconcile to current main and rerun all gates on the resulting exact SHA before considering merge.
- **No authenticated production smoke test was run.** A READY preview and passing tests do not establish that a portfolio canary is excluded from retrieval, prompt, transcript, cache, response, and logs.
- **PR #52** chart/currency correctness, **PR #53** known-disclaimer filtering, and **PR #46** static UI control audit remain open. The disclaimer filter is presentation-only, not a security boundary.
- **Security carry-forward:** earlier PR docs report leaked-password protection disabled and 34 npm audit findings (16 low, 5 moderate, 13 high). These were not freshly re-queried at 06:14. Earlier read-only catalog checks reported owner-scoped RLS and no anon grants in the checked set; re-query before release.
- **Audit docs:** [Master Change Ledger](engineering/MASTER_CHANGE_LEDGER.md) and [06:14 Audit Delta](engineering/updates/2026-10-30-0614-audit-delta.md), both on branch docs/change-ledger-refresh-2026-10-30-0614 and not merged.

## 1. Executive status — original handoff baseline (superseded by latest audit addendum)

MOVO is **not yet verified as fully functional or production-ready**. The current critical path is to secure the MOVO-specific NasrinAI context boundary, verify correct rendering of AI responses, finish the frontend control audit, and clear security/legal/release gates.

The following are separate states and must not be conflated:

- **Implemented:** Code/configuration is present.
- **Automated checks passed:** Tests/build passed for the exact SHA documented.
- **Integration verified:** Connected services work together in the target environment.
- **Manual QA passed:** Relevant browser/mobile/accessibility flows were exercised.
- **Deployed and smoke-tested:** The intended revision is live and the required production checks passed.
- **Complete:** All required criteria for the workstream are evidenced. A PR being open, tests passing on an older SHA, or a deployment being READY is not sufficient.

No overall completion percentage is asserted because a full evidence-based inventory has not yet been completed.

## 2. Priority order

### P0 — NasrinAI integration correctness and isolation
1. Verify the deployed API enforces `context_scope: "movo"`.
2. Ensure unrelated upstream conversation history, platform/founder/portfolio knowledge, personal memory, Library, shared learning, web search, tools, and caches cannot contaminate MOVO-scoped replies.
3. Send the user's actual question separately from a bounded finance context.
4. Do not reuse an upstream conversation ID for MOVO-scoped requests.
5. Fail closed unless the upstream explicitly confirms the MOVO scope.
6. Verify failed or unscoped responses are not displayed or persisted as successful assistant replies.
7. Run an authenticated end-to-end test against the deployed upstream and MOVO environment.

### P0 — AI response rendering
1. Render Markdown safely and legibly: headings, lists, quotes, links, code, and responsive tables.
2. Render validated fenced `chart` JSON as responsive charts only when supported by real, authorized MOVO financial data.
3. Never invent financial values or render malformed/untrusted chart payloads as executable markup.
4. Verify accessible labels, data-derived legends, responsive behavior, loading/error states, and mobile layouts.
5. Test real signed-in chat, not only component fixtures or static screenshots.

### P1 — Finance, authentication, and data integrity
Verify sign-in/session persistence, account ownership, RLS, account and transaction CRUD, budgets, wallet and dashboard summaries, imports/CSV, selected display currency, pending transaction behavior, and cross-currency restrictions. Financial summaries must use consistent ledger rules and must not silently convert unlike currencies.

### P1 — Complete frontend controls
Audit every button, link, form, navigation destination, settings control, and non-native interactive element. Confirm each action works or is explicitly disabled with a clear reason. Test keyboard/focus behavior, accessible names/states, screen readers where available, responsive layouts, loading/empty/error states, and destructive-action confirmation.

### P1 — Security and legal readiness
Resolve documented security and legal blockers before calling MOVO production-ready. Do not invent operator identity, registered address, retention schedules, data recipients, or jurisdiction-specific legal claims; obtain owner/legal review where facts are unknown.

### P2 — Release verification
Run all required tests on final candidate commits, inspect deployment results for the same commit, run authenticated production smoke tests, verify rollback instructions, and update this document with evidence and remaining risks.

## 3. Operational phase tracker

This is a **working phase breakdown derived from the current implementation handoff**, not a claim that the repository already has an authoritative eight-phase plan. First inspect the repository's existing roadmap/phase documents and reconcile naming without deleting historical traceability.

| Phase | Workstream | Current status | Evidence / exit criteria |
|---|---|---|---|
| 1 | Home and Dashboard | **Partially implemented; full current state unverified** | Verify all widgets, ledger-derived values, loading/empty/error states, navigation, and selected-currency behavior against real data. |
| 2 | Authentication and database integration | **Partially implemented; release verification outstanding** | Verify sign-in, session persistence, server-side authorization, owner filters, production RLS/grants, and unauthenticated/foreign-user denial. |
| 3 | Core finance | **Implementation reported; full end-to-end verification outstanding** | Test accounts, transactions, budgets, wallets, CSV imports, pagination, balances, monthly summaries, pending items, and mixed-currency behavior. |
| 4 | Settings and general UX | **Partially implemented; full frontend audit outstanding** | Verify profile/settings/theme/display currency, all controls, keyboard access, screen-reader semantics, and mobile layouts. |
| 5 | NasrinAI integration and context isolation | **CRITICAL / NOT COMPLETE** | Deployed upstream enforcement and authenticated end-to-end scope confirmation must pass. |
| 6 | Rich NasrinAI response presentation | **In progress; production behavior unverified** | Markdown, tables, code, and supported chart payloads render correctly with authorized MOVO data in desktop and mobile views. |
| 7 | Security, privacy, and legal | **BLOCKED / OPEN ITEMS** | Resolve leaked-password protection, dependency audit, legal facts/review/publication, privacy/logging checks, and any new findings. |
| 8 | Final QA, deployment, and release | **NOT COMPLETE** | Full test suite on final SHA, production build/deploy, manual QA, live smoke tests, evidence log, and rollback readiness. |

### Rules for phase status

- Do not mark a phase complete based on a passing build alone.
- Record the exact commit SHA, command/workflow URL, test counts, deployment identifier, and environment for every claimed result.
- If evidence is missing, use **Not verified** rather than assuming success.
- If a result applies to a previous commit, state that clearly; do not attribute it to a later documentation or code commit.
- Record failures, known limitations, and accepted risks alongside successes.

## 4. Relevant MOVO pull requests at snapshot time (historical; recheck live state)

The following open PRs were returned by the GitHub repository search on 2026-10-30. Recheck live PR state, latest head SHA, checks, and review comments before acting.

### PR #48 — Isolate MOVO NasrinAI requests from upstream conversation history
URL: https://github.com/nasrinaiv0/movo/pull/48

Reported scope:
- Send the actual question separately from bounded finance JSON.
- Send `context_scope: "movo"` with only accounts, recent transactions, and budgets.
- Do not send an upstream conversation ID.
- Fail closed unless the upstream confirms `context_scope: "movo"`.
- Remove legacy server-role mapping-table access from the chat path.
- Clean up newly created empty conversations after upstream failures without deleting existing conversations.
- Add regression tests for payload shape, context bounds, scope confirmation, and UI disclosure.

Latest MOVO-only update (2026-10-30):
- Branch head: `3d0578236b9891c92aa063e9818b47274ae4ed97`.
- The branch was reconciled on top of current main after rich reply rendering merged, preserving `NasrinAIMessage`, chart styles, and the existing renderer.
- Added a fail-closed UI regression test: if the upstream omits `context_scope: "movo"`, no assistant answer is rendered, the isolation error is shown, and the user's draft is restored.
- Added a per-user, one-time clean-chat rollout for the first cloud-mode visit. It does not delete legacy chat rows; it avoids automatically restoring a possibly contaminated legacy thread in that browser.
- Added a layout-effect account-switch reset so prior-user messages, conversation ID, unsent draft, error, and chat consent are cleared before the next paint. Browser-storage failures default to a clean chat.
- Updated `docs/NASRINAI_CHAT_INTEGRATION.md` with the legacy-thread, account-switch, and fail-closed behavior.
- Exact-head GitHub Actions run [40938090222](https://github.com/nasrinaiv0/movo/actions/runs/40938090222) passed: **17 suites / 95 tests**, `tsc --noEmit`, and production compilation. Matching Vercel deployment [dpl_6FGjf6QXzZDLwbHMTCXeKMUemPtR](https://vercel.com/nasrin-ai/movo/6FGjf6QXzZDLwbHMTCXeKMUemPtR) reached READY for the same SHA.
- The PR remains draft and unmerged.

**Still unverified:** the upstream scope contract's deployed behavior, authenticated live end-to-end chat, and manual browser/keyboard/screen-reader/mobile checks. The code intentionally rejects replies without scope confirmation. Do not merge/promote until the required upstream contract is deployed and the integration is verified.

### Companion dependency — NasrinAI PR #699 (separate repository)
URL: https://github.com/nasrinaiv0/nasrinAI/pull/699

This is **not a MOVO PR**. Track it only as an external dependency. Its described purpose is server-enforced MOVO scope, restricted to a secret service key and stateless request, bounded finance context, disabled global retrieval/memory/tools/caches for the scoped request, and a scope confirmation in the response.

The PR description reports tests and repository gates passed at SHA `14d27bea72c04183c8e5c27f199130c71b261330`, but also says a deployed integration smoke test remains outstanding. Verify current state before relying on this description.

### PR #50 — Render NasrinAI replies with charts and rich formatting (merged)
URL: https://github.com/nasrinaiv0/movo/pull/50

Status update (2026-10-29): merged into main as `94d089d35483558b320f751cf122aa68755ef0eb`; main CI run [40937026212](https://github.com/nasrinaiv0/movo/actions/runs/40937026212) completed successfully. The current branch must preserve this renderer while adding context isolation.

Reported scope:
- Readable Markdown rendering (headings, lists, quotes, links, code blocks, responsive tables).
- Validated fenced `chart` JSON rendered as responsive bar, line, and pie charts.
- Accessible labels and data-derived legends.
- Guidance to use charts only when user-scoped MOVO financial data supports them.

The PR description says live signed-in chat and rendering of charts backed by real financial data still require deployment verification. Check latest CI/head before merging.

### PR #46 — Repeatable UI control audit
URL: https://github.com/nasrinaiv0/movo/pull/46

Reported scope:
- Adds `scripts/audit-ui-controls.js` using TypeScript AST checks.
- Flags native buttons without action/valid submit/disabled state, anchors without destinations, forms without handlers/actions, and custom button-role elements without click and keyboard handlers.
- Adds `npm run audit:controls` to the build precheck and documents scope/limitations.

Review the latest diff and checks. Passing a static audit is a guardrail, not proof that every control behaves correctly at runtime.

### PR #43 — Synchronize finance balances and summaries from one ledger
URL: https://github.com/nasrinaiv0/movo/pull/43

Reported scope:
- Centralized cent-safe balance/ledger/monthly-summary calculations.
- Persisted display-currency selector and currency-aware account creation.
- Currency-scoped Home/Money Flow, Wallet, and Transactions views.
- No invented FX conversion; cross-currency transfers remain rejected.
- Stable pagination for cloud transaction reads and cross-tab refresh.
- Accessibility semantics for settings selectors.

The PR description reports passing automated checks on recorded commits (including 16 suites / 104 tests, typecheck, and production compilation) and a READY preview. It also lists release blockers, including leaked-password protection, dependency audit findings, legal review/publication, and production smoke testing. Verify the latest PR head and checklist because the description may contain multiple validation snapshots.

## 5. Known release blockers and risks

Treat these as **previously documented issues requiring current-state verification**, not as proof that the state has remained unchanged:

1. **Supabase leaked-password protection was reported disabled.** Enable it through an authorized configuration change and verify the effective production setting.
2. **Dependency audit findings were reported as 16 low, 5 moderate, and 13 high.** Re-run the current audit; triage each finding, upgrade safely, and test regressions. Do not assume counts are still current.
3. **NasrinAI upstream HTTP 401 was reported.** Diagnose with redacted logs and verify a successful authenticated request without exposing credentials.
4. **Legal publication/review remains open in the reported PR description.** Verify operator/data-controller identity and address, retention schedule, provider/data-recipient details, and jurisdictional terms with the owner/legal reviewer.
5. **Live integration testing was outstanding** for the MOVO scope boundary and chart rendering.
6. **Full manual frontend QA was not established as complete** by the open-PR evidence.
7. Do not weaken RLS, grants, ownership filters, or context isolation merely to make a UI flow pass.
8. Do not log raw prompts, financial context, provider credentials, access tokens, or sensitive response payloads. Inspect logging paths and retain only necessary, privacy-safe telemetry.

## 6. Required execution plan for Claude

### Step A — Establish current truth before editing
- Pull the latest `main` and inspect all open MOVO PRs and checks.
- Inspect the repository's existing phase/roadmap docs and identify the canonical status document; reconcile this handoff with it.
- Record current `main` SHA, each relevant PR head SHA, CI run links/results, and deployment status.
- Confirm whether PRs #43, #46, #48, and #50 are still open and whether the descriptions above remain accurate.
- Inspect the separate NasrinAI PR #699 only to verify the explicit integration dependency; keep MOVO and NasrinAI audit logs/docs separate.

### Step B — Resolve context isolation first
- Verify upstream PR #699 is reviewed, merged, deployed, and running the intended code before expecting MOVO scoped chat to succeed.
- If not ready, keep MOVO PR #48 in draft and fail closed; do not bypass the scope confirmation.
- Add/retain regression tests proving unrelated portfolio/platform context cannot be retrieved, finance context is transient and bounded, and invalid/non-service/extra-context requests are rejected.
- Verify request authentication, no upstream conversation ID, response scope confirmation, no accidental save/display on failure, and authorized user scoping.
- Perform a live authenticated smoke test after deployment; save sanitized evidence and exact deployment/commit identifiers.

### Step C — Finish response rendering
- Review and test PR #50 against the current codebase and latest dependency APIs.
- Confirm Markdown is rendered safely (no unsafe raw HTML/script execution).
- Validate chart schema, chart type, labels, finite numeric values, and sensible payload bounds before rendering.
- Ensure charts are based only on the authenticated user's MOVO data and do not invent or infer missing financial values.
- Test desktop/mobile, empty/invalid chart payloads, API errors, loading states, keyboard navigation, accessible descriptions, and tables that overflow narrow screens.
- Test the actual deployed chat with real authorized finance data.

### Step D — Complete finance and frontend QA
- Review PR #43 and verify the latest exact-head checks before any merge.
- Run the UI control audit from PR #46 and review every finding, including possible false positives and controls it cannot detect.
- Manually exercise all primary navigation, settings, account, transaction, budget, wallet, import, and dashboard flows.
- Test owner/user isolation and negative cases with separate test accounts.
- Check currency calculations against hand-computed fixtures; ensure no unlike currencies are summed and no FX conversion is fabricated.
- Fix discovered issues with focused tests. Do not silence a failure without proving the intended behavior.

### Step E — Security/legal/release gates
- Re-run dependency/security checks and remediate the current findings with regression coverage.
- Verify production RLS/grants and leaked-password protection without weakening authorization.
- Resolve upstream 401 using secret-safe diagnostics.
- Finalize legal text only from confirmed owner/legal facts; publish both policies to the intended production routes and verify HTTP/status/rendering.
- Inspect logs, errors, telemetry, and analytics for secret/financial data leakage.
- Verify timeout, rate-limit, retry, and duplicate-action/idempotency behavior.

### Step F — Release discipline
- Run the complete test suite, typecheck, lint/static audits, and production build on the exact final candidate SHA.
- Verify deployment belongs to that SHA and run production smoke tests.
- Merge only when checks, required reviews, security gates, and acceptance criteria pass. Keep critical scope-isolation work unmerged or in draft if its upstream dependency is not deployed.
- Do not claim success based solely on PR merge or a READY preview.
- Record the final decision, known residual risks, rollback procedure, and evidence links.

## 7. Acceptance checklist

### NasrinAI integration
- [ ] Upstream scope enforcement is deployed and verified.
- [ ] MOVO request is stateless and contains only the permitted context fields.
- [ ] Scope confirmation is required and validated.
- [ ] Unrelated platform/portfolio/memory/Library/web/tool/cache context is excluded.
- [ ] Unauthorized user data cannot be accessed.
- [ ] Failure paths do not display or save an unscoped answer.
- [ ] Live authenticated integration smoke test passes.

### Rendering
- [ ] Markdown and tables render correctly and safely.
- [ ] Valid chart payloads render with accessible labels/legends.
- [ ] Invalid/oversized/malformed charts fail safely.
- [ ] Charts reflect only real authorized MOVO financial data.
- [ ] Desktop and mobile interaction/accessibility tests pass.

### Finance and frontend
- [ ] Ledger/balance/monthly summary tests pass on the final SHA.
- [ ] Currency separation and no-FX rules pass.
- [ ] Core account/transaction/budget/import flows pass end to end.
- [ ] Every UI control is accounted for and functional or explicitly disabled.
- [ ] Keyboard, focus, screen-reader semantics, and responsive checks pass.

### Security/legal/release
- [ ] Current dependency findings are triaged and accepted/remediated.
- [ ] Production RLS/grants and ownership boundaries are verified.
- [ ] Leaked-password protection is enabled and verified.
- [ ] Upstream authentication works without exposing credentials.
- [ ] Terms of Service and Privacy Policy are reviewed, published, and verified.
- [ ] Full tests/build/static audits pass on the exact final SHA.
- [ ] Production smoke tests pass and rollback is documented.

## 8. Evidence/change log template

Append a new entry for every material implementation change. Do not overwrite earlier results; keep the history traceable.

```markdown
### YYYY-MM-DD — <workstream/change>
- Status: Implemented / Partially implemented / Blocked / Verified / Reverted
- Repository:
- PR / issue:
- Base SHA:
- Head SHA:
- Change summary:
- Root cause:
- Security/data-boundary impact:
- Tests executed:
- Exact results:
- CI/workflow URL:
- Deployment/environment:
- Manual QA performed:
- Not tested / limitations:
- Risks and follow-up:
- Rollback:
- Next action / owner:
```

## 9. Rules for the next engineer

- Work evidence-first; inspect the latest code and checks before making assumptions from this document.
- Preserve MOVO/NasrinAI repository separation.
- Do not expose secrets or include sensitive financial data in documentation/logs.
- Never claim a phase is complete without evidence from the relevant acceptance checklist.
- Fix root causes, not just symptoms; add regression tests for every reproduced defect.
- Avoid broad rewrites when a targeted change is sufficient.
- Do not merge around failed checks or bypass security gates.
- Update this document after each material change and keep a separate detailed change/audit record where needed.
- If a blocker depends on another repository or external configuration, document the exact dependency, responsible action, and verification evidence instead of pretending it is resolved.

## 10. Snapshot disclaimer

This handoff began as a snapshot based on repository/PR descriptions available on 2026-10-30. See the appended latest-run update below for subsequent verified work. The current live status may still have changed. Claude must re-check branch heads, PR states, CI, deployment, production configuration, and existing roadmap documents before treating any item as current. This file itself is documentation only; it does not implement fixes, run tests, merge PRs, or prove production behavior.


## 11. Latest run update — 2026-10-30 (MOVO repository only)

### Context-isolation implementation status
- MOVO PR #48 remains **open, draft, mergeable**, with current code/test head `3d0578236b9891c92aa063e9818b47274ae4ed97`.
- The exact-head GitHub Actions run passed 17 test suites / 95 tests, TypeScript typecheck, and production compilation. The matching Vercel preview is READY. This is preview/build evidence, not production integration proof.
- The UI now starts a clean chat on the first cloud-mode visit per signed-in user after the rollout marker is applied. Legacy rows are not deleted; the app avoids automatically loading the potentially contaminated latest thread in that browser.
- Switching signed-in users clears the previous user's visible chat state before paint. Regression tests cover a pending history request for the next user and the fail-closed scope-confirmation error.
- The current branch retains the rich reply renderer merged in PR #50. Do not replace the component wholesale with an older version when resolving conflicts.

### Additional frontend increment — PR #52 (chart correctness)

- PR: https://github.com/nasrinaiv0/movo/pull/52 (open draft; MOVO repository only).
- Current head: `58b7a9e32dac650d517aa99bf7bfb94c4b39ac01`.
- Preserves currency/value formatting in axis ticks, bar/line tooltips, and pie values.
- Rejects missing, non-numeric, malformed, or inconsistent-unit chart data instead of converting missing values to zero or comparing unlike units in one chart.
- Aggregates pie categories beyond the first seven into an explicit `Other` slice so the legend/percentages do not silently omit the remainder.
- Fixed an SVG `<title>` child warning observed in an earlier preview by rendering each title as one text node.
- Exact-head Vercel deployment [dpl_9RQfwVQ6QChw2DrAoZw9ts6NW6ii](https://vercel.com/nasrin-ai/movo/9RQfwVQ6QChw2DrAoZw9ts6NW6ii) reached READY; logs confirm typecheck, **18 suites / 99 tests passed**, and production compilation. GitHub Actions run [40939100412](https://github.com/nasrinaiv0/movo/actions/runs/40939100412) completed successfully for this exact head: 18 suites / 99 tests passed, typecheck passed, and production compilation succeeded.
- Manual verification of actual model-generated chart payloads, accessible SVG labels, and mobile overflow remains outstanding. This PR does not prove the model's values are real or authorized.

### Current release gates
- [ ] Confirm the upstream `context_scope: "movo"` enforcement is deployed and a live authenticated request succeeds. This is an external integration dependency; this MOVO-only workflow did not modify the separate repository.
- [ ] Verify production behavior with two distinct MOVO test accounts and a redacted canary test; never log credentials, financial payloads, or full prompts.
- [ ] Complete manual keyboard, screen-reader, mobile, and real-data chart rendering smoke tests.
- [ ] Complete whole-frontend control audit and final legal review. Operator identity/address, actual retention schedule, providers/recipients, and jurisdiction-specific legal wording must be owner/legal verified; do not invent them.
- [ ] Resolve Supabase leaked-password protection and targeted dependency vulnerability findings through authorized configuration and regression-tested upgrades.
- [ ] Keep PR #48 in draft until its upstream dependency and end-to-end acceptance criteria are verified.

### No changes in this run
- No production financial records, Supabase schema/RLS/grants, provider secrets, or production configuration were changed.
- The upstream conversation mapping remains server-only; do not add browser policies to silence an informational RLS-without-policy finding.


## 12. Latest scheduled implementation run — 2026-10-30 (MOVO only)

### Screenshot regression: unrelated portfolio/document text
- User evidence: MOVO's finance chat displayed a note about "Nasrin's portfolio" and described NasrinAI as a development service. This confirms unrelated assistant output; it does not by itself prove another user's financial records were exposed.
- Tracking issue: [#47](https://github.com/nasrinaiv0/movo/issues/47) remains open. Do not close it based on a renderer-only patch.
- Presentation guard PR: [#53](https://github.com/nasrinaiv0/movo/pull/53), branch `fix/filter-unrelated-document-notes`, latest code/test head `37c6d60acb3c6f1a57e10cccc5845d2d21a8c5d9`.
- The renderer guard now removes only a paragraph that (a) references a provided document/portfolio, (b) describes development services/options or agencies/freelancers, and (c) explicitly disclaims financial relevance; it also retains the older exact generic disclaimer filter. Fenced code is left untouched. Adjacent finance guidance is intended to remain visible.
- Added `src/components/NasrinAIMessage.test.js` with five regression tests: screenshot-style parenthetical disclaimer, follow-up development-services paragraph, legacy disclaimer, fenced-code preservation, and ordinary finance guidance preservation.
- GitHub Actions run [40949265879](https://github.com/nasrinaiv0/movo/actions/runs/40949265879) is **in progress at the time of this update**. Do not report the new tests/build as passed until the exact-head run completes successfully. Earlier CI for the previous one-file head does not validate this new code/test head.
- PR #53 has been returned to draft while exact-head checks are pending. This is a presentation-only safety net; it cannot prevent unrelated content from entering the upstream model request.

### Root-cause / privacy boundary — still open
- [PR #48](https://github.com/nasrinaiv0/movo/pull/48) remains the primary MOVO-side request/context isolation change. It must fail closed when the upstream does not return explicit `context_scope: "movo"`.
- The required upstream scope contract is not verified deployed by this MOVO-only run. Do not modify the separate NasrinAI repository in this workflow; track that as an external dependency and require deployment evidence plus an authenticated end-to-end smoke test.
- The screenshot's assistant wording is not sufficient evidence to conclude cross-user financial disclosure. Root cause still requires a redacted request/retrieval trace and clean-session reproduction.
- No production financial records, secrets, database schema, RLS/grants, or production settings were changed in this increment.

### Required follow-up
1. Wait for run 40949265879 and fix any failures before claiming validation.
2. If the tests pass, update PR #53's validation section with the exact successful result and preview deployment for that exact SHA.
3. Test that unrelated document text is absent while the finance summary and charts remain intact.
4. Continue the server-side context-isolation work in PR #48 and keep the production issue open until the upstream scope contract and authenticated end-to-end tests pass.
5. Re-run the full control audit and legal/security release checklist; a successful renderer test does not complete the frontend.


### Exact-head validation follow-up — 2026-10-30
- Renderer guard head `37c6d60acb3c6f1a57e10cccc5845d2d21a8c5d9` has now completed GitHub Actions run [40949265879](https://github.com/nasrinaiv0/movo/actions/runs/40949265879) successfully.
- Exact-head Vercel deployment [dpl_4MuQ78S3YXsoF6m54EtWdxWG41yF](https://vercel.com/nasrin-ai/movo/4MuQ78S3YXsoF6m54EtWdxWG41yF) reached READY; preview alias: [movo-git-fix-filter-unrelated-document-notes-nasrin-ai.vercel.app](https://movo-git-fix-filter-unrelated-document-notes-nasrin-ai.vercel.app).
- The Vercel build log confirms TypeScript typecheck, **18 suites / 98 tests passed**, and production compilation succeeded. The fifth new test suite assertion group is included in `src/components/NasrinAIMessage.test.js`.
- Updated PR #53's validation notes with exact-head evidence. PR #53 remains draft; it is not production and not the root-cause fix.
- Dependency installation still reports 34 audit findings (16 low, 5 moderate, 13 high). Keep this release blocker visible; do not use `npm audit fix --force` as a blanket remedy.
- Added a progress comment to issue #47. The issue remains open pending source-level context isolation and authenticated end-to-end verification.

- Preview asset check: using the Vercel authenticated fetch on 2026-10-30, the exact-head preview root and built JavaScript bundle returned HTTP 200; the bundle contained the renderer guard. This is not interactive signed-in chat verification.


### Scheduled implementation pass — finance context normalization and origin allowlist (2026-10-30)

#### Implementation
- Updated MOVO PR #48 on branch `fix/movo-nasrinai-context-isolation`; no separate NasrinAI repository was modified.
- In `api/nasrinai/chat.js`, added allowlisted financial-context normalization:
  - finite amounts only; malformed amounts and unrecognized transaction types are excluded instead of being coerced to zero;
  - missing/invalid opening balances and budget limits stay `null`;
  - missing/malformed currency strings stay `null` instead of silently defaulting to PHP;
  - timestamps and date-only values are normalized/validated; invalid values stay `null`;
  - database-sourced labels have CR/LF/tab normalization; free-form transaction notes and unexpected columns remain excluded.
- Added `https://movo.nasrinai.com` to the default exact-origin allowlist while retaining `https://movo-lime.vercel.app`. Deployments with different aliases must set `MOVO_ALLOWED_ORIGINS` explicitly.
- Added regression coverage in `src/lib/nasrinaiChat.test.js` for malformed amounts/types, missing currency, date validation, label normalization, omitted notes, and the canonical production origin.
- Updated `docs/NASRINAI_CHAT_INTEGRATION.md` with the normalization contract and origin configuration.

#### Exact-head validation
- Latest code/test/docs head: `078d3b90973540982c83b0eff0a67e886dd5a9fc`.
- GitHub Actions [run 40957438087](https://github.com/nasrinaiv0/movo/actions/runs/40957438087) completed successfully: **17 test suites / 96 tests passed**, `tsc --noEmit` passed, and the production bundle compiled successfully.
- Vercel deployment [dpl_HaKKKiDADQW2HE4kSyqXJRdw17Tz](https://vercel.com/nasrin-ai/movo/HaKKKiDADQW2HE4kSyqXJRdw17Tz) is **READY** for the exact SHA; preview alias: [movo-erelil2fp-nasrin-ai.vercel.app](https://movo-erelil2fp-nasrin-ai.vercel.app).
- Two intermediate test heads failed because an escaped regex removed letters from account labels. The exact cause was confirmed from CI logs, corrected, and the exact latest head now passes. Earlier failures remain in GitHub Actions history for auditability.
- The current PR is mergeable according to GitHub but remains draft. No production deployment, database write, RLS/grant change, or secret change occurred in this increment.

#### Fresh read-only Supabase verification — 2026-10-30 05:26 Manila

- Confirmed the MOVO project `cjsjmorqvuvvwbfyztiz` is `ACTIVE_HEALTHY`; this was a read-only inspection.
- A catalog query found RLS enabled on all seven checked tables: `profiles` (3 policies), `financial_accounts` (4), `transactions` (4), `budgets` (4), `movo_ai_conversations` (4), `movo_ai_messages` (3), and `movo_ai_upstream_conversations` (0 policies). The 22 policies on user-facing tables reference `auth.uid()` in their `USING` or `WITH CHECK` expressions.
- A separate role-grant query found no `anon` grants on the checked tables. `authenticated` retains SELECT/INSERT/UPDATE/DELETE on the user-facing tables; the upstream mapping grants are limited to `service_role`. This is consistent with the server-only mapping design.
- Supabase Security Advisor still reports `auth_leaked_password_protection` as WARN and `rls_enabled_no_policy` on the upstream mapping as INFO. Do not add a browser policy to the mapping. The leaked-password setting remains an authorized dashboard/configuration task.
- Performance Advisor still lists seven unused indexes. No indexes were dropped because usage evidence and workload impact must be reviewed first.
- No SQL writes, schema/policy/grant changes, financial record reads, or secret reads were performed in this check.

#### Still blocking release
1. PR #48 still requires the upstream MOVO scope enforcement to be deployed before merging; this MOVO-only workflow did not modify the separate NasrinAI repository.
2. No authenticated end-to-end smoke test has yet confirmed that a real signed-in MOVO request receives and validates `context_scope: "movo"`.
3. Production remains on main commit `94d089d35483558b320f751cf122aa68755ef0eb`; these changes are preview-only.
4. Continue the whole-frontend interaction/accessibility audit, legal publication verification, leaked-password protection configuration, dependency remediation, and production security checks.



### UI audit branch reconciliation — 2026-10-30

- Reconciled PR #46 branch `chore/repeatable-ui-control-audit` with current `main` by creating merge commit `4e87f9bc2bf23c1779ba313a33616ad97526ce66`; the PR diff remains limited to `scripts/audit-ui-controls.js`, `docs/UI_CONTROL_AUDIT.md`, and `package.json`.
- Exact-head Vercel deployment [dpl_9dYXuUiNJkMNBUra86W5pLUxzWJJ](https://vercel.com/nasrin-ai/movo/9dYXuUiNJkMNBUra86W5pLUxzWJJ) is READY. Its build log confirms `tsc --noEmit`, 17 suites / 93 tests, the audit command, and production compilation all completed successfully.
- The reconciled scanner now reports **3 disabled-control explanation warnings**, all in `src/App.js` for finance transaction save, account save, and CSV import. These are not unhandled buttons; they require a visible, accessible explanation or busy-state evidence. PR #43 contains the related `aria-busy` and CSV guidance fixes but remains a draft while mixed-currency finance behavior is unresolved.
- GitHub Actions run [40958277651](https://github.com/nasrinaiv0/movo/actions/runs/40958277651) remains in progress at dependency installation. Do not report that workflow as passed; the exact-head Vercel prebuild is the completed validation evidence.
- The static audit is not an interactive browser test. Keyboard/focus, screen-reader, mobile, modal, settings, and real finance-flow verification remain required.



## Scheduled implementation pass — 2026-10-30 06:29 Asia/Manila — Expanded UI audit

- Created [PR #55](https://github.com/nasrinaiv0/movo/pull/55) on `chore/aria-control-audit-current-main`, based on main `82172294f80e360af9e7043de425a454c211078c`.
- The audit script now detects placeholder anchors, non-native interactive ARIA roles without keyboard/click handling, missing tab selection state, missing checked/selected state, unnamed dialogs, disabled-control explanation gaps, and dialogs needing manual modality/focus review.
- Added `src/lib/uiControlAudit.test.js` covering placeholder anchors, custom tab behavior, checked state, accessible dialog names, and valid controls.
- Added `npm run audit:controls` to the production prebuild gate and expanded `docs/UI_CONTROL_AUDIT.md`.
- Closed stale/conflicted PR #46 as superseded by #55 (not merged).
- Exact head `76851d33b07126a63c34922adedc04464995e157`; Actions run [40966145454](https://github.com/nasrinaiv0/movo/actions/runs/40966145454) was still installing dependencies at the last check. No exact-head test/typecheck/audit/build success is claimed yet. Preview was queued/building, not READY.
- No financial data, application API logic, auth, RLS, database schema/grants, secrets, or production settings changed.
- Broader completion still blocked by interactive browser/accessibility verification, legal controller/provider/retention disclosures, leaked-password protection, dependency remediation, and authenticated production NasrinAI context-isolation verification. The static audit is a guardrail only.


### Validation update — expanded UI control audit — 2026-10-30 06:30 Asia/Manila

- PR #55 exact head: `76851d33b07126a63c34922adedc04464995e157`.
- GitHub Actions [run 40966145454](https://github.com/nasrinaiv0/movo/actions/runs/40966145454) completed successfully.
- Exact confirmed results: `tsc --noEmit` passed; **18 test suites / 99 tests passed**; `npm run audit:controls` passed; optimized production bundle compiled.
- Exact-head Vercel preview [dpl_9WXj8JdbfmMDb14TT4gr2d44A2PH](https://vercel.com/nasrin-ai/movo/9WXj8JdbfmMDb14TT4gr2d44A2PH) is READY.
- Audit snapshot: 31 source files; 93 buttons (9 disabled); 9 links; 5 forms; 4 interactive ARIA widgets; 2 dialogs. Three disabled-control warnings remain in `src/App.js` at lines 596, 608 and 635. The static scanner cannot verify callback semantics, visual truthfulness, modal focus behavior, or actual screen-reader output.
- PR #55 remains draft. PR #46 was closed as superseded, not merged, to avoid duplicate open work.
- This PR changes only the audit script, tests, build script and documentation. It does not resolve issue #47 or replace PR #48's server-side context-isolation requirement.


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


## Cross-project monitoring update — 2026-10-30 07:11 Asia/Manila

- MOVO main/production remain at `82172294f80e360af9e7043de425a454c211078c` / `dpl_7XobXwSNWuLa5a9HChdafyGoECeR` READY. PR #56 remains draft at `c93b2393133f6b200f5ace83a8d5f78d1441e626`; existing exact-head CI [40966718902](https://github.com/nasrinaiv0/movo/actions/runs/40966718902) passed, but no authenticated production isolation canary test has been performed.
- NasrinAI upstream main is now `52392234ce7583303d4d25880296c06d7ad529b1` after PR #707. This does not change MOVO's client integration status. Issue #47 remains open.
- Detailed checkpoint: `docs/engineering/updates/2026-10-30-0711-cross-project-monitoring.md` (commit 1f9f2c0f992fe4e595718404fc25750fdddd9dd1); master ledger update commit c0ab1fcbd3d002a30a4a038b3f01634a5774a2a9.
- This is documentation-only; no MOVO runtime, database, finance data, production settings, or PR state was changed.


## Current state snapshot — 2026-10-30 09:35 Asia/Manila (supersedes older deployment snapshots)

- MOVO main/production is now at `277051e4ec2216a6b598c784a50b32ba37b89dee`; Vercel production deployment [dpl_FRVNFKYmKHcrhnfvF8uhi7fwELVh](https://vercel.com/nasrin-ai/movo/FRVNFKYmKHcrhnfvF8uhi7fwELVh) is READY.
- PR #57's production dependency audit gate is merged. Current production dependency audit is clean (0 vulnerabilities); the full CRA/build-tool tree still reports 34 findings (16 low, 5 moderate, 13 high) and needs targeted review.
- PR #59 is merged. The unauthenticated local demo now uses a generic Demo identity and visible fictional-sample-data disclosure. Production Playwright smoke verified 200, 390px responsive layout, Sign in, legal cross-links, and no browser errors; the main nav and Search/Escape were also exercised on the preview.
- PR #56 remains draft at `36c486424a2f37591edb13d5a43936140515e217`; exact-head Actions [40985264768](https://github.com/nasrinaiv0/movo/actions/runs/40985264768) passed 18 suites / 101 tests, typecheck, production audit and build. New API-handler tests cover fail-closed scope, persistence only after scope confirmation, and foreign conversation IDs.
- NasrinAI upstream PR #699 is merged and the current production deployment source SHA `b39f4dcd62641d5f601e4e707cb46155ca8e135e` contains the server-enforced MOVO scope contract. No authenticated MOVO request or unrelated-document canary has yet proven the deployed integration. A no-token production POST returns 401; the PR #56 preview API is intercepted by Vercel SSO.
- PR #43 and #52 remain draft pending authenticated finance/chart validation. PR #55 remains draft and currently conflicts with newer main; reconcile it rather than duplicating its accessibility work.
- Legal pages and consent navigation are browser-verified, but the visible publication warning must remain until the operator/controller identity and address, actual retention/deletion schedule, provider/data-recipient details, and jurisdiction-specific review are verified.
- Supabase RLS remains enabled on seven checked tables with 22 owner-scoped policies across six user-facing tables and no checked `anon`/`PUBLIC` grants. The upstream mapping remains service-role-only. Leaked-password protection is still disabled and requires an authorized Auth settings change.
- Detailed evidence: `docs/engineering/updates/2026-10-30-0935-production-demo-disclosure-and-chat-checks.md` and issue [#47](https://github.com/nasrinaiv0/movo/issues/47).


## Current implementation and release status — 2026-10-30 10:10 Asia/Manila

- **Production demo transparency:** PR #59 merged at `277051e4ec2216a6b598c784a50b32ba37b89dee`; production deployment READY. Unauthenticated demo uses `Demo User` / `demo@example.com` and an accessible responsive disclosure that sample financial figures are fictional, not bank-linked, and not saved/synced as personal records. Production browser evidence is in `docs/engineering/updates/2026-10-30-0935-production-demo-disclosure-and-chat-checks.md`.
- **Audit documentation:** PR #58 merged at `ca1a680c78baf7c87347c960d56c7bc207041bc3`. Any previous sentence calling #58 open is historical and superseded.
- **PR #60 accessibility scanner:** head `d80077b05067282fa76de16e7947aa73557e7550`, 23 ahead / 0 behind main, exact-head run #40989633601 passed 20 suites / 111 tests, typecheck, static control audit, build, and production-only audit. Vercel preview check is successful. Still draft until manual keyboard/focus, screen-reader, responsive and authenticated finance-flow checks are recorded. Full dependency tree still has 34 findings (16 low, 5 moderate, 13 high).
- **PR #56 context isolation:** head `30aaaf0fedb50e7b73bb36f285c5b744247a2c0c`, 19 ahead / 0 behind main. Latest run #40990086352 was in progress at this audit timestamp; Vercel status successful. Earlier 18-suite / 103-test run #40989833432 is for implementation head `1b3c939`, not the current docs-only head. Keep draft.
- **Do not close issue #47:** authenticated MOVO scope confirmation and unrelated-project canary are still unverified. The production no-token 401 only verifies the auth gate. Do not expose or rotate provider secrets as part of monitoring.
- **Security/legal:** leaked-password protection is still reported disabled; legal launch warning remains until operator/controller identity/address, retention/deletion schedule, provider/data-recipient details, and jurisdiction-specific review are confirmed.
- Detailed evidence: `docs/engineering/updates/2026-10-30-1010-monitoring-delta.md`.



### Exact-head follow-up — 2026-10-30 10:11 Asia/Manila

PR #56 current head `30aaaf0fedb50e7b73bb36f285c5b744247a2c0c` is now validated by GitHub Actions [#40990086352](https://github.com/nasrinaiv0/movo/actions/runs/40990086352): 18 suites / 103 tests passed, typecheck passed, production-only dependency audit reported zero vulnerabilities, and production build compiled. Vercel preview check is successful. Full dependency install still reports 34 findings (16 low, 5 moderate, 13 high), with deprecated glob/eslint and Node 20 action-runtime warnings. This does not validate upstream scope enforcement: keep PR #56 draft and issue #47 open until an authenticated request and unrelated-project canary prove the boundary.

## Finance UI correction — profile summaries honor selected display currency (2026-10-30 11:14 Asia/Manila)

- **Issue found:** `src/screens/Profile.js` formatted profile summary metrics with the default PHP currency and forced account-type subtotals to PHP, even when MOVO's `displayCurrency` preference selected another currency. The account list was already filtered to the selected currency, so the label could be wrong without any conversion having occurred. When balances were hidden, the mask also defaulted to the PHP marker.
- **Fix:** The Profile screen now reads `displayCurrency` from the shared app context (PHP fallback only when the context does not supply it) and passes that currency to both `money()` and `shown()` for the three summary metrics and bank/card/e-wallet subtotals. No exchange rate or cross-currency aggregation is introduced.
- **Regression test:** `src/App.test.js` seeds synthetic USD and PHP accounts plus USD income/expense and a PHP transaction, then verifies Profile shows USD-formatted balance/income/expense and the USD bank subtotal without PHP labels. It rerenders with balances hidden and verifies the mask says `USD ••••••`, not `₱ ••••••`.
- **Security/data:** Local synthetic test fixtures only. No production financial records, schema, RLS, grants, authentication configuration, or secrets were changed.
- **Validation boundary:** This change has been committed to the existing finance PR branch. Fresh exact-head CI and Vercel preview checks are required; previous passing runs do not validate these new commits. Authenticated cloud CRUD/CSV and owner-scoped currency-flow verification remain release gates.

## Finance profile currency correction — exact-head evidence (2026-10-30 11:14 Asia/Manila)

- PR #43 head `5308948502127be913921522b598693feb21e533` passed exact-head Actions [#40996734432](https://github.com/nasrinaiv0/movo/actions/runs/40996734432): 20 suites / 118 tests, TypeScript typecheck, production-only dependency audit (0 vulnerabilities), and production build.
- Vercel preview [dpl_DQTyWYggxd56XezRUErxs1Je3sa6](https://vercel.com/nasrin-ai/movo/DQTyWYggxd56XezRUErxs1Je3sa6) is READY; preview root HTTP 200. This does not prove authenticated cloud financial behavior.
- Profile summary metrics and account-type subtotals now format with the selected display currency; hidden balances use a matching currency mask. Synthetic USD/PHP regression coverage passed as part of the 118-test suite.
- The full dependency tree still reports 34 findings (16 low, 5 moderate, 13 high), despite 0 findings in the production-only audit.
- Keep PR #43 draft until authenticated financial writes, CSV import/export, and owner-scoped currency-isolation flows are verified.
## Latest MOVO implementation checkpoint — 2026-10-30 11:14 Asia/Manila

Current main is `815ab66919894b271b90a5b1570b2fae949406c9`; PR #61 is merged as a documentation-only change. The four application PRs are reconciled with current main (zero commits behind) and all have exact-head CI success plus READY Vercel previews, but remain drafts because the required authenticated/manual release gates are incomplete.

- **#43** head `600c49ab9f1b5cb0e0034afe59d00fdbd4a0d6dc`: 20 suites / 118 tests, typecheck, production-only audit (0), production build; preview READY. New fix: Profile summary values and hidden-balance masks use the selected display currency. Authenticated cloud CRUD/CSV/currency-isolation checks remain unverified.
- **#52** head `64cfa5b9e746b249a07735ae934badcb7d842610`: 18 suites / 101 tests, typecheck, production-only audit (0), build; preview READY. Authenticated chart-data provenance remains unverified.
- **#56** head `337332bea5cabd533447e0913503b188794bca8e`: 18 suites / 103 tests, typecheck, production-only audit (0), build; preview READY. Keep issue #47 open until authenticated scoped POST and unrelated-project canary prove upstream enforcement; preview HTTP 200 is not proof of isolation. Its legal copy is not in production until merge.
- **#60** head `015c35d041972080249e0bc71a6114bbbc4e6e19`: 20 suites / 111 tests, typecheck, `audit:controls`, production-only audit (0), build; preview READY. Manual keyboard/focus, screen-reader, responsive, and finance-flow checks remain open.

Fresh read-only MOVO Supabase catalog check: 7 checked tables have RLS enabled; all 22 user-facing policies reference `auth.uid()`; no checked `anon`/`PUBLIC` grants; upstream mapping has no browser policy or authenticated grant and remains service-role-only. Security Advisor still reports leaked-password protection disabled; no Auth settings write action was available. Full dependency tree remains 34 findings (16 low, 5 moderate, 13 high), while the production-only audit is clean—do not conflate them.

Legal publication remains blocked on operator/controller identity/address, actual retention/deletion schedule, provider/data-recipient details, and jurisdiction-specific review. No database, Auth setting, production record, or secret changed in this checkpoint.

## Display Currency setting implementation — 2026-10-30 11:35 Asia/Manila

The finance branch now hardens the **existing** Appearance → Display Currency selector rather than adding a duplicate Settings control. It sanitizes the available currency list, includes the current selection, disables the native select when only one currency is available, and explains how to add/import another currency. With multiple options, the description explicitly states that currencies remain separate and no automatic conversion occurs. Settings regression tests cover selection, accessibility description, and the single-currency disabled state.

Current code head `4472a470e1efb18b0cccedeb7d9d9cbd43babd09` needs fresh exact-head CI/preview validation. PR #60 contains a stale static PHP-only currency statement in its own branch and must be reconciled before it can merge. No database/Auth/security settings changed.

## Post-merge production disclosure update — 2026-10-30 11:30 Asia/Manila

PR #63 merged as `1df043bcc54d59bee16fce806b601e09d647b06e`. The production deployment dpl_CoSq9dcgCG2qVbCkm1BBSeRU2r1U is READY, root HTTP 200, and the served JS bundle now contains the explicit unverified-upstream-boundary caveat and October 30 Privacy Policy date while no longer containing the absolute “Your account stays isolated” claim. Exact-head Actions #40997576900 passed 17 suites / 95 tests, typecheck, production-only audit (0), and build.

This is a disclosure-only correction, not proof of isolation. Keep issue #47 open until authenticated scope confirmation and unrelated-project canary testing verify retrieval, provider prompt, response, transcript, cache, and logs. Current release candidates #43/#52/#56/#60 have passing exact-head CI and READY previews, but authenticated finance/CSV/chart flows and manual accessibility checks remain open. Fresh MOVO RLS catalog check remains 7/7 tables enabled, 22/22 user-facing policies referencing `auth.uid()`, zero checked anon/public grants, and service-role-only upstream mapping. Leaked-password protection remains disabled; no Auth-setting write action was available. Full dependency tree still reports 34 findings (16 low, 5 moderate, 13 high). Main branch protection is still absent by repository-level API checks. Legal publication warning remains until the required operator, retention, provider, and jurisdiction details are confirmed.

## Finance currency-test assertion correction — 2026-10-30 11:43 Asia/Manila

- Reviewed exact-head GitHub Actions run [#40998551699](https://github.com/nasrinaiv0/movo/actions/runs/40998551699): **2 failed / 118 passed**. Both failures were stale assertions after the Appearance → Display Currency copy/label changed; the finance implementation tests passed. This failure was preserved and not described as green.
- Corrected the accessible-label assertion in `src/App.test.js` to match `aria-label="Display Currency"`; updated `src/screens/Settings.test.js` to assert the actual multi-currency guidance; and fixed the remaining single-currency assertion to look for “no conversion is applied”. No product code, financial calculations, auth, database, RLS/grants, or secrets changed in these test-only corrections.
- Exact code/test head `aec4d68ca86fc6a0b17ce3c12c7780e4551de861` has a Vercel READY deployment [dpl_7ty9PTCxqCSq7BgAD89N1mKmgzSS](https://vercel.com/nasrin-ai/movo/7ty9PTCxqCSq7BgAD89N1mKmgzSS). Its build log confirms TypeScript typecheck, **20 suites / 120 tests passed**, and “Compiled successfully.” The production-only audit and `audit:controls` were not independently rerun on this code head; the dependency manifest was unchanged.
- PR #43 remains draft. Authenticated cloud finance CRUD, CSV import/export, and owner-scoped currency-isolation flows remain unverified. Do not merge based solely on tests and preview build.

## CSV currency parsing integrity — 2026-10-30 11:46 Asia/Manila

- Found that a non-empty malformed CSV currency such as `USDT` was silently rewritten to `PHP`, potentially mislabeling a user's financial record. Blank or absent optional currency still defaults to PHP, but an explicitly malformed value now produces a row-level validation error and that row is excluded from import.
- Added regression tests for malformed explicit currency and blank optional currency. This is a financial data-integrity fix; it does not change database schema, RLS/grants, authentication, provider behavior, or secrets.
- Exact-head typecheck/full tests/production build are pending for this change. Keep PR #43 draft until those checks and authenticated finance CRUD/CSV/currency-isolation flows are verified.

## CSV currency validation — exact-head result — 2026-10-30 11:52 Asia/Manila

- The first test run for this parser change exposed a test-fixture escaping error (literal \\n instead of a CSV row break). The failing fixture was corrected; the product parser change remained the same.
- Current code/test head `b5de9612499c29a22c2844718742d0c4e665be46` has Vercel deployment [dpl_BNQdu6c7ReQ23xfTfZ3Lrw5qPtNg](https://vercel.com/nasrin-ai/movo/BNQdu6c7ReQ23xfTfZ3Lrw5qPtNg) **READY**. Build log confirms TypeScript typecheck, **20 suites / 122 tests passed**, and production compilation succeeded.
- The regression confirms malformed non-empty currency codes are rejected per row rather than silently relabeled as PHP; blank optional currency still defaults to PHP. Production-only npm audit and `audit:controls` were not independently rerun on this head; dependency manifests were unchanged.
- PR #43 remains draft pending authenticated cloud finance CRUD, CSV import/export, and owner-scoped currency-isolation verification.

## CSV validation UI regression — 2026-10-30 11:54 Asia/Manila

- Added an App-level regression test that feeds a malformed currency through the file-input/FileReader path and asserts the row-level error appears in an accessible `role="alert"` block and the Import button remains disabled when no valid rows exist.
- This supplements parser unit coverage and confirms the user-facing CSV workflow fails safely rather than silently importing the row as PHP. Exact-head typecheck, full test suite, and production build are pending for the new test commit.

## CSV currency validation — final source/test result — 2026-10-30 11:56 Asia/Manila

- Exact source/test head `569e5e3d98f0a4932012df0952614cc850dfb077` has Vercel deployment [dpl_BcZFDfGSvEUDXLeNoGh4v8q75VNk](https://vercel.com/nasrin-ai/movo/BcZFDfGSvEUDXLeNoGh4v8q75VNk) **READY**. Build log confirms TypeScript typecheck, **20 suites / 123 tests passed**, and production compilation succeeded.
- Coverage includes parser rejection of malformed explicit currency, preservation of PHP fallback only for blank/missing currency, and an App-level file-input/FileReader test that verifies the row-level error is exposed through `role="alert"` and the Import button remains disabled when there are no valid rows.
- The first UI-test fixture attempt used a literal escaped sequence instead of a row break; the failed run was observed and the fixture corrected before this passing exact-head build. No dependency manifests changed; production-only npm audit and `audit:controls` were not independently rerun on this code head.
- PR #43 remains draft until authenticated finance CRUD, CSV import/export, and owner-scoped currency isolation are verified against real signed-in records.
