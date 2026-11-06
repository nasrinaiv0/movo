# MOVO grouped header buttons — zero padding (2026-11-07)

## Request and scope
Remove **all four sides** of padding from each grouped header utility capsule and each action button inside it, across MOVO screens. The attached reference shows the combined Search, Notifications and Settings pill. Keep the existing appearance, button dimensions, icon dimensions, accessible controls, and separate Plus action intact.

## Code changes
- `src/App.css`: shared `.header-utility-group` and `.home-utility-pill` capsule padding changed **5px → 0**.
- Shared capsule minimum height changed **57px → 45px** so removing the padding actually removes the empty top and bottom space. Existing 1px decorative container border remains.
- Preserve **45×45px** button touch targets, **22×22px** glyphs, and **4px** icon-cell gap, with no change to header page padding or other button groups.
- Override the existing global **0.5px** header-action padding rule for **grouped** controls only, since it uses `!important` and higher selector specificity; standalone action padding is unchanged.
- `src/components/HeaderButtonSpacing.test.js`: updated zero-inset expectations and added a regression asserting the grouped-button override follows the global header control rule.

## Validation
Vercel Sandbox: `movo-header-group-zero-padding-20261107`, based on `main` at `db5420fa239c85230658a57d00bb1dbc18d65e29`. Test results should be recorded in the PR description after execution.

## Release safety
This change is CSS-only and has no intended effect on balances, transactions, authentication, privacy, RLS, or purchase validation. It does **not** constitute a security release. Security PR #227 remains a separate draft and must not be merged as part of this change.

## 2026-11-07 follow-up — remove backgrounds of every header Back button
- `src/App.css`: force transparent backgrounds on `.screen-header .back-button` in all interaction states and clear residual shadows/pseudo-element fills. Shared `RootHeader` and `SubHeader` serve root screens, sub-screens, Cashback and Scheduled.
- No changes to button geometry, navigation handlers, icon accent color, plus actions or utility group capsules.
- Restore a visible `:focus-visible` outline for keyboard accessibility independently from fill.
- `src/components/HeaderButtonSpacing.test.js` checks the background-free CSS contract.
- Changes verified in Vercel Sandbox: 13 focused tests passed, 692 tests / 123 suites passed, typecheck passed, production build compiled, and Chromium browser checks passed at 375px light, 320px dark and 1024px light. For both root and subheader Back buttons, computed background is transparent across idle/hover/focus, shadow is none, the hit target is 45x45px, and click handlers work. GitHub CI status belongs in the PR.
