# MOVO transaction routing and calculation audit

**Date:** 2026-11-01  
**Scope:** transaction effects, account balances, activity grouping, savings tile  
**Branch:** `fix/transaction-routing-ledger-reconciliation`

## Implemented in this change

- Added `src/lib/financeCalculations.js` as the shared definition for account posting effects and activity net amounts.
- Income posts positively only to its selected account.
- Expenses post negatively only to their selected account.
- Transfers post negatively to the source and positively to the destination. They have zero effect on income, expenses and net activity.
- Account balance is opening balance plus routed transaction effects. Cross-currency effects are converted from the transaction currency into the account currency through the supplied conversion function.
- Savings is calculated separately from monthly net cash flow: it includes active non-cash accounts and excludes credit-card accounts when their card kind is explicitly marked `credit`.
- Transaction day-group net totals no longer count internal transfers as new money.
- The Savings tile no longer displays a monthly cash-flow trend as if it were a savings-balance trend.
- Added regression tests for income/expense routing, transfer source/destination posting, balance reconciliation, currency conversion, activity net and savings eligibility.

## Canonical routing matrix

| Type | Source account | Destination account | Income | Expense | Activity net |
|---|---:|---:|---:|---:|---:|
| Income | — | +amount to selected account | +amount | 0 | +amount |
| Expense | -amount from selected account | — | 0 | +amount | -amount |
| Transfer | -amount | +amount | 0 | 0 | 0 |

All entered amounts must be positive. Direction comes from transaction type and account role, not a negative amount.

## Core calculations

`account balance = opening balance + incoming postings - outgoing postings`

`monthly net cash flow = income - expenses`

`savings balance = sum of active eligible non-cash account balances`

`total account balance = sum of active account balances, converted to home currency`

Cash remains part of total account balance, but is excluded from the Savings tile. Credit cards are excluded from savings when explicitly classified as credit cards. MOVO does not initiate transfers or verify bank balances.

## Entry paths that must preserve the same contract

- Manual transaction sheet
- Chat transaction logging
- Receipt scanning
- CSV import
- Notification / Apple Pay shortcut logging
- Edit and delete operations

All paths should persist the same transaction type, positive amount, currency, source account, optional transfer destination, timestamp and reference metadata. A successful save must be followed by recomputation from the same ledger data, not a separate incremental UI total.

## Known items requiring further verification

1. **Automated test execution:** the new tests are committed to this branch; the GitHub Actions result for this exact head must be checked before considering the change validated.
2. **Cross-currency transfer accounting:** destination amount / locked exchange rate and any fees are not persisted as a distinct transfer value. A later FX-rate change can change the converted destination balance. Do not claim exact historical FX reconciliation until the schema and form capture this.
3. **Credit-card balance semantics:** card account balances are currently treated by the existing account-balance UI as tracked balances. Savings excludes cards explicitly classified as credit, but the product should define whether card balances represent available credit, debt, or a linked debit account before calculating net worth.
4. **Refunds and adjustments:** current supported transaction types are income, expense and transfer. Refunds should be linked to the original expense (or use an explicit reversal model) rather than treated as ordinary income by inference.
5. **Production verification:** this branch is not proof of deployed production behavior. Verify authenticated cloud writes, RLS/owner isolation, CSV imports, and deployed balances after CI passes.

## Required verification

- `npm test -- --runInBand`
- `npm run typecheck`
- `CI=true npx react-scripts build`
- Verify the exact branch head's GitHub Actions checks and Vercel preview.
- Test manual, chat, receipt, CSV, notification and edit/delete routes with the same fixture ledger.
- Confirm transfer source + destination postings sum to zero in the same currency.
