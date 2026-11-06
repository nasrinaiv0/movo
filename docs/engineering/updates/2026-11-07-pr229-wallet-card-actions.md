# MOVO PR #229 — Compact Wallet card action strip

Date: 2026-11-07

## Request
The four-action bar beneath the selected card in Wallet has excessive top/bottom spacing and icons that look too small. The user provided a dark-theme screenshot showing View Details, Add amount, Limits and More.

## Implementation
- Reduce only the Wallet card action strip's top and bottom padding from 14px to 8px. Preserve its current horizontal padding, four equal grid columns, shape, card structure, appearance colors, and 12px separation from the next component.
- Increase the four action SVG icon sizes from 20px to 26px by changing the single shared render call in Wallet.js; preserve icon names, currentColor and all four action handlers.
- Tighten the gap from icon to label 7px to 5px. Keep the original 11px label font and each button's minimum 44px tap area, keyboard focus, button border-removal policy, and accessible labels.
- The change only applies to the Wallet card action strip, not headers, Transactions filters, Wallet account rows, or finance/credit/ledger calculations.

## Verification
- New src/screens/WalletCardActionSpacing.test.js validates the CSS grid and padding, 26px rendered SVG dimensions, complete action wiring, borderlessness and minimum button hit targets.
- Run focused and full test suites, typecheck and production build in Vercel Sandbox, and exact-commit GitHub CI.
- Live mobile screenshot review is outstanding if Vercel cancels hosted previews due the project's ignored build step.
