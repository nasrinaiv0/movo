# 2026-11-12 — Video guide shown in a phone frame

## Purpose
Owner request, with a reference image of the app on a phone mockup: lay out the tutorial video like the reference,
inside an iPhone 18 Pro Max-style frame.

## What changed
- `src/components/TutorialVideo.js`: the player is now a light stage.
  - Progress bars, the counter and the sound, pause and Skip controls sit on top.
  - The recording plays on a phone screen in the middle.
  - The translated chapter caption and the Next or Continue button sit below the phone.
  - Tap-to-skip zones and hold-to-pause cover the phone area.
- `src/App.css` ("Tutorial video in a phone frame"): the frame is drawn in CSS, so it stays sharp at any size and
  adds no image files.
  - A slim dark metal bezel with a rim highlight and side buttons (action and volume left, side button right).
  - A dynamic-island cut-out and a status bar (9:41, signal, Wi-Fi, battery) in the recording's background colour.
  - A home indicator and a soft drop shadow.
  - Sizes follow the stage height with container query units, with fallbacks for older engines. The calc()s do not
    mix var() with cq units.
  - The 9:20 phone gives a screen, below the status bar, that matches the 720×1560 recording, so nothing is cropped.
- The frame is a generic modern phone: no Apple logo, model name or trademarked artwork.
- The animated fallback scenes (no video) are unchanged.

## Tests
- Jest: 206 suites / 1,250 tests passed. New: the video sits in `.tv-device > .tv-screen` with a status bar, island and
  home indicator, and the caption is outside the phone.
- tsc clean; strict build passed.
- Browser (production build, VP9 copy of the recording, because Chromium lacks H.264), at 390×844, 430×932 and a
  1280×800 desktop window:
  - the phone measured 273×606 and 312×694;
  - the whole recording, including the app's bottom nav, is visible;
  - the caption and button fit below.
- Not run: real phones.

## Rollback
Revert the commit.
