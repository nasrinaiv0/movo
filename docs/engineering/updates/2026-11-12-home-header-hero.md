# 2026-11-12 — Pinned Home header with scenery, zodiac and glow backgrounds

## Purpose
Owner request (with a screenshot of the Home header):
- Freeze the Home header at the top, give it rounded bottom corners and a scenery background.
- Let Pro and Pro+ choose zodiac star and premium glowing backgrounds, with many premium choices including all
  zodiac signs.

## What changed
- `src/lib/homeHero.js`: the catalog.
  - **Scenery** (everyone): the app's 157 scenery pictures. Default `wp-w116`, mountains at dusk with no figures.
  - **Zodiac** (Pro, Pro+): all 12 constellations. Each is generated SVG: a night sky tinted by element (fire,
    earth, air, water), a seeded starfield, and glowing stars joined by lines, placed right of the greeting.
  - **Glow** (Pro, Pro+): Aurora, Nebula, Platinum, Gold halo, Ocean glow and Rose dusk, as layered radial
    gradients.
  - The art is original, with no third-party images. Data-URI SVG is allowed by the CSP (`img-src data:`).
  - `resolveHero` falls back to the default scenery when a premium choice is no longer allowed (plan ended or
    local-only mode) or unknown. `plain` removes the background.
- `src/lib/planAccess.js`: new Pro feature `headerThemes`, which Pro+ includes.
- `src/screens/Home.js`: the header gets `home-hero hero-<kind>` and the background through `--hero-bg`.
- `src/App.css`:
  - The header is pinned (`position: sticky`) and runs edge to edge into the status-bar area, with
    28 px bottom corners.
  - A scrim keeps the white greeting and icons readable on any picture.
  - Premium headers have a slow, calm glow drift, off with reduced motion.
  - In the iPhone app the header extends under the native top bar.
- `src/screens/Settings.js` → Appearance → **Home header**: tabs for Scenery, Zodiac and Glow.
  - Scenery offers Default, None, the short list and All 157.
  - For Free users, premium tiles show "Pro"; choosing one opens MOVO plans and changes nothing.
- Preference `homeHero` (default `auto`) syncs with other preferences.
- The plans panel lists "Zodiac & glow Home headers" under Pro.
- i18n: 27 strings in 11 languages.

## Tests
- Jest: 206 suites / 1,247 tests passed. New:
  - `homeHero.test.js`: 12 well-formed figures; the SVG has no script or links; scenery default; premium fallback.
  - `HomeHeroPicker.test.js`: Free tiles are locked and ask to upgrade; Pro can pick.
  - `App.test.js`: the default scenery header; picking Leo in Appearance changes the Home header.
- tsc clean; strict build passed.
- Browser (production build, 430 px):
  - default scenery (light), scrolled (header pinned at top 0), Leo (dark), Aurora and Pisces;
  - the picker as Pro+ and as Free (the lock is shown; a tap opened plans and the preference stayed `auto`).
- Not run: real phones, including the native iPhone top bar over the header.

## Data, security
- No schema or API change. The feature gate is a UI mirror like the other plan features.
- Header choices are cosmetic, and premium ones only take effect while the plan allows them.

## Rollback
Revert the commit.
