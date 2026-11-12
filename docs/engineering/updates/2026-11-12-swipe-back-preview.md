# 2026-11-12 — Blurred previous-page preview during swipe back (iPhone app)

## Purpose
Owner request (with a screenshot of the bare dark area behind the swiped screen): while sliding left to right, show
a blurred preview of the previous page with shadows.

## What changed
- `src/lib/edgeSwipeBack.js`: while the screen follows the finger, the previous page shows underneath.
  - It is blurred (6 px), dimmed (50% black shade) and parallaxed (30% of the width behind). As the swipe goes on it
    slides in and clears. The sliding screen keeps its soft edge shadow.
  - On release past the threshold, the screen finishes sliding out (220 ms) while the preview becomes fully clear.
    Back then runs, and the preview stays until the real page has been drawn (two frames), so nothing flashes.
  - A cancelled swipe slides the preview back out.
  - No preview with a sheet open or with reduced motion.
- `src/App.js`: when a page is left (iPhone app only), a static DOM copy of it is kept, with the scroll position:
  up to six pages, cleared when the gesture stops.
  - The copy runs no app code, has no handlers, and is `aria-hidden` and `inert`.
  - After a swipe back, the page opens without an entrance animation (`enter-swipe`), at the scroll position it was
    left at, set before the first paint.
- `src/lib/backNavigation.js`: `trail.peek()`. `src/App.css`: preview layer, shade, and a solid screen background
  while swiping.

## Tests
- Jest: 203 suites / 1,237 tests passed. `edgeSwipeBack.test.js` now has 11 tests, including:
  - The layer sits under the screen, with the blur, shade and parallax easing as the swipe progresses.
  - After release the preview is fully clear; it is removed after commit and after cancel.
  - No preview with a sheet or with reduced motion.
- tsc clean; strict build passed.
- Browser (Chromium mobile emulation, CDP touch events, production build):
  - Mid-swipe screenshots show the blurred Wallet page behind Transactions.
  - A per-frame log through the release (Transactions → Wallet at scroll 520, Menu → Home at scroll 300) found
    0 frames where the old screen reappeared or the page was at the wrong scroll.
- Not run: a real iPhone. The canvas mascot on Home is blank in the copy (canvases do not clone); it is under the
  blur.

## Data, security
No data, API or permission change. Copies are in-memory DOM only and never stored.

## Rollback
Revert the commit; the swipe works as before, over the plain background.
