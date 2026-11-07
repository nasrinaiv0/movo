# MOVO — Transaction running balance display (2026-11-08)

## Scope
- Add a **Show balance after each transaction** toggle in Settings > Transaction History (enabled by default).
- In the Transactions, Home, Wallet and account-history views, show the native-currency balance calculated immediately after each posted ledger entry.
- Transfers display both sender and recipient balances. Debit cards linked to a bank use the bank's actual ledger; a credit card with a configured limit displays remaining credit.
- Honor the existing "Hide balances" privacy control; all monetary values retain two decimal places.
- Do **not** write balance snapshots into the transaction table. Historical balances are recomputed from opening balances and posted transactions; editing, deleting or reversing a transaction recalculates the history. The new toggle changes display only, not the activity log or automatic logging.

## Accounting and security safeguards
- Use MOVO's canonical accountTransactionDelta, isPostedTransaction and roundMoney rules and stored account currency. Respect deleted, reversed, pending and scheduled status flags.
- Account-scoped source/target IDs and linked debit-card routing. Do not combine accounts with different currencies in a single fabricated total.
- Account balances rely on user-managed opening balances, timestamps and exchange rates. Historical values are estimates based on MOVO's records, not independently verified bank statement balances.
- Transactions lacking a resolvable account or conversion rate **must not** receive a fabricated balance. Accounting postings without timestamp make affected account history unavailable.
- Unposted credit-card payments are applied once on the recorded payment date; payments linked to actual ledger transactions are not double counted.
- No RLS, Supabase schema, billing, production data or secrets are modified by this change.
- Existing PR #227 security work remains independent, unmerged and out of scope.

## Review and rollout
- Verify tests for income, expense, transfers, linked cards, credit limit, cents, invalid FX, reversed activity, toggle privacy and responsive mobile styling.
- Run all Jest suites, TypeScript and production build in Vercel Sandbox, then validate a deployment preview and light/dark mobile rendering.
- Do not merge on passing unit tests alone; check exact commit GitHub Actions and Vercel preview status before release.
