# 2026-11-12 — The ram stays standing on the Total balance box

## Request
"keep the mascot stand in the box like before". When asked, the owner confirmed: keep the bigger ram standing on the Total balance box, and make sure it never leaves it.

## Cause
The layout already stands the ram on the card's top edge (CSS from 2026-11-12, "Home header refinements"). The 3D idle animation moved it off:
- the happy mood hopped every 2.6 s and lifted the whole body by up to 5px;
- the angry stomp and tap reactions also lifted the body.

## Change (`src/lib/ramScene.js`)
- New `FEET_Y = -0.93`, the scene height of the ram's feet. The rig's origin sits at the feet, and `rig.position.y` is always `FEET_Y`, so `bodyY` no longer moves the body in any mood or tap reaction.
- Squash and stretch still apply, scaled from the feet, so happy moods still bounce in place.
- The happy hop no longer lifts both legs (`0.035 * hop` removed). The light alternating step remains, so one foot is always down.
- The ground shadow no longer shrinks for "air", because there is none.

## Validation
- `src/lib/ramGrounded.test.js`: the source contract (feet line constant, no `bodyY` in the rig position, no both-legs hop).
- Browser measurement (Playwright, 430px, production build against the local mock cloud): over 14 frames, about 3 s, the lowest point of the ram was 129.5–131.5px with the card top at 128px. Before the change it reached 126px.
- Jest (full suite), tsc and the strict build pass.
- Not run: real devices. The iPhone and Android apps bundle the web files, so a phone shows this only after a new app build is installed.

## Rollback
Revert the commit.
