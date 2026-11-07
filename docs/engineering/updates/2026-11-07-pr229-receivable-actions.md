# MOVO PR #229 — Owed to you: Collect, Edit and Delete

Date: 2026-11-07

## Requirement
Under Financial Planning > Owed to you, add Collect, Edit and Delete buttons consistent with Loans & Debts without changing existing layout or financial accuracy.

## Implementation
- Each receivable uses existing fp-loan-card and fp-loan-actions styling, preserving compact three-column layout, SVG icons, borderless controls and at least 44px touch targets.
- Collect uses the existing receivable event flow with collected preselected and an appropriate currency-matched account. Existing SQL RPC verifies owner identity, outstanding limit and currency, then records cash account postings. The app does not transfer money at the bank. Collect is disabled when settled or outstanding amount is zero.
- Edit changes only name, counterparty, reason, due date and notes, never opening principal, outstanding amount, currency, linked account, status or recorded collection events. The query is scoped to the owner and excludes archived records.
- Delete requires confirmation, then soft-archives the receivable. Linked collection events and account balances are kept. Archived receivables are excluded from this planning panel; archiving does not cancel a real-world debt.
- The existing cloud run handler refreshes planning/account balances only after a successful write. The rest of MOVO is not affected.

## Verification
- New repository and UI regression tests for metadata restrictions, validation, ownership, soft archive, collection form and settled state.
- New translations in all 11 non-English languages through the existing i18n generation pipeline.
- Run Vercel Sandbox npm ci, npm run i18n, focused Jest suite, CI=true npm run build and git diff --check, then exact-head GitHub CI. Live iPhone light/dark preview remains a separate release gate because Vercel may ignore PR previews.
