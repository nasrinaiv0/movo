# MOVO Wallet and Transactions UI polish — November 6, 2026

## Scope
- Wallet: replace only the header's sort/view glyph with the supplied thick edit-square/pencil reference. Accessible label and existing sheet action remain unchanged.
- Transactions: replace only the header's quick-actions glyph with the supplied curved share-arrow/open-square reference. Existing quick-action sheet, header spacing, and Plus button remain unchanged.
- Transactions: reduce the Total Spent card from 162px to 136px (140px on narrow screens), while keeping its chart to the right of the amount.
- Push the comparison pill (including **No previous cycle**) to the bottom of the left column, aligned to the month-label row under the billing-cycle chart. Keep the existing finance calculation, privacy handling, adaptive colors and reduced-motion support.

## UI constraints and regression checklist
- Both icons use SVG `currentColor` so MOVO's accent and light/dark themes determine the ink. No hard-coded black disc or white strokes.
- Preserve all three original header callbacks and accessible labels.
- Total Spent amount continues to show cents; this change does not touch money/ledger calculations.
- Check mobile widths <=360px, larger screens, no-history comparison, positive/negative trend, balance-hidden state and accent themes.
- Verify `npm run typecheck`, focused component tests, full test suite and production build inside Vercel Sandbox prior to merging.

## Files
`src/components/Icon.js`, `src/screens/Wallet.js`, `src/screens/Transactions.js`, `src/App.css`, `src/components/HeaderActions.test.js`, and this document.


## Billing-cycle accuracy extension
- Summary and Bills list use `currentCycleBillOccurrences`: include unpaid overdue due dates and at most one current upcoming due per bill, excluding every subsequent upcoming due date (even in the same month, e.g. weekly bills).
- Summary uses integer cents after currency conversion, with a separate `totalDue` for overdue + current; an overdue occurrence within this month is included once, never once as overdue and again as current.
- Deduplicate repeated occurrences by `bill_id + due_date` (not merchant or amount: different bills can share amounts or names).
- Keep future occurrences stored by the server for scheduling/reminders; this only changes Bills Due and Financial Planning presentation/totals. Do not skip, cancel or delete ledger entries as a way to hide future dues.
- Finance planning's Bills tile displays the combined `totalDue` and a matching label, while the detailed card retains `Due this month` and `Overdue` as separate analytical views.
- Automated tests cover overdue + current, paid, cancelled, repeated rows, multiple bills, weekly recurrence and exact cents.

- New billing labels are included in the i18n catalog with translations for all supported languages; run `npm run i18n` whenever the catalogue changes.

## Mascot speech-bubble text border follow-up
- Exempt the Home mascot speech-bubble's `Change mascot` text link from the legacy global 0.25px button hairline (a header descendant retained that border despite the general borderless-button rule).
- Preserve the text-link styling, accent-color adaptation, the existing click handler, and visible keyboard focus. No changes to the bubble card or to header action button borders.
- Regression coverage added to `RamMascot.test.js` in addition to existing mascot interaction tests.


## Empty-record visuals across MOVO
- The empty-only `card list-card` wrapper previously produced a thin filled capsule for scheduled payments, overdue obligations, reminder activity, manual/estimated cashback, and other record lists.
- Style only cards with a **single empty-state paragraph**, or a categories list with no `li` items, as transparent text (no card border, shadow, backdrop or 0.25px pseudo-element hairline). Hide a truly empty list-card.
- Uses `:has(> … :only-child)` and `ul:empty` guards; actual populated cards, headings, actionable add prompts, statistical summaries, and sheet/form notices are deliberately untouched.
- Maintains empty messages and translations in place. Works with adaptive dark/light themes and the existing padding system; text remains visible and left-aligned.
- Regression check: empty Schedule sections (list mode, obligations, reminders), empty Wallet recent/card transactions, Cashback lists, Bills, and subscription categories render without horizontal capsules. Populated lists retain the original cards.
