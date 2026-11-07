# Transactions sort-filter edge-shadow correction — 2026-11-07

## Report and baseline
- Source: user iOS screenshot of Transactions sorting row (Date / Amount / Account) with dark theme and white selected option.
- Baseline: nasrinaiv0/movo main d31d73f.
- Defect: left/right soft gray bands on the selected filter are not intended shadows. A global horizontal-scroller mask paints gradients at the edges of every .chip-row, even though the Transactions sort row is a non-scrollable grid.

## Fix
- Only `.tx-sort-bar > .chip-row` overrides `-webkit-mask-image` and `mask-image` with `none`; the shared scrollable-chip fading elsewhere stays intact.
- Remove the sorting indicator's extra box shadow with the narrow selector `.tx-sort-bar > .chip-row > .chip-ind`.
- Preserve rounded backgrounds, the white/black selected state, chip spacing, sizes, translation animation, tap actions, aria labels and theme appearance.
- No financial/accounting code, backend operations, user records, permissions or environment values are changed.

## Tests and release gates
- Add `src/screens/TransactionSortEdgeShadow.test.js` covering scoped mask removal, indicator shadow removal, preserved three-option sort control and click/selection behavior.
- Required: Vercel Sandbox Jest/TypeScript/production build, browser-computed-style verification on the rendered sorting control in mobile light/dark appearances, and exact-head GitHub CI before merging.
- Independent open PRs #231 (accent text contrast) and #227 (native auth security) are untouched.
- Rollback: revert this CSS and test; no migration required.

## Verified results — Vercel Sandbox
- Sandbox: `movo-transaction-sort-no-edge-shadows-20261107` (isolated from production and other PRs).
- `npm ci`: completed.
- Focused Jest: 18 tests passing across 4 suites (sort edge regression, layout, Transactions, borderless buttons).
- Full `CI=true npm run build`: 694 tests passing / 124 suites; TypeScript typecheck passed; optimized CRA build compiled successfully.
- Headless Chromium at 390px mobile width loaded the built MOVO app. A screenshot-representative Transactions sort control was rendered using MOVO's real production CSS. In both light and dark appearance, computed `mask-image`, `-webkit-mask-image` and `box-shadow` were all `none`; three equal-width options and 44px active button were verified. No authenticated user data was accessed.
- GitHub exact-commit CI and any production deployment remain separate merge gates.

## Follow-up: standardize filter controls to exactly 40px (2026-11-07)
- Requested: make every Transactions and Wallet filter control 40px high.
- Changes: Transactions type chips (42 to 40), billing cycle selector (42 to 40), Transactions Date/Amount/etc sort chips (44 to 40), Wallet account type chips (38 to 40), plus Wallet Sort & View option controls (40 with explicit min/max) and corresponding Wallet filter-side action (40).
- Applies to all light/dark accents and narrow mobile widths. Native select remains full-size within its 40px parent; the gliding `chip-ind` copies the actual chip dimensions via the existing ResizeObserver.
- Existing edge-fade mask removal and indicator shadow removal from this PR remain intact. Header buttons, cards, finance/accounting/storage/auth and data services are untouched.
- Regression: `src/screens/TransactionWalletFilterHeight.test.js`, updated prior spacing and edge-shadow expectations, and real Chromium computed-style checks. Retain 40px as requested while preserving focus-visible states, keyboard activation, aria labels and touch interactions.
- Same-commit docs and regression tests are required; do not merge until exact-head CI passes.
- Completed Sandbox verification for follow-up: 704/704 Jest tests in 125 suites, TypeScript check and optimized CRA build passed. Chromium loaded the actual built MOVO app and checked representative filters in light and dark appearances at 320px, 390px and 430px mobile widths: 36 exact rendered/computed height checks per width, all passed. The initial browser regression exposed a legacy 44px Wallet override, corrected before this final successful run.
