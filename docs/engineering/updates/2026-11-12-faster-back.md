# 2026-11-12 — Back shows the previous page faster

## Purpose
Owner request: optimise going back to the previous page so its content shows faster.

## Measured before
Production build, Chromium mobile emulation, device Back (history pop), three runs each. Each page took
**490–1,090 ms** to settle after Back:
- Its entrance animations replayed: sections staggered up to 495 ms, and transaction rows, groups, legends and bars
  had their own 0.4–0.8 s animations with delays.
- Every amount counted up from ₱0.00.
- The page always opened at the top.

## What changed
- `src/App.js` `go()`: a move back is detected: device Back, the swipe, or an on-screen back arrow to the previous
  screen in the trail. A back move:
  - uses `enter-back` (no entrance motion);
  - calls `showInstantly()` so amounts that appear start at their value;
  - restores the page's saved scroll position. The positions of the last 20 pages are remembered.
- A layout effect runs after a back move, before the first paint. It finishes every one-off animation inside the
  page with the Web Animations API (`getAnimations({ subtree: true })`, skipping infinite ones such as spinners) and
  restores the scroll. It runs once more on the next frame for content that mounts a frame later.
- `src/lib/motion.js`: `showInstantly(ms)` / `isInstant()`; `useCountUp` starts at the value during that window.
- Forward navigation is unchanged and still plays its entrance.

## Measured after
Same method, counting entrance animations and text changes:
- Wallet → Home: 86–120 ms
- Transactions → Wallet: 36–49 ms
- Menu → Transactions: 20–25 ms

Each page opened at its previous scroll position. What still moves afterwards is cosmetic: the balance card's
scroll-linked size transition, and on Home the mascot fading from its picture to the live 3D model once that loads.

## Tests
- Jest: 204 suites / 1,239 tests passed. New: `App.test.js` (Back uses `enter-back` and restores 420 px; forward
  keeps its entrance) and `motion.test.js`.
- tsc clean; strict build passed.
- Not run: real phones.

## Data, security
None.

## Rollback
Revert the commit.
