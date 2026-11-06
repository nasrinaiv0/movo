# Button border removal — MOVO full-app policy (2026-11-07)

## Scope
Applies to every interactive button, tab, switch, clickable row, text-button and
button-style link inside MOVO, across Home, Wallet, Transactions/Search,
Subscriptions (Upcoming/Calendar/Insights), Financial Planning/Budgets & Plans,
Cashback, Settings, Profile, Help, and all sheets/dialogs in light and dark modes.

## Root cause
Earlier cosmetic patches set CSS `border: 0`, but a global universal `*`
`border-width: var(--hair) !important` rule repainted 1px borders on
buttons even after later overrides. Shared pseudo-elements and per-screen
inset shadows also reintroduced outlines.

## Fix
The global structural hairline selector now explicitly excludes interactive
controls (including their pseudo-elements), while preserving hairlines on
cards, panels, and other containers. The final high-specificity control policy (browser-tested against legacy `!important`
rules) removes CSS borders
from interactive controls and faux borders from their pseudo-elements. It also
neutralizes control shadows and resting outlines that otherwise still render as hairline borders.
Panel, sheet, grouped-control parent, calendar parent, input and card borders
remain untouched. Keyboard focus-visible outlines stay accessible. No finance,
transaction, database or authentication logic is modified.

## Verification
- Run `CI=true npm test -- --runInBand`.
- Run `npm run typecheck` and `CI=true npm run build`.
- Inspect computed styles of button and ::after on both appearances; specifically
  search results, subscription segmented tabs/calendar and rows,
  Budgets/Plans tabs, Cashback action, header and bottom navigation buttons.
- Check adjacent card/panel borders and keyboard focus before approving.

## Rollback
Revert the final “MOVO borderless control policy” block in `src/App.css`.
