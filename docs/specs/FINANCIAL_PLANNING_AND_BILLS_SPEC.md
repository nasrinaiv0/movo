# MOVO Financial Planning Dashboard + Bills & Payments — specification

Source: owner's PDF "MOVO Financial Planning and Bills Specification" (15 pages, 2026-11-01), transcribed here so it lives in the repo. Product spec, not proof of implementation.

**Purpose:** bring debts, money owed, savings, goals, spending limits, bills, accounts and currencies into one consistent financial picture.
**Design principle:** clear numbers first, simple formulas, no double-counting. Preserve the existing MOVO UI and verify changes with tests.

## 1. The complete financial picture (Home)

Every card drills into the records behind its number.

| Card | Definition |
|---|---|
| Total balance | Available asset balances (eligible liquid accounts; excludes credit limits; bank + linked debit card counted once) |
| Net worth | Assets − liabilities, in base currency |
| Spent | Expenses in the selected period, net of refunds; excludes transfers and card payments already represented by card purchases |
| Savings | Savings accounts + allocations — allocations are never added to balances a second time |
| Debt | Outstanding liabilities |
| Money owed to you | Open receivables |
| Bills due | Unpaid bill occurrences (not the whole future schedule) |
| Goal progress | Allocated ÷ target |

Home order: 1 Total balance + Net worth · 2 Total spent + cash-flow chart · 3 Bills due/overdue · 4 Debts & loans · 5 Savings + goals · 6 Money owed to you · 7 Spending limits.
Visual rules: compact cards, consistent heights, one clear primary number; green default accent with adaptive light/dark contrast; progress bars for paid/debt, spent/limit, saved/goal, paid bills; details behind a tap; one accounting source of truth so every card agrees with the ledger.

## 2. Debts & loans

- Credit card: available credit = limit − outstanding; utilization = outstanding ÷ limit. A card purchase is an expense and increases card liability; a card payment reduces bank and card liability (not a second expense); refunds reverse the expense; available credit is never cash or an asset; never sum a debit card and its bank account.
- Loans: store original principal, outstanding principal, rate, fees, schedule, due date; split repayments into principal/interest/fees when known; disbursement increases cash and liability (not income); repayment reduces liability and cash; interest and fees are expenses.
- Repayment progress = principal repaid ÷ original principal.

## 3. Money owed to you (receivables)

Fields: person/organization, original amount + currency, paid back, remaining (original − collected, adjusted for write-offs), due date/status (upcoming, overdue, partially paid, paid, written off), linked transactions.
Lending: cash down, receivable up (not an expense). Repaid: cash up, receivable down (not income). Interest received is income. Never count a receivable twice.

## 4. Savings & interest

Savings amount, optional rate (APR/APY labelled), frequency, simple/compound, estimate vs actual (estimates labelled; post actual interest only when confirmed). A = P × (1 + r/n)^(n×t) is an estimate only. Savings is normally part of the account balance already; marking/allocating must not create another asset.

## 5. Plans & savings goals

Fields: name/category, target + currency, allocated amount, funding source, target date, status (active, paused, completed, archived), activity history.
Progress = allocated ÷ target (display capped at 100%, keep overfunding data); remaining = max(target − allocated, 0); suggested monthly = remaining ÷ months left.
Safeguards: allocation reserves existing funds; cannot exceed available funds; no double allocation across goals; check ownership, currency, eligibility; transfers are not expenses.

## 6. Spending limits

By category, account, merchant or custom group, per period. Spent/limit, remaining = max(limit − spent, 0), progress, status (on track, nearing, reached, exceeded; configurable warning, e.g. 80%). Count expenses once; exclude transfers; don't count card payments if card purchases were recorded; refunds reduce spending by a documented rule; show period and currency beside every limit.

## 7. Bills & payments

Home cards: due this month (estimated vs confirmed), paid this month, remaining, overdue, upcoming.
Categories: housing/rent, utilities, telecom/internet, credit cards, loans, insurance, education, transportation, subscriptions, healthcare, government/taxes, childcare, memberships, other.
Fields: name + category; amount fixed/variable + currency; frequency one-time/weekly/monthly/quarterly/semiannual/annual/custom; billing date vs due date; payment account (or unassigned); recurring creates next occurrence but never auto-deducts; reminders (days before, due date, overdue); late fee separate; notes/attachment; status scheduled/due/partially paid/paid/overdue/cancelled.
Variable bills: estimate until actual is known; an estimate never changes balances or posts an expense; keep history.

## 8. Bill payment flow & accounting

Flow: open bill → confirm amount/date/currency/source → record (payment + linked ledger entry, idempotency key) → update occurrence → reconcile (paid externally, no second charge) → audit history.

| Scenario | Treatment | Safeguard |
|---|---|---|
| Paid from bank | Bank down, expense once | No duplicate expense |
| Charged to credit card | Expense; card liability up | Not a cash payment |
| Card statement paid | Bank down, card liability down | Not a second expense |
| Loan installment | Cash down; principal down; interest/fees expensed | Split when known |
| Partial payment | Record amount paid only | Stays partial until settled |
| Paid externally | Reconcile, no second debit | No duplicate cash movement |
| Recurring bill | Create next occurrence | Never auto-deduct |

Recording a payment inside MOVO records what the user says happened; it does not move money unless a supported, authorized payment integration exists.
Reminder defaults: 7 days (optional), 3 days, 1 day, due date, overdue at configurable cadence, payment confirmation.

## 9. Wallet & account types

Bank (source of truth for linked debit card), debit card (instrument, no second balance), cash, e-wallet, credit card (liability with limit), gift card (stored value), crypto (quantity + valuation time + price source), other/custom (explicit behaviour). Distinguish posted, pending and reconciled.

## 10. Currency conversion

Store original amount/currency/date/account; convert to base for summaries; cache rate with provider, timestamp, staleness; historical reports prefer transaction-date or saved rate; exchanges recorded as linked movements with fees; unavailable rate → show last updated, label stale.
Net worth (base) = Σ eligible asset valuations − Σ liabilities, under a documented valuation-rate policy.

## 11. One accounting engine

| Event | Asset | Liability/other | Income/expense |
|---|---|---|---|
| Salary | Bank/cash + | — | Income + |
| Purchase | Bank/cash − | — | Expense + |
| Card purchase | none | Card + | Expense + |
| Card payment | Bank − | Card − | none |
| Own transfer | Source −, dest + | — | none |
| Loan received | Cash + | Loan + | none |
| Principal repayment | Cash − | Loan − | none |
| Interest/fee | Cash − | as applicable | Expense + |
| Lend money | Cash − | Receivable + | none |
| Repaid to user | Cash + | Receivable − | none |
| Bill on card | none | Card + | Expense + |
| Goal allocation | none | — | none |
| Interest earned | Savings + | — | Income + |

Invariants: each real event hits the ledger once; every posting traceable (source, account, currency, timestamp, domain object); reversals as explicit records, never silent deletes; idempotency keys for webhook/shortcut/notification/payment retries; pending/posted/reconciled/reversed states; currency-aware, decimal-safe arithmetic.

## 12. Data model (reuse existing tables first)

financial_accounts, payment_instruments, credit_card_details, financial_transactions, accounting_postings, financial_loans + loan_events, financial_receivables + receivable_events, savings_goals + goal_allocations, budgets/spending_limits, financial_bills, financial_bill_occurrences, financial_bill_payments, financial_bill_reminders, fx_rate_cache/crypto_price_cache.
DB rules: RLS on all personal records; server-side ownership checks for anything that moves or allocates funds; FKs and constraints; unique (bill + period) and idempotency keys; no full card numbers, CVV, passwords or bank credentials; production-safe migrations reconciled with applied history.

## 13. Implementation plan

0 Audit · 1 Ledger correctness · 2 Obligations · 3 Goals & savings · 4 Spending limits · 5 Bills · 6 Home dashboard · 7 Currency & crypto · 8 Production readiness (RLS, migrations, observability, accessibility, performance, regression suite).
Discipline: inspect open PRs first; preserve the UI; targeted tests then full suite and build; fix failures, add regression tests; check Vercel logs and Supabase migrations/RLS; never report done until implementation, tests and production verification pass.

## 14. QA checklist

Dashboard totals reconcile; bank + debit not double-counted; card purchase/refund/statement/partial/overpay/limit; loan disbursement/split/extra/missed/fee/early payoff; receivable partial/full/overdue/write-off/interest; goal allocation/withdrawal/move/insufficient/duplicate/complete; limits with refunds/transfers/card payments; bills one-time/recurring/month-end/leap year/variable/partial/late fee/cancel/external; idempotency; currency missing/stale/historical/fee/crypto; RLS isolation; light/dark, keyboard, mobile; network failure/retry/duplicate submit/rollback/migration replay.
Acceptance: a UI that looks right is not a pass — verify stored records, postings, summaries and the regression suite, happy and failure paths.

## 15. Definitions

Total balance, net worth, total spent, debt, money owed to you, bills remaining (unpaid active occurrences only), savings (protected subset, never re-added), goal progress (allocation is not new money) — as in section 1.
