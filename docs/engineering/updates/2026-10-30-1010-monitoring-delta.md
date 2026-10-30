# MOVO monitoring delta — 2026-10-30 10:10 Asia/Manila

**Scope:** MOVO repository state, its current release candidates, and the NasrinAI upstream dependency. This is an audit/documentation change only. No application code, PR state, production configuration, database, financial records, credentials, or deployment was modified by this review.

## Executive summary

- **New production progress:** MOVO PR #59 merged at `277051e4ec2216a6b598c784a50b32ba37b89dee`, adding a generic unauthenticated demo identity and a clear, accessible disclosure that displayed financial examples are fictional. The Vercel production deployment is READY. The merged main-branch audit records a production Playwright smoke.
- **Documentation reconciliation:** PR #58 merged as `ca1a680c78baf7c87347c960d56c7bc207041bc3`. Some earlier snapshot text still says PR #58 is awaiting merge; that wording is historical and must not be read as current status.
- **Accessibility audit:** PR #60 is open/draft but its branch is now 23 commits ahead and zero behind current main `ca1a680c78baf7c87347c960d56c7bc207041bc3`. Exact-head CI and preview checks passed on `d80077b05067282fa76de16e7947aa73557e7550`.
- **Context isolation:** PR #56 is open/draft, 19 commits ahead and zero behind current main. Its latest head is `30aaaf0fedb50e7b73bb36f285c5b744247a2c0c`; Vercel reports success, but exact-head GitHub Actions run #40990086352 was still in progress at the time of this audit. Earlier passing results do not validate this latest documentation commit.
- **Critical release gate remains:** No authenticated live MOVO chat request plus unrelated-project canary has proven that the deployed end-to-end boundary excludes foreign context from retrieval, provider prompts, replies, transcripts, caches, and logs. Keep issue #47 open.

## Change record A — PR #59: disclose sample finance data in unauthenticated demo

- **Repository/project:** `nasrinaiv0/movo` / MOVO frontend.
- **Merged:** 2026-10-30 01:30:50 UTC (09:30:50 Asia/Manila).
- **PR:** [#59](https://github.com/nasrinaiv0/movo/pull/59)
- **Source head:** `951e7baebb346803458e8e1733338631ddb9e1b5`.
- **Merge commit / deployed app commit:** `277051e4ec2216a6b598c784a50b32ba37b89dee`.
- **Changed files:** `src/App.css`, `src/App.js`, `src/App.test.js`.
- **Production deployment:** [Vercel deployment](https://vercel.com/nasrin-ai/movo/FRVNFKYmKHcrhnfvF8uhi7fwELVh), deployment ID `dpl_FRVNFKYmKHcrhnfvF8uhi7fwELVh`, status READY.
- **CI:** [Run #40986170215](https://github.com/nasrinaiv0/movo/actions/runs/40986170215), verify job completed successfully. The source PR reports typecheck passed, 17 test suites / 95 tests passed, production build passed, and `npm audit --omit=dev --audit-level=moderate` reported zero production dependency vulnerabilities.
- **Vercel PR check:** [Preview status](https://vercel.com/nasrin-ai/movo/DnzxADiPhZ3QkB8SuwADVmd7sZGb) reported success for the PR head.
- **Before:** The unauthenticated sample-finance UI could show realistic-looking balances and transactions under an owner-like identity (“Nasrin Abubakar” / `nasrin@nasrinai.com`) without an obvious demo warning.
- **After:** Uses `Demo User` / `demo@example.com` for the unauthenticated sample experience (and `Local User` for the local-only fallback), displays a responsive notice labelled for assistive technology, states the figures are fictional/not bank-linked/not saved or synced as personal financial records, and provides a working Sign in action. The notice is hidden on sign-in/legal screens and in cloud mode. Authenticated identity and an explicitly edited local profile name are preserved.
- **Rationale:** Prevent sample fixture data from being mistaken for real personal or bank-linked data and avoid implying the demo is the owner’s live financial account.
- **Security/privacy:** Transparency improvement; does not change authorization, data isolation, Supabase schema/RLS/grants, provider secrets, or production financial records. The notice is not a security boundary.
- **Production evidence recorded in merged main docs:** `docs/engineering/updates/2026-10-30-0935-production-demo-disclosure-and-chat-checks.md` states Playwright Chromium against `https://movo.nasrinai.com` returned HTTP 200; the disclosure and generic identity were visible; neither owner-like name nor email appeared; 390px viewport had no horizontal overflow; Sign in and Terms/Privacy cross-links worked; no console/page errors or failed requests were recorded. Additional preview smoke covered Home, Wallet, Transactions, NasrinAI, Profile, Settings, Notifications, Search dialog open/Escape close, and Profile navigation. These are existing recorded results; they were not re-run during this monitoring pass.
- **Dependencies/migrations:** No schema migration or database dependency introduced.
- **Open risks:** Demo disclosure correctness should remain covered by tests. It does not establish authenticated financial CRUD, chart correctness, or context isolation.

## Change record B — PR #58: current-main audit ledger merged

- **PR:** [#58](https://github.com/nasrinaiv0/movo/pull/58)
- **Merge commit:** `ca1a680c78baf7c87347c960d56c7bc207041bc3`, merged 2026-10-30 01:37:12 UTC (09:37:12 Asia/Manila).
- **Changed paths:** `docs/FRONTEND_ACTION_AUDIT.md`, `docs/PR_PROGRESS.md`, `docs/claude/MOVO_IMPLEMENTATION_STATUS_AND_CLAUDE_HANDOFF.md`, `docs/engineering/MASTER_CHANGE_LEDGER.md`, `docs/engineering/updates/2026-10-30-0920-change-log.md`, `docs/engineering/updates/2026-10-30-0920-runtime-dependency-and-context-isolation.md`, `docs/engineering/updates/2026-10-30-0935-production-demo-disclosure-and-chat-checks.md`.
- **Behavioral change:** Documentation only; the canonical audit snapshot, handoff, PR register, and evidence records are now on main.
- **Documentation defect found:** The merged master ledger still contains a prior snapshot sentence saying PR #58 “is the documentation reconciliation PR and should include this latest snapshot before merge.” That statement became stale when #58 merged. This delta explicitly supersedes it. Keep the historical sentence for audit chronology, but use the newest “Current state correction” in the appended master ledger/handoff for current status.
- **Tests/security:** No application tests are applicable to the documentation merge. No application behavior, secrets, or production data changed.

## Change record C — PR #60: UI control/accessibility audit

- **PR:** [#60](https://github.com/nasrinaiv0/movo/pull/60)
- **Current head:** `d80077b05067282fa76de16e7947aa73557e7550`.
- **Current base/main:** `ca1a680c78baf7c87347c960d56c7bc207041bc3`.
- **Current comparison:** 23 commits ahead, 0 behind; PR metadata says open, draft, mergeable.
- **Exact-head CI:** [Run #40989633601](https://github.com/nasrinaiv0/movo/actions/runs/40989633601), verify job completed successfully.
- **Preview:** [Vercel deployment](https://vercel.com/nasrin-ai/movo/GYUYgJVSG3H3aHbeRvpH1b246vr7) reports success/READY for the exact head.
- **Changed paths:** `docs/UI_CONTROL_AUDIT.md`, `package.json`, `scripts/audit-ui-controls.js`, `src/App.css`, `src/App.js`, `src/App.test.js`, `src/components/ui.js`, `src/components/ui.test.js`, `src/lib/format.js`, `src/lib/uiControlAudit.test.js`, `src/screens/Legal.test.js`, `src/screens/Profile.js`, `src/screens/Settings.js`, `src/screens/Settings.test.js`, `src/screens/Wallet.js`.
- **Before:** UI-control/accessibility checks and several interaction-state semantics were less repeatable; static detection did not consistently distinguish disabled states and empty handlers.
- **After:** Adds `npm run audit:controls`, a TypeScript-AST scanner run in the production prebuild, covering native buttons/anchors/forms, placeholder links, interactive ARIA roles, tab/checked/selected states, accessible dialog names, disabled-control explanations, and empty inline handlers. Includes keyboard/selected-state and `aria-busy` improvements and explains disabled CSV-import prerequisites.
- **Validation:** PR description records 20 suites / 111 tests, TypeScript typecheck, `audit:controls`, production build, and production-only dependency audit (zero production vulnerabilities). Static scan reported 31 source files, 94 buttons (9 disabled), 9 links, 5 forms, 3 interactive ARIA widgets, and 2 dialogs, with no obvious unhandled controls found.
- **Full dependency tree:** Still reported as 34 findings (16 low, 5 moderate, 13 high). The production-only audit does not clear build/test-tool vulnerabilities.
- **Security/accessibility limitations:** Static AST checks cannot prove correct business behavior, runtime focus management, screen-reader announcements, responsive interactions, or authenticated financial flows. PR remains draft until manual keyboard/focus, screen-reader, responsive, and finance-flow testing are recorded.
- **No schema or data changes:** No Supabase schema, RLS/grants, financial records, provider secrets, or authentication configuration changed.

## Change record D — PR #56: context isolation candidate, latest head validation state

- **PR:** [#56](https://github.com/nasrinaiv0/movo/pull/56); issue [#47](https://github.com/nasrinaiv0/movo/issues/47) remains open.
- **Latest head:** `30aaaf0fedb50e7b73bb36f285c5b744247a2c0c).
- **Current base/main:** `ca1a680c78baf7c87347c960d56c7bc207041bc3`.
- **Current comparison:** 19 commits ahead, 0 behind. PR metadata says open, draft, mergeable.
- **Latest GitHub Actions run:** [#40990086352](https://github.com/nasrinaiv0/movo/actions/runs/40990086352) was still `in_progress` when checked. Do not mark the latest head fully validated until this run completes successfully.
- **Latest Vercel status:** [Preview check](https://vercel.com/nasrin-ai/movo/CaaFALv6sPd7vWa1xRFqUwDRiHh2) reports success. The preview’s protected API route remains inaccessible to the previously attempted direct unauthenticated smoke due to Vercel SSO/origin constraints.
- **Latest commit diff:** `30aaaf0` changes only `docs/NASRINAI_CHAT_INTEGRATION.md`, adding a note that earlier validation applied to implementation head `1b3c93916d7d65ac6ba8fc4607ba726a7cd06d23`; the current documentation head still requires its own exact-head CI/preview confirmation.
- **Prior implementation-head evidence, not current-head evidence:** run [#40989833432](https://github.com/nasrinaiv0/movo/actions/runs/40989833432) passed 18 suites / 103 tests, typecheck, production-only audit, and build for `1b3c939`; preview [dpl_5kQQJRy2Qpgodxo2CQpgBQeah5tm](https://vercel.com/nasrin-ai/movo/5kQQJRy2Qpgodxo2CQpgBQeah5tm) was READY for that implementation head.
- **Intended behavior:** Separate user question from bounded allowlisted financial JSON; send `context_scope: "movo"`; do not reuse upstream conversation IDs; require explicit scope confirmation; fail closed without confirmation; avoid persisting unconfirmed messages; validate amounts/currencies instead of silently coercing invalid values; clear stale chat state on account switches; retain authenticated user JWT, owner filters, and RLS for finance reads.
- **Security/privacy:** The deployed NasrinAI upstream contains the server-enforced scope contract (PR #699 merged), but end-to-end MOVO enforcement is not yet proven by an authenticated request and cross-project canary. Production no-token POST returning 401 `sign_in_required` proves only the authentication gate, not scoped integration.
- **Release gate:** Do not merge PR #56 or close #47 until an authenticated synthetic-data request verifies the explicit `movo` scope marker and a harmless unrelated-project canary is absent from retrieval, provider prompt, response, transcript, caches, and logs. Include missing marker, retry, account switch, and sign-out/sign-in cases.
- **Legal/privacy copy:** The Privacy Policy explicitly discloses that upstream enforcement has not yet been independently verified. Keep the launch warning until operator/controller identity/address, retention/deletion schedule, provider/data-recipient disclosures, and jurisdiction-specific review are complete.

## Cross-project status

- NasrinAI main/production last verified in the prior cycle at `b39f4dcd62641d5f601e4e707cb46155ca8e135e`; no newer NasrinAI application commit or PR update was found in this review window. NasrinAI audit PR #711 remains open/draft at `4c93465bf38600ad6cebe26465bf51fb5c5abec4`; its prior checks were not refreshed here.
- MOVO current main after the merged documentation PR is `ca1a680c78baf7c87347c960d56c7bc207041bc3`. The production application deployment for the demo disclosure is READY for app commit `277051e4ec2216a6b598c784a50b32ba37b89dee`; the later `ca1a680` change is documentation-only.
- Supabase leaked-password protection remains reported disabled in the latest recorded advisor check. This review made no Auth configuration changes.
- No migrations were added or run by this audit. No database/RLS/grant changes were made.

## Prioritized next actions

1. Let PR #56 run #40990086352 complete; verify its conclusion against exact head `30aaaf0` and retain the Vercel status for that same head.
2. Perform the authenticated MOVO chat request and unrelated-project canary test; record sanitized evidence without printing or rotating secrets.
3. Keep PR #56 draft and issue #47 open until all context-boundary paths are verified.
4. Reconcile PR #60’s exact head if new commits arrive, then complete manual keyboard, focus, screen-reader, responsive, and authenticated finance-flow tests before merge.
5. Correct the stale PR #58 status in current-state summaries (this audit does so in the appended records); preserve prior snapshot text as historical evidence.
6. Keep the production-only dependency audit and separately triage the 34 full-tree findings.
7. Enable Supabase leaked-password protection through an authorized configuration change and recheck the Security Advisor.
8. Keep legal publication warning until required legal facts and provider disclosures are confirmed.
