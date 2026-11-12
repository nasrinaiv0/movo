# 2026-11-12 — Faster buttons and pop-ups on phones

## Purpose
Owner report from Android and iPhone testing: some animations are delayed and buttons and pop-ups feel unresponsive.

## Measured before
Production build, Chromium, CPU slowed 4× to approximate a mid-range Android phone, three runs each:
- Sheets and dialogs took **355–645 ms** to finish appearing, because their content arrived in a stagger.
- Home kept the main thread busy all the time:
  - the 3D mascot drew every frame, now that the pinned header keeps it on screen: 25 fps;
  - a glow header's drifting light repainted every frame: 15 fps, 2.1 s of main-thread work per 3 s.
- Switching tab blocked for 170–200 ms before the nav moved.

## What changed
- `src/lib/interaction.js` (new): passive touch, pointer, key and scroll tracking (`isInteracting`) and `modalOpen`.
  It is installed once at start-up in `src/index.tsx`. The passive touchstart listener also lets iOS Safari show
  `:active` immediately.
- `src/lib/ramScene.js`: the mascot draws at most 30 times a second. It skips drawing while the person is touching
  or scrolling (about 0.7 s after a touch, 0.25 s after scrolling) and while a sheet or dialog is open, so it never
  competes with taps, scrolling or pop-ups.
- `src/App.js`: tapping a tab starts the nav highlight sliding on touch-down, before the new screen renders.
- `src/App.css` ("Responsiveness on phones"):
  - Press states are instant.
  - Sheets enter in 200 ms with their content in place: no stagger, 160 ms rows.
  - The backdrop fades in 160 ms and dialogs in 180 ms.
  - Premium header glows are still instead of drifting.

## Measured after
Same method:
- Sheets and dialogs finish in **260–340 ms**.
- The Home period sheet has **no long tasks** while open (dozens before).
- With a glow header, Home's main-thread work fell from 2.1 s to **0.3 s** per 3 s.
- Without the mascot Home runs at 60 fps. The mascot itself is still costly in this software-GL test; phones draw it
  on the GPU.
- Switching tab still spends about 165 ms (at 4×) building the Wallet screen. The nav now reacts immediately; making
  Wallet cheaper to render is a possible follow-up.

## Tests
- Jest: 207 suites / 1,252 tests passed. New: `interaction.test.js`.
- tsc clean; strict build passed.
- Not run: real Android and iPhone devices. Please confirm the feel on both.

## Rollback
Revert the commit.
