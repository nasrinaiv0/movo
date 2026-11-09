# 2026-11-09 — Unique geometric patterns with shadow depth on membership and rewards cards

## Owner request

"Add unique geometric patterns with shadows depth on cards" (after the merchant-style card layouts).

## What changed

- `src/lib/cardPatterns.js` builds each card's pattern from a seed (card id and merchant name, FNV-1a + mulberry32),
  so it is the same on every device and in both the wallet tile and the details sheet, and different for every card
  (two cards of the same merchant differ too). Six families: hexagon cluster, triangle grid, diamonds, overlapping
  discs, chevrons and low-poly shards.
- Shapes sit in three depth layers drawn back to front: faint at the back, stronger in front, with SVG drop shadows
  that deepen per layer and a light edge on the front layer. Colours come from the card's own palette.
- Everything stays in the right third of the card (x >= 575 of 856); the text column on the left is capped at 54-66%
  of the card width depending on the motif, so the pattern never sits under text. The pattern layer is above the
  brand motif and below the content, `aria-hidden`, and its filter ids are unique per card (`useId`).
- Fixed on the way: the text-width caps no longer apply to the pattern layer.

## Tests

`src/lib/cardPatterns.test.js` (same seed same pattern; unique across every merchant and between two cards of one
merchant; all six families appear; shapes right of the text column, three ordered depth layers, palette colours and
bounded opacity) and `LoyaltyCardFace.test.js` (pattern layer present with drop shadows, unique filter ids, different
patterns for two cards). Screenshots of all 28 faces at tile and detail size checked.

## Rollback

Remove the pattern `<svg>` from `LoyaltyCardFace.js`; nothing is stored.
