# MOVO financial obligations, receivables and goals

Date: 2026-11-01. Scope: MOVO only.

## Canonical accounting rules

- Income increases the selected asset account and income totals.
- Expense decreases the selected asset account and increases expense totals.
- Internal transfer decreases source and increases destination; it is neither income nor expense. Cross-currency transfers must persist destination amount, exchange rate and fees before historical exactness is claimed.
- Opening balance seeds an account and is not income or expense.
- Loan proceeds increase cash/assets and loan liability by the same amount; not income.
- Loan principal repayment reduces cash and liability; not expense. Interest and borrowing fees are expenses.
- Credit-card purchase is an expense and increases card liability. Card payment reduces cash and card liability, not a second expense.
- Money owed to the user (receivable): lending moves cash to a receivable asset, not an expense. Collection reduces receivable and increases cash, not new income. Write-off is an expense.
- Savings goal earmarks existing assets; it is not a new asset or income. Progress is allocated funds / target, capped at 100%. Released allocations no longer count.
- Net worth = assets (including receivables) minus liabilities (including loans and credit-card debt).
- Available money = liquid account balances minus active goal allocations/reservations. Receivables and credit limits are not spendable cash.

## Added in this branch

- src/lib/accounting.js: pure projections for loans, receivables, card events, goals, net worth and available money.
- src/lib/accounting.test.js: regression tests for these rules.
- supabase/migrations/202611010001_obligations_receivables_goals.sql: user-scoped tables for loans/events, receivables/events, savings goals and allocations, with constraints, indexes and RLS policies/grants.
- Existing PR #100 adds shared transaction routing, account balance math, savings correction and transfer summary tests.

## Not yet integrated or verified

- The migration has not been applied to the user's Supabase project by this change; no live database mutation was performed.
- New helpers and tables are not yet wired into dedicated app screens/forms or the existing transaction composer. Current transaction validation accepts income, expense and transfer only. Do not claim end-user UI availability until save flows and screens are integrated.
- Loan/receivable event tables are audit trails; event insertion and outstanding-balance updates must be wrapped in a server-side database transaction/function before production writes. Multi-step client writes can leave inconsistent balances.
- Goal allocation caps are validated in the shared helper but need a concurrency-safe server-side aggregate check to prevent simultaneous over-allocation.
- FX totals must be converted to one home currency before aggregation. Persist historical conversion snapshots to prevent current-rate changes rewriting history.
- Exact migration chain, CI on the final head, merge state and production deployment remain unverified.
