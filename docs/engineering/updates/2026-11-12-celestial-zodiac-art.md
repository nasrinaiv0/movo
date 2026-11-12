# 2026-11-12 — Zodiac headers in the style of the owner's reference (kept subtle)

## Purpose
The owner shared a reference ("like this but not too much"): a green night sky, a golden zodiac wheel, sparkling
stars, rolling hills with a golden rim and a glowing balance card.

## What changed
- `src/lib/homeHero.js` `zodiacSvg`: redrawn at 860×600 for the pinned block.
  - A seeded starfield and a faint Milky Way band.
  - A thin golden zodiac wheel (two rings, 36 ticks, 12 markers, faint spokes) right of the greeting, with the sign's
    constellation inside it.
  - A few four-point sparkles, and low hills with a golden rim of light, visible between the greeting and the
    balance card.
  - The wheel has no zodiac glyphs: phones may draw those characters as emoji or missing boxes.
  - Element tints are unchanged (fire, earth, air, water); the art anchors to the top, so the header alone shows
    the wheel.
- New glow **Celestial**: the same night sky in MOVO green and gold with a single star in the wheel, the closest to
  the reference. It is first in Glow.
- Premium headers give the balance card a soft glow that follows its notched shape (`drop-shadow`).
- i18n: "Celestial" in 11 languages.

## Tests
- Jest: all suites pass. `homeHero.test.js` counts the wheel lines, and checks the celestial art (data-URI SVG with
  no script or links).
- tsc clean; strict build passed.
- Browser screenshots: Celestial, Aries (fire), Taurus (earth), Aquarius (air), Scorpio (water), and Leo with the
  header alone.
- Not run: real phones.

## Rollback
Revert the commit.
