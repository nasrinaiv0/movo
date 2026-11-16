# 2026-11-12 — Android bottom navigation: instant response, lighter animation

## Report (owner)
"In Android app, MOVO bottom nav icon animations are not optimized and responding properly."

## Measured (Playwright, mobile Chromium, touch, CPU throttled 4x as a budget-phone stand-in; times from touch-down)
| | Bar shows the tapped tab | New screen |
|---|---|---|
| Before (main 2b9a1cf) | 90-221 ms (only once the new screen had rendered) | 90-221 ms |
| After | 11-23 ms | about the same as before (average 211 vs 184 ms) |

Causes:
1. The tapped tab became active only after React rendered the whole new screen (Home and Wallet are heavy), so the
   bar froze and then jumped.
2. The bar's glass used a 24 px blur with 2x saturation, re-drawn under the moving highlight. Android WebViews are
   slow at large backdrop blurs, and 12 blurred elements were on screen.
3. The bar had its own transform transition, and the highlight also transitioned its width (layout).

## Fix
- `src/App.js`:
  - On touch-down (`pressNav`) the highlight moves and the tapped tab gets `nav-active` directly on the DOM, with no
    React render. On tap (`goTab`) the screen change waits for that state to be painted
    (`requestAnimationFrame` → `setTimeout`), then renders in one pass. A concurrent `startTransition` was tried and
    measured: the bar was equally fast, but screens appeared about 100 ms later, so it was not kept.
  - `syncNavToView` puts the bar (tab and highlight) back in step after every screen change, and when a touch is
    cancelled (finger slides off to scroll).
  - Each tab renders its outline and its filled icon; CSS shows the right one, so the icon fills at once.
  - Tests and reduced motion switch screens at once (`canAnimate()`).
  - The root gets `platform-android` in the Android app.
- `src/App.css` (appended block):
  - the bar keeps its glass look with a 12 px blur and no saturation boost in the Android app;
  - the bar has no transform transition, and `contain: layout style`;
  - the highlight transitions only `transform` and `opacity`;
  - the highlight and icons are their own compositor layers (`will-change: transform`), so they keep moving while a
    screen renders.

## Validation
- `App.test.js`:
  - touch-down marks the tab active and moves the highlight before any click;
  - a cancelled touch restores Home and the highlight;
  - a tap opens the screen with the bar in step;
  - each tab has both icons.
- Jest 224 suites / 1,350 tests, `tsc --noEmit`, strict build.
- Browser, light and dark: one icon visible per tab, the filled one on the active tab, plan-colour fill unchanged.
- Not run: a real Android phone. The numbers above come from a throttled desktop Chromium in mobile emulation.

## Rollback
Revert the commit.
