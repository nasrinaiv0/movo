# Total balance fixes and a complete backup for moving MOVO to another device — 2026-11-09

## Total balance (`src/lib/totalBalance.js`, used by Home, Wallet and Profile)
Bugs fixed:
- **Card payments created money.** A credit-card payment recorded without a transaction (Financial planning →
  Record payment, and the due-date prompt) lowered what the card owes but took nothing from any account, so the total
  rose by every payment. The total now leaves such payments out, and the payment form has **Paid from**
  (defaulting to the card's bank): the payment is then saved as a real transfer account → card, so both sides move.
- **Archived accounts were still counted**, unlike Wallet's per-type totals and Savings. They are excluded now.
- **One account without an exchange rate made the total NaN.** It is left out and the card says
  "Excludes N account(s) without an exchange rate."
- **The month filter on the balance card did nothing to the balance.** A past month now shows the total at the end
  of that month (today's total with later income/expenses undone; transfers stay inside). The sparkline only
  moves on income and expenses (allocations no longer count as spending).
- **Month-over-month compared this month so far with all of last month** (Home's reference date was the month's last
  day). The current month now compares 1st–today with the same days last month; a past month compares whole months,
  undoing only what happened up to that month's end.

## Backup and CSV export / restore
Goal: export everything shown in Home, Wallet, Transactions and Menu and restore it on another device from the file.
- **Export** (`lib/financeBackup.js`): always includes this device's preferences (subscriptions, plans and their
  funding, budgets, spending limits, card looks, bank links, card payments and credit logs, loyalty cards, cashback,
  archive, watchlists, layouts, profile, streak) without the automation key, device list or pending flags; the
  person's own transaction rows (original amount, currency and category id) instead of the screen's converted copies;
  never cloud accounting activity. An unreadable receipt/QR is counted (`missingAttachments`) instead of cancelling.
- **Restore**: accounts and transactions as before, plus (`lib/backupPreferences.js`) every preference group above,
  merged by id; account links (account_id, accountId, issuerBankId, linkedBankId, ...) re-pointed through the
  account id map from the account restore, links to accounts not restored are cleared; per-account maps keep this
  device's own entries; personal settings only fill defaults; photos must be real image data. Receipts, QR codes,
  the scenery photo and custom stickers come back from the attachments. Preferences are applied only after the
  records were saved. Backup restore also keeps each record's own category (income no longer becomes "Income"),
  notes, payment reference and receipt, and skips accounting activity (it used to be replayed as an expense).
- **CSV**: adds exact time, Category ID, To Account, Note and Payment Reference, so transfers and categories survive a
  re-import (the old file lost every transfer's destination). The importer reads Category ID and keeps income
  categories. Accounting activity is left out.

## Verification
- Unit: totalBalance (open accounts, linked cards, card payments, archived, missing rate, month end, past-month delta),
  backupPreferences (merge, remap, non-overwrite, secrets, images, streak, QR), backup export (preference groups,
  raw rows, accounting skipped, unreadable attachment), restore (id map, categories, references, accounting skipped),
  CSV round trip, Financial planning "Paid from".
- App: a backup with subscriptions, plans, limits, card styles and payments restores on a fresh device with every
  link pointing at the new accounts; secrets not restored; accounting rows skipped (mutation-checked).
- Full Jest 166 suites / 1008 tests, `tsc --noEmit`, strict build (exit 0).

## Limits
- Bills, loans, receivables and other cloud-only tables remain preview-only in a restore.
- Account opening balances come from the backup; a restore on a device that already has the same account keeps the
  existing account (no duplicate) and only adds what is new.
- The total for a past month uses today's accounts (an account added later is included from its opening balance).
