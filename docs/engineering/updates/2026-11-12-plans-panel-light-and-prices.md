# 2026-11-12 — Plans panel: follows light/dark mode; amounts on every plan

## Request
"Improve the color adaptability of this section in light/dark mode. Make it more organized with amounts." The "Upgrade MOVO" panel was always black, and no tier showed a price ("Price shown by the App Store or Google Play").

## Constraint kept
Prices come only from the App Store or Google Play (`docs/commercial/STORE_BILLING_SETUP.md`: "must not be hardcoded"). The stores set localized and regional prices, and showing any other number would mislead.

## Change
- `src/components/PlanOffer.js`:
  - **Tile amounts:**
    - Free: `money(0, currency)` (₱0 in the home currency; `App.js` passes `currency={base}`).
    - Pro and Pro+ in the apps: the store `priceString` for the chosen period with "/mo" or "/yr".
    - Without a store (the website): "Price in app".
  - **Current badge:** "Current" or "Free month" is now a badge on the tile's top edge.
  - **Annual saving:** the Annual button shows the best saving computed from the store prices, for example "−17%".
  - **Large price block:** only when there is a store price or the free-month offer. Free and web paid tiles no longer repeat it.
- `src/App.css`, block "Plans panel: amounts on every tier and light/dark adaptability":
  - **Light palette** (any theme other than dark): `--pp-*` tokens for ink, muted, line, tile and background; an off-white `#faf9f6` panel and sticky footer; a white period selector; light tints and outlines on the selected tiles; darker gold and platinum check marks; Free and Pro+ action colours suited to a light background.
  - **Dark mode** is unchanged.
  - The panel height is now `auto` (capped at 94dvh) instead of a fixed `min(800px, 94dvh)`.
- `src/i18n/catalog/ui-2026-11-12-plan-prices.js`: "Price in app", "mo" and "yr" in 11 languages.

## Validation
- `PlanOffer.test.js`:
  - web tiles show "CurrentFree₱0", "ProPrice in app" and "Pro+Price in app", with no invented amount and no large price block;
  - in the app, the Pro+ tile shows ₱349.00/mo, then ₱3,490.00/yr after switching to Annual, and Annual shows −17%;
  - the purchase still buys the selected period.
- Jest: 219 suites / 1,320 tests pass. The strict build compiled.
- Browser screenshots (Playwright, production build against the local mock cloud) in light and dark, as a Free account on the website.
- Not run: real store prices on devices. Those depend on App Store Connect and Play Console products.

## Rollback
Revert the commit.
