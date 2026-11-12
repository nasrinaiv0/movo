# 2026-11-12 — Zodiac Home headers follow the owner's reference video

## Request
The owner sent a video (`MOVO_Premium_Zodiac_60FPS.mov`) and asked: "The header should be like this background. But the opacity is not too much."

The reference shows a deep indigo-purple sky and a gold zodiac wheel with the zodiac symbols around it. The sign is at the top, the constellation sits in the wheel, and a purple-blue ribbon of light sweeps across the lower part with a slow moving highlight.

## Change (`src/lib/homeHero.js`)
- **Sky.** Every sign uses one palette (`NIGHT`): an indigo-purple night with a faint purple nebula. The element now only tints the ribbon's far end (fire pink, earth teal, air pale blue, water sky blue).
- **Symbols.** `GLYPHS` holds the twelve astrological symbols as stroked SVG paths in a 20×20 box. They are not typed as characters, because iOS and Android may draw ♈–♓ as colour emoji. They sit on the wheel ring in gold, starting with the person's sign at the top, which is larger and brighter. The plain Celestial glow keeps its dot markers and has no symbols.
- **Ribbon.** The hills are gone. Instead there are a few thin flowing strands over one blurred strand, a soft bright core and a darker ground below, so the Total balance card sits on calm sky. Opacity is kept below the reference, as asked.
- **Moving light.** The existing drift light (`App.css` `hero-drift`, transform only, off for reduced motion) is lavender (`#c4b5fd`) on zodiac headers. The artwork itself is a static SVG, so nothing repaints per frame.

## Validation
- `homeHero.test.js` checks:
  - all twelve symbols exist and are path data only;
  - the shared night sky, twelve symbols on the ring, and the person's sign drawn first;
  - the ribbon is present;
  - the SVG has no scripts, links or `<text>`;
  - the lavender drift.
- Jest: 212 suites / 1,294 tests pass. tsc is clean. The strict build compiled.
- Browser screenshots (Playwright, 430 px, production build against the local mock cloud) of Aries, Taurus, Aquarius and Scorpio, Celestial, and a header without Total balance.
- Not run: real devices.

## Rollback
Revert the commit. There is no data or preference change; `homeHero` values are unchanged.
