# Audit delta — 2026-10-30 10:35 Asia/Manila
## Scope and evidence boundary
Read-only review of GitHub main refs, PR metadata, exact-head Actions runs, repository rulesets endpoints, and Vercel deployment metadata. No application code, Supabase state, secrets, branch settings, merges, or deployments were changed.

## Current main and production snapshot
- Repository: nasrinaiv0/movo.
- Main SHA: ca1a680c78baf7c87347c960d56c7bc207041bc3. The commit is a documentation/audit refresh following the application commit 277051e4ec2216a6b598c784a50b32ba37b89dee.
- Current production deployment: dpl_FRVNFKYmKHcrhnfvF8uhi7fwELVh; READY at application commit 277051e4ec2216a6b598c784a50b32ba37b89dee (sample-finance disclosure). The later main commit ca1a680 is documentation-only; no newer production application deployment was returned.
- Main combined status returned Vercel success. This does not prove every finance or chat flow is correct.

## Newly verified release-control risk: main is not protected
- GitHub branch endpoint: https://api.github.com/repos/nasrinaiv0/movo/branches/main reports protected=false; required_status_checks.enforcement_level=off; contexts=[]; checks=[].
- Repository rulesets endpoint: https://api.github.com/repos/nasrinaiv0/movo/rulesets returned [].
- Interpretation: no classic branch protection or repository-level ruleset was visible through these endpoints. Any external organization/user-level policy outside the checked response was not separately verified.
- Impact: successful CI is not visibly enforced as a merge prerequisite by repository-level configuration. This is a release-governance risk.
- Recommended owner action: configure main protection/rules requiring PR review, current Phase 1 CI and relevant audit gates, plus denial of force-push/deletion. This audit did not change settings.

## PR #61 — audit documentation progress
- Head: 04dea558066d56be34f2babe844ed0f5bed8d4c2; open/draft, documentation-only.
- Exact-head Phase 1 CI: https://github.com/nasrinaiv0/movo/actions/runs/40990360004 — completed success.
- Exact-head Vercel preview deployment: dpl_DgProVYtiyPMD7ZQEndJt1b9Zhjh; READY; preview target, not production.
- This resolves the prior checkpoint's queued/pending CI and preview status. PR remains unmerged; the documentation snapshot must be kept separate from application behavior claims.

## PR #56 — MOVO-only NasrinAI context boundary
- Head: 30aaaf0fedb50e7b73bb36f285c5b744247a2c0c; open/draft; 19 commits ahead / 0 behind current main.
- Exact-head CI: https://github.com/nasrinaiv0/movo/actions/runs/40990086352 — success; 18 suites / 103 tests, TypeScript typecheck, production-only dependency audit (0 vulnerabilities), production build. Vercel preview dpl_CaaFALv6sPd7vWa1xRFqUwDRiHh2 is READY.
- Still not verified: authenticated production scoped POST and unrelated-project canary across retrieval, provider request, response, transcript, caches, and logs. Issue #47 remains open. Do not treat green CI or preview READY as proof of the data boundary.

## PR #60 — UI control/accessibility audit
- Head: d80077b05067282fa76de16e7947aa73557e7550; open/draft; 23 commits ahead / 0 behind main.
- Exact-head CI: https://github.com/nasrinaiv0/movo/actions/runs/40989633601 — success; 20 suites / 111 tests, typecheck, audit:controls, production-only dependency audit (0 vulnerabilities), and production build. Vercel preview dpl_GYUYgJVSG3H3aHbeRvpH1b246vr7 is READY.
- Static scanner findings are not a substitute for manual keyboard/focus, screen-reader, responsive interaction, or authenticated finance-flow testing. Keep draft until those are recorded.

## PR #52 — chart currency and malformed-data validation
- Head: 8fe91e2bc09dfc0ace03fd1df82fe68bd93917f2; open/draft, 0 commits behind main per PR record.
- Exact-head CI recorded in PR: https://github.com/nasrinaiv0/movo/actions/runs/40988481343 — success; 18 suites / 101 tests, typecheck, production-only audit (0 vulnerabilities), production build. Vercel preview dpl_FJ8msgyvqug4qNXjBauUd5GfR7DJ READY.
- Still not verified: charts reflect authenticated user's authorized financial records. Rendering tests alone do not prove data provenance or finance calculation correctness.

## Carried-forward security and quality risks
- Full dependency tree still reports 34 findings (16 low, 5 moderate, 13 high); production-only audit reports 0. Do not conflate these scopes.
- Supabase leaked-password protection was previously reported disabled; not rechecked in this checkpoint.
- Legal publication and manual accessibility gates remain outstanding.
- The screenshot-backed unrelated-context issue #47 remains open. The screenshot establishes irrelevant content, not by itself a cross-user financial data exposure.

## Actions
1. Owner to enable main-branch protection/rules; no settings changed by this audit.
2. Keep PR #56 draft until authenticated scoped POST and unrelated-project canary pass.
3. Keep PR #60 draft until manual accessibility and finance-flow checks are documented.
4. Keep PR #52 draft until chart values are checked against authorized synthetic financial records.
5. Track full dependency-tree findings separately from production-only audit.
6. Recheck Auth leaked-password protection and legal publication requirements through authorized workflows.
