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
- supabase/migrations/202611010001_obligations_receivables_goals.sql: user-scoped tables for loans/debts and events, receivables and events, goal allocations, and an account-posting ledger; RLS, owner-reference guards, atomic event RPCs, and concurrency-safe same-currency goal allocation.
- src/lib/obligationsRepository.js: validated cloud read/write methods for loans, debts, receivables, goals and allocations.
- src/screens/FinancialPlanning.js and src/screens/Menu.js: a Financial Planning screen with overview metrics, loan/debt tracking, receivables, goal creation, allocation and release flows.
- src/App.js and src/lib/financeCalculations.js: cloud accounting postings are loaded into the account balance projection without being counted as ordinary income/expense transactions.
- Existing PR #100 includes transaction routing, transfer activity net, account balance and savings corrections plus regression tests.

## Remaining limitations / verification gates

- The migration has not been applied to the user's Supabase project by this change; no live database mutation was performed. Cloud UI will need that migration applied before those screens can load/save.
- A newly entered loan or receivable is treated as an existing opening balance. Additional borrowing/lending, principal payments, collections, interest and fees are recorded as events. Interest and fee postings currently affect cash/account balance but still need to be incorporated into the main expense analytics totals without double-counting the account posting.
- Loan/receivable events and account postings are atomic via database functions/triggers, but event posting behavior has not yet been tested against a live Supabase database.
- Goal allocation is restricted to same-currency bank/e-wallet/cash accounts and serialized by account lock. Accounts with mixed historical transaction currencies are rejected until reconciled.
- FX totals are converted to a home currency for projections, but cross-currency transfers still need persisted destination amount, locked exchange rate and fees to preserve historical exactness.
- Current transaction validation remains income/expense/transfer only; loans, debts, receivables and goals use their dedicated screen and event flows.
- CI on the final head is still running; merge and production behavior are not verified.
