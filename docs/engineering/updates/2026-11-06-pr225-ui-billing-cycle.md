# MOVO PR #225 — UI and present-cycle billing rules

Date: 2026-11-06

## Change
- New Wallet edit-square pencil and Transactions share-arrow quick-action icons match screenshot references and inherit theme/accent ink.
- Total Spent chart remains to the right of the amount; card height reduced and previous-cycle status aligned with the month labels.
- Bills Due and Financial Planning show unpaid overdue occurrences and at most one current billing cycle due date per bill, without adding future renewals or double-counting exact-cent amounts.
- Preserve existing click actions, accounting ledger records, accessibility labels and translations.

## Evidence
Vercel Sandbox: 108 suites / 618 tests passed; TypeScript and production build passed on the original implementation branch. Rebased PR CI must pass independently. Commercial release is not implied.

## Follow-up
Review PR #225 CI and preview. Documentation progress register updated in this commit.
