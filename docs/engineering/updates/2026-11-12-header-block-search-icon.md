# 2026-11-12 — Pinned header down to Total balance, new search icon, equal header spacing

## Purpose
Owner requests:
- change the search icon to a bigger circle with a shorter handle;
- extend the pinned header down to the bottom of the Total balance box;
- give the header buttons equal padding from the top on Home, Wallet, Transactions and Menu.

## What changed
- `src/components/Icon.js` `search`: lens radius 6.6 → 7.4 and handle about 6.5 → 4.8 units. It is used everywhere
  search appears.
- `src/screens/Home.js`: when the Home header has a background and Total balance is the first visible box (not
  while customizing), both are drawn inside one pinned block (`.home-hero-block`). The background, rounded bottom
  corners and stickiness move to the block, so it stays at the top as you scroll.
  - With another box first, or the background set to None, the header stands alone as before.
  - `EditableBoxes` gained `skip` so Total balance is not drawn twice.
- `src/App.css`:
  - Header button rows align to the top, so the 45 px Plus no longer pushes the 44 px icons 0.5 px down.
  - Home's icon group aligns to the top of its header instead of centring against the mascot.
  - The background's top padding matches the other pages.
  - Measured button top: **28 px on Home, Wallet, Transactions and Menu**, with or without a background and in
    either box order (was Home 44, Wallet/Transactions 28.5, Menu 28).

## Tests
- Jest: 206 suites / 1,249 tests passed. New and updated:
  - the block contains the header and the one Total balance card;
  - with another box first, the header stands alone;
  - with None, the header is plain.
- tsc clean; strict build passed.
- Browser (production build, 430 px):
  - measured button tops for all four pages and for the Home variants;
  - screenshots of the block at the top and scrolled (pinned at top 0, card bottom 260 px, block bottom 288 px).
- Not run: real phones.

## Notes
- Holding Total balance to start Customize does not work while it is inside the pinned block; the Customize Home
  button still works.
- The pinned block takes about 290 px of a 932 px screen (more on phones with a tall status bar).

## Rollback
Revert the commit.
