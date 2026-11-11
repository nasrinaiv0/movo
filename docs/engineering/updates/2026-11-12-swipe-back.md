# 2026-11-12 — Swipe back on iPhone and Android

## Purpose
Owner request: on iOS and Android phones, a swipe from the screen edge goes back to the previous page.

## What changed
- `src/lib/edgeSwipeBack.js` (iPhone app only): the iOS web view has no back swipe here, because MOVO keeps screens in
  app state. A touch that starts within 24 px of the left edge and moves right, or of the right edge and moves left,
  runs the same Back as the device button:
  1. Close the open sheet.
  2. Otherwise return to the previous screen.
  3. Otherwise go Home.
  The screen follows the finger with a soft edge shadow. Releasing past a third of the width, or a quick flick, goes
  back; anything less eases back without bounce. With reduced motion nothing slides, but the release still decides.
  Vertical scrolls, mid-screen drags (card stacks, chips) and text fields are left alone. While swiping, horizontal
  overflow is clipped so the page never widens: otherwise mobile browsers zoom out and move the fixed bottom nav.
- `src/lib/native.js` `listenForAndroidBack`: the Android back button and system back gesture call MOVO's Back
  directly (Capacitor `backButton`) instead of relying on web-view history. With nothing left to close (Home), the
  app moves to the background (`minimizeApp`, falling back to `exitApp`), as Android apps do.
- `src/App.js`: one `deviceBack` handler shared by browser Back (history), Android and the iPhone edge swipe;
  `lib/backNavigation.js` gains `hasBackLayer()`; `lib/platform.js` gains `nativePlatform()`.
- Browsers keep their own swipe (Safari, Chrome), which already arrives as history Back. The JS swipe is off there, so
  no gesture runs twice.

## Tests
- `npx tsc --noEmit`: clean. Jest: 203 suites / 1,234 tests passed. New:
  - `edgeSwipeBack.test.js` ×8: left and right edges, threshold, flick, ease-back, vertical scroll and mid-screen
    drag, no target and text fields, open sheet, reduced motion.
  - `androidBack.test.js` ×2.
  - `App.test.js` ×2: screens go back in order; an open sheet closes first.
- Strict build passed.
- Local browser (Chromium, 430×932 mobile emulation, touch events through Chrome DevTools Protocol, production build):
  - Left-edge swipe went Transactions → Wallet; right-edge swipe went Wallet → Home.
  - A short swipe eased back and left no offset.
  - A mid-screen drag and a vertical scroll from the edge did not go back.
  - The bottom nav stayed in place during the drag.
- Not run: a real iPhone or Android phone. The Android path needs the next Android build, the iPhone path the next iOS
  build.

## Data, security
No data, schema, API or permission change.

## Rollback
Revert the commit; browser Back and the Android web-view default return.
