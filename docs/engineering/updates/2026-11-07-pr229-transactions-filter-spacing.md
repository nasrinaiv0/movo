# PR #229 — Transactions filter spacing (2026-11-07)

## Problem and design intent
The transaction-type pills and billing selector inherited old negative margins and inconsistent 3-6px gaps. Sorting pills (Date, Amount, From/To, Account) inherited the shared chip row's -4px top / -8px bottom margins, which made the active chip touch the transaction list card. Screenshots show the Transactions view in dark appearance.

## Scoped implementation
- Keep transaction-type filter, billing-cycle selector and existing callbacks in one row with 8px normal gap (6px on narrow phones) and consistent 6px between type chips (4px narrow). Remove the row's negative left margin and align both controls to the screen's content inset. Keep 16px space under the type filter row.
- Wrap only Transactions sorting chips in .tx-sort-bar. Use a responsive 4-/3-column equal-width grid based on the already-defined number of valid sort options, 8px horizontal gap (6px at <=390px), and 16px lower separation from date grouping or transaction card.
- Preserve chip font color, selection pill, borderless control policy, 40-44px targets, i18n labels, and existing sort/toggle and billing selector functions. Avoid changing global Chips or other pages.
- Focused checks cover CSS selectors and mobile override, keyboard/aria-pressed and real click callbacks, and unchanged sorting and billing options. Confirm full Vercel Sandbox suite and production build, then GitHub exact-head CI before release.

## Safety
No changes to financial calculations, transaction storage, sorting algorithms, payment records, privacy/security behavior or other pages. Hosted iPhone preview remains a separate release gate.
