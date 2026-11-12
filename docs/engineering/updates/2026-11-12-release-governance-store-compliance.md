# 2026-11-12 - MOVO branch protection and store declaration preparation

**Scope:** Owner request to fix missing enforced release protection and incomplete legal/store declaration readiness. This change is DOCUMENTATION ONLY, on a separate branch. **No PR was created.** No main changes, deployed code, billing flag, store-console response, or legal notice was published.

## Verified pre-commit evidence
- GitHub `main` at `2b9a1cf7720043c48c20d37d6f64e45e9f5e272a`; branch reports `protected=false`, status checks enforcement off, and no repository rulesets. The GitHub integration returns 403 for its protection API and exposes no branch/ruleset write action. GitHub-admin UI action is required.
- `MOVO Phase 1 CI / Automated verification` and `MOVO Finance Tenant Isolation (local PostgreSQL) / Isolated two-user financial RPC regression` trigger on **every** pull request to main.
- Android native security build, iOS build, IAP integrity, and hybrid-sync security workflows have path filters or manual triggers. Requiring them for every PR as configured could deadlock docs-only PRs. Add unconditional pass-through jobs or change triggers before making these mandatory.
- Main contains `public/privacy.html`, `public/terms.html`, `public/account-deletion.html`, and `docs/commercial/RELEASE_DOCUMENT_TASKS.md`. Their existence is not proof of live URL accessibility, completeness or legal sign-off.
- The Terms include a minors-with-parent-permission clause. This needs owner/legal review against the intended 18+ audience; not silently changed here.
- The GitHub connection does not include Google Play Console or App Store Connect declaration write access. No forms were submitted. The live URL fetch was not independently confirmed.
- Existing security and monetization blockers remain separate; producing declaration drafts is NOT release approval.

## Work prepared before commit
1. Branch-protection configuration and verification plan in `docs/security/MAIN_BRANCH_PROTECTION_2026-11-12.md`.
2. Evidence-based draft declaration workbook in `docs/commercial/STORE_DECLARATIONS_DRAFT_2026-11-12.md`.
3. This dated progress note and a central `docs/PR_PROGRESS.md` entry.

## Validation
- Static document checks: explicit draft/unsubmitted labels, no credentials, no actual personal address or unsupplied operator name, exact source commit, verified required workflow names, source links, open unresolved owner tasks, and accurate Play/Apple scope.
- Source code and active production were not modified. Browser, Google Play, App Store, legal counsel, and real-device tests are NOT RUN; do not mark them passed.

## Risks / manual work / rollback
- Only the GitHub repository admin can enable branch protection via the GitHub UI in this connection. Arrange a reviewer before requiring one approval, or initially set PR + CI without mandatory approval to avoid locking out a solo account.
- Owner must confirm provider/SDK data flows, operator identity and age eligibility; submit accurate Play and App Store declarations in the official consoles; test public privacy/terms/deletion URLs; arrange formal legal/privacy sign-off.
- Rollback: delete this unmerged docs branch if the owner declines it; main and production remain unchanged.
