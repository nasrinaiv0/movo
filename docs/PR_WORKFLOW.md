# MOVO PR Progress and Audit Trail

## Purpose

Every pull request must leave a durable record of intent, implementation progress, review, validation, blockers, and final disposition. The GitHub PR is the detailed timeline; `docs/PR_PROGRESS.md` is the repository-wide index.

## Required lifecycle

1. **Open** — use the PR template; state scope, owner, acceptance criteria, risks, and initial plan.
2. **During implementation** — add dated progress notes to the PR description or timeline. Link meaningful commits, review decisions, CI runs, preview links, and blockers. Keep the central register aligned when status or scope materially changes.
3. **Validation** — report test and build outcomes for the current head SHA. Separate passing checks from skipped/canceled checks and manual review. A canceled Vercel build is not a successful deployment.
4. **Review / blocked** — document requested changes, the decision, who owns follow-up, and any linked issue. Do not silently drop unresolved findings.
5. **Merge / close** — record final disposition and date, merge commit if merged, final checks, and remaining follow-up issues in the historical section of the register. Closed-but-unmerged PRs must also be retained.
6. **Reconciliation** — when working on MOVO, inspect all open PRs and update the register; never rely on memory or a one-time snapshot.

## Required progress entry

Use a short dated entry in the PR timeline, for example:

`YYYY-MM-DD — Progress: <change>; Validation: <test/build and current head SHA>; Blocker: <none or detail>; Next: <specific next step>.`

## MOVO responsibility boundary

- Architecture, business rules, data model, API contracts, integrations, security, integrity, tests, and deployment correctness are engineering responsibilities.
- UI/UX visual design and styling are owned by the design collaborator. Engineering changes to UI should be limited to required behavior/contracts unless coordinated.
- Sample finance records must remain clearly labeled as sample data. Never imply that mock notification settings deliver real push/email notifications.

## Recordkeeping standards

- Preserve links to PRs, commits, CI runs, and issues.
- Do not store secrets, credentials, or real financial data in the register.
- Do not claim a feature is complete merely because its code exists.
- Do not claim all checks passed based on an older SHA or a skipped/canceled job.
- Historical records are append-only in intent: correct mistakes transparently; do not erase completed PR history.
