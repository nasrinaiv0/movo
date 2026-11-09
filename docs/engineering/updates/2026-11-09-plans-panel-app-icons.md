# 2026-11-09 — One-panel plans offer, tier logos and badge app icons

## Owner request

"Use this reference for MOVO subscription. make it more compact that fits to one panel. Make sure to use the Gold and
platinum logo of movo for pro and pro+, green for free and white for free trials. If the user subscribed to the plans
they can use the badges as icons for App … For pro and pro+ they don't need to wait the days instead they can unlock it
after payment."

## What changed

- **Plans panel (`PlanOffer`).** One dark panel that fits without scrolling at 430×932 and 375×667: MOVO header,
  Monthly/Annual switch, three tiles — Free (green MOVO), Pro (gold MOVO), Pro+ (platinum MOVO) — with arrows
  and dots, the price, the plan's features, one action button and the fine print. Prices come only from the App Store
  or Google Play product (`priceString`), with the other period and its saving; without a store product the panel says
  the store shows the price. Nothing is invented.
- **Free month.** A first-time account sees the white MOVO mark, "1 month free · no payment, no automatic charge" and
  "The free month ends on its own; nothing renews." (no auto-renew line, since nothing renews).
- **Plan badge (`PlanBadge`).** Pro → Gold MOVO tile, Pro+ → Platinum, free month → white, Free → none.
- **App icons (Settings → Appearance → App icon).** MOVO, Bronze, Silver, Gold, Platinum. Subscribers use a badge icon
  once it is unlocked: Pro unlocks Bronze to Gold right after payment, Pro+ all four including Platinum; the streak can
  still unlock them by days. Without a plan only the MOVO icon is available, and a chosen icon falls back to MOVO when
  the plan ends. iOS switches the home-screen icon (`setAlternateIconName`, four 1024px alternate icon sets); the web
  keeps the choice for the app.
- Small-phone spacing step (`max-height: 700px`), the Platinum chip no longer clips at 375px, and the fine-print links
  stay readable on the dark panel.

## Tests

`PlanOffer.test.js` (tiles and colours, free month and its fine print, store price and purchase with the saving,
current plan and Terms), `PlanBadge.test.js`, `appIcons.test.js`, `AppIconPicker.test.js`, `AppOfflineFirst.test.js`.

## To verify on device

The iOS alternate icons need an iOS build (`build-ios`) and a check on a phone; the switch is a no-op on the web.

## Follow-up (owner, 2026-11-09)

The "Gold MOVO" and "Platinum MOVO" labels were removed from the Pro and Pro+ tiles; the mark's colour carries the
tier. The tiles are re-centred without them and the panel still fits 375×667 (`PlanOffer.test.js` checks no label).
