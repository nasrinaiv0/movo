# 2026-11-12 — Account pickers: icon and amount only for the available balance

## Request
In the transfer sheet, remove the "Available balance" text and show only the wallet icon and the available balance. In the owner's screenshot the text pushed the amount into "₱1…".

## Change
- `src/components/AccountPicker.js`: the "Available balance" and "Available credit" words are now `sr-only`. Sighted people see the icon (wallet, or card for credit) and the amount; screen readers still announce the label. This picker is shared by From, To and Paid with, so all of them change.
- `src/App.css`:
  - The amount follows the icon directly and is no longer pushed right; it is 12px (11.5px in the two-column layout).
  - Below 400px wide, the two side-by-side pickers use a 24px logo, 5px gaps and a 14px chevron, so the full amount fits.

## Validation
- `AccountPicker.test.js`: the amount and accessible label are still present, and the label is screen-reader-only.
- Jest (full suite) and the strict build pass.
- Browser (Playwright, production build against the local mock cloud): the transfer sheet at 430, 390, 375 and 360px shows ₱123,152.00 and ₱15,800.00 in full (no overflow).
- Not run: real devices.

## Rollback
Revert the commit.
