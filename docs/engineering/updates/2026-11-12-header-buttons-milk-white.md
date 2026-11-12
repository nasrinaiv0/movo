# 2026-11-12 — Plain header buttons and an off-white light background

## Purpose
Owner request: remove the borders around the top header buttons on iOS and Android and reduce the gap between the
icons; no background on header buttons except the Plus buttons; in light mode with no scenery, an off-white (milk
white) screen background.

## What changed
- `src/App.css` (final block "Top header buttons"):
  - The utility icon group (Home, Wallet, Transactions, Menu and other root headers) and the back button have no
    capsule, border, ring, blur or fill.
  - Icons sit 40 px apart instead of about 45–49 px, with 44 px tall touch areas and a 6 px gap before the Plus.
  - Pressed icons dim; keyboard focus keeps an accent outline.
  - Only the Plus / add buttons (`.header-add-action`, `.accent`) keep their filled circle.
- Light mode with no scenery and no colour tint: `--bg` and the page background are `#faf9f6`, previously cool grey
  `#f3f3f7`. Tinted themes, dark mode and scenery are unchanged.
- iPhone app (`ios/App/App/GlassChrome.swift`): the native top bar's back button and action group lose their glass
  capsules (transparent containers; the soft blur behind the bar stays for legibility). The Plus action is drawn as a
  filled circle in the accent colour with a white icon. `lib/nativeChrome.js` now marks that action `primary`.
- `capacitor.config.json`: the iOS web view background is `#faf9f6`, matching the light page.
- Android uses the web header, so the CSS covers it.

## Tests
- Jest: 204 suites / 1,240 tests passed. New: `nativeChrome.test.js` checks the Plus is primary and other icons are
  plain.
- tsc clean; strict build passed.
- Screenshots of Home, Wallet, Transactions, Menu and Settings headers in light and dark (production build, 430 px):
  - no capsules or borders;
  - icons measured 40 px apart on Home and Menu;
  - the Plus is still filled;
  - light background `rgb(250, 249, 246)`.
- Not run: the iOS build of the native top bar (CI `build-ios` compiles it) and real phones.

## Data, security
None.

## Rollback
Revert the commit.
