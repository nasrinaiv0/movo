# 2026-11-12 — Home header: edge to edge, grounded ram, glowing Pro edge

## Request
The owner asked for four changes to the Home header:
1. Side space for Total balance.
2. The pinned header's scenery at 0px from the screen sides.
3. A bigger ram that doesn't float, starting 1px from the top, with the greeting moved right.
4. Glowing header borders for Pro and Pro+.

## Change
- `src/App.css`, a new block at the end, "Home header refinements".
  - `--hero-bleed` matches the screen's side padding (18px on phones, 32px on tablets, 40px on desktop). The hero takes negative margins of that size and the same inner padding. The header reaches the screen edges, and Total balance sits 18px from each side like the other cards.
  - The ram box spans the header row. The stage (`--ram-size: 131px`) hangs from the bottom, so the model's feet meet the card's top edge. A soft contact shadow sits under the feet. The scroll shrink no longer applies inside the pinned header, and right-to-left is mirrored.
  - Without Total balance under the header, the ram stands on the header's lower edge instead.
  - `.hero-tier-pro` uses gold (`#f4c76a`) and `.hero-tier-plus` uses platinum (`#c9d4ee`). The edge has a 2px masked hairline (`.hero-edge`), brightest at the lower centre and fading up the sides, plus a soft outer glow. The top edge stays under the status bar, clipped.
- `src/screens/Home.js`: adds `hero-tier hero-tier-pro|plus` and a decorative `<span class="hero-edge" aria-hidden>` when the plan allows `headerThemes`, that is Pro or Pro+.

## Validation
- `src/screens/HomeHeaderEdges.test.js` (CSS contract), and `App.test.js` checks that Pro+ shows the platinum edge.
- Jest: 209 suites / 1,256 tests pass. tsc is clean. The strict build compiled.
- Playwright screenshots against the local mock cloud: Pro (gold), Pro+ (platinum), Free (no edge), 360px, Arabic (right-to-left), a header without Total balance, and after scrolling. None scroll horizontally.
  - Measured at 430px: hero 0–430px, card 18–412px, greeting at 141px.
  - The ram's feet sit at y≈130.5 against the card top at 128. The happy-mood hop lifts them up to 5px and lands again.
- Not run: real iPhone or Android devices.

## Data, security and rollback
No data, API or security change. The edge is decoration only; it does not grant or check access. Roll back by reverting the commit.
