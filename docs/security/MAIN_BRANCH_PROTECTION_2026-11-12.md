# MOVO - Enforce release protection on main (admin action required)

**Status: NOT APPLIED; configuration guide only.**
**Audited:** 2026-11-12, repository `nasrinaiv0/movo`, source `2b9a1cf7720043c48c20d37d6f64e45e9f5e272a`.
**Scope:** Protect an existing public, personal-account GitHub repository without disabling legitimate CI or deadlocking development.

## Evidence
GitHub Branch API reports `main.protected = false`, `protection.enabled = false`, `required_status_checks.enforcement_level = off`. Repository ruleset list is empty. The connected GitHub App cannot write branch protection/ruleset configurations and returns HTTP 403 on direct branch protection reads. No branch protection has been enabled by this preparation.

## Owner setup (do this using GitHub as the repository administrator)
1. Open https://github.com/nasrinaiv0/movo/settings/branches and select **Add classic branch protection rule**.
2. Target branch name exactly `main`; do not target all branches until preview and release workflows are reviewed.
3. Enable **Require a pull request before merging**.
4. Set **required approvals = 1** and dismiss stale reviews only when there is an available independent reviewer. If sole maintainer, first enforce PR+CI with no mandatory approval, then add 1 approval when a reviewer is onboarded; otherwise you may lock yourself out.
5. Enable **Require status checks to pass before merging**, **Require branches to be up to date before merging**, and select the *exact job context names visible on a recent successful PR check run*: `Automated verification` (Phase 1 CI), and `Isolated two-user financial RPC regression` (Finance Tenant Isolation). Use the GitHub UI chooser; do not type guessed check names. Prefer selecting the expected GitHub Actions app as the source.
6. Enable **Require conversation resolution before merging** and **Do not allow bypassing the above settings**, including administrators.
7. Leave **Allow force pushes** and **Allow deletions** unchecked. Do not select **Lock branch** (that blocks every ordinary release).
8. Do **not** enforce linear history initially: the repository contains merge commits, and existing PR merge methods need alignment. Do not require signed commits until all human and CI signers are confirmed.
9. **Do not** require the path-filtered native Android, iOS, hybrid-sync or IAP checks until their workflows are made to run a stable required context on every PR. A required check that is skipped entirely by a path filter may remain pending and block merges indefinitely.
10. Do **not** require successful Production deployment **before** merging; production only deploys after merge. Consider a preview deployment status after confirming Vercel consistently returns it for every PR and the project is healthy.
11. Save the rule and independently re-fetch https://api.github.com/repos/nasrinaiv0/movo/branches/main. Confirm `protected:true` and inspect the required check list.
12. Verify with a disposable docs-only PR *only after owner approval* and a real reviewer. Confirm blocked direct pushes, green required checks and approval before merging. Do not use a production deploy as a protection test.

### Required contexts known to run on every PR
- `.github/workflows/phase1-ci.yml`: job name `Automated verification`, workflow `MOVO Phase 1 CI` (pull_request to main, no paths filter).
- `.github/workflows/finance-tenant-isolation.yml`: job `Isolated two-user financial RPC regression`, workflow `MOVO Finance Tenant Isolation (local PostgreSQL)` (pull_request to main, no paths filter).
- Hybrid sync, IAP, Android native, and iOS CI are path-filtered, so **not safe as universal required checks** without workflow changes.

## Pros and cons
- **Advantage:** prevents silent direct code changes, merges that fail CI, force pushes, and deletion of the release branch.
- **Tradeoff:** stricter workflow and review latency; all-required checks can block delivery if Vercel/Actions fails; independent review needs an actual second reviewer.
- **Fallback for solo owner:** require PR + two unconditional CI jobs + conversations, prevent admin bypass, then add independent approval later.

## Relevant GitHub documentation
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
