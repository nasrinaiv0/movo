# MOVO Bills & Payments

Date: 2026-11-01. Scope: MOVO only. Spec: Financial Planning Dashboard + Bills & Payments, sections 7–8 (phase 5).

## Accounting rules

- A bill is a scheduled obligation. Each due date is one occurrence (`unique (bill_id, due_date)`).
- Amount due = actual amount (or the estimate for a variable bill) + late fee. An estimate never changes a balance or creates an expense.
- **Recorded** payment from an account creates exactly one expense transaction from that account (source `manual`, `external_reference = movo-bill-<key>`). The account balance then follows the normal ledger. Paying a bill from a credit card is a card expense (card liability rises), not a cash payment.
- **Paid elsewhere** only reconciles the occurrence (optionally linking an existing transaction); no account is debited.
- Partial payments keep the occurrence `partially_paid` until the remainder is paid. Overpayment is refused.
- Every payment has an idempotency key: a retry with the same key returns the first payment and posts nothing again.
- Generating the next occurrence never moves money. MOVO records what the person says happened; it does not pay a biller.
- Monthly/quarterly/semiannual/annual dates are counted from the first due date, so a bill on the 31st falls on the last day of shorter months (Feb 29 in leap years) and returns to the 31st.
- Old schedules are not back-filled: occurrences due more than 31 days ago are not created (except a one-time bill).

## Added

- `supabase/migrations/20261101120000_bills_payments.sql`: `financial_bills`, `bill_occurrences`, `bill_payments`. RLS is owner-only. Bills are edited directly; occurrences and payments only change through `ensure_bill_occurrences`, `update_bill_occurrence` and `record_bill_payment` (security definer, `authenticated` only, `anon` revoked). Account ownership and currency are checked server-side.
- `supabase/tests/bills_payments.test.sql`: RLS/privileges, month-end and leap-year dates, idempotent generation, no back-fill, estimate → actual, partial payment, retry with the same key (one expense), overpayment, currency mismatch, paid elsewhere (no debit), skip/cancel, and cross-user isolation. It passed against local Postgres 16 with all MOVO migrations applied; the migration was also re-applied without errors.
- `src/lib/bills.js` (+ tests): amount due/remaining in integer cents, occurrence state, monthly summary (due, estimated, paid, remaining, overdue), reminder timing, payment keys.
- `src/lib/billsRepository.js`: validated cloud calls.
- `src/components/BillsPanel.js` (+ tests): the **Bills** tab in Financial Planning, with summary cards, upcoming and overdue items, Pay (recorded / paid elsewhere, actual amount for estimates), Skip, add bill, and pause/resume.

## Not yet done

- The migration is **not applied** to the production Supabase project. Apply it in the SQL editor (or with the Supabase CLI), then run `supabase/tests/bills_payments.test.sql` in a test project.
- Reminder delivery (in-app/push at 7/3/1/0 days and overdue) is computed by `reminderFor` but not yet wired to notifications.
- Home dashboard cards (Bills due, Net worth, Debt, Owed to you): spec phase 6.
- Bills are cloud-only, like the rest of Financial Planning. Local mode shows the sign-in prompt.
- Attachments and editing of a bill's amount, frequency or account after creation are not included.
