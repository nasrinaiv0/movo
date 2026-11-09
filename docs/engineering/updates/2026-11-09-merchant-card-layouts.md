# 2026-11-09 — Membership and rewards card layouts from the owner's merchant references

## Owner request

"Use these cards layout for the membership, loyalty, rewards, etc." with 25 photos of Philippine merchant cards
(Starbucks, 7-Eleven, SM Advantage, Jollibee, Mercury Drug, S&R, Landers, Puregold, Robinsons, AllRewards, Rustan's,
Metro, Shakey's, Max's, Coffee Bean, The Bistro Group, Watsons, Southstar Drug, National Book Store, ACE Hardware,
Toy Kingdom, Petron, Shell, Caltex, Cebu Pacific).

## What changed

- **Layout (LoyaltyCardFace).** Like the references: merchant mark and name on top with the card type under it, the
  program title large (serif italic for the premium programs), the member number and date, then the rewards
  balance. Text stays on the left; the right side carries the motif. Small wallet tiles show the date alone (06/27).
- **One flat motif per merchant** (`lib/loyaltyBranding.js`): rings, a diagonal band, bottom stripes, a foil edge, or a
  two-tone split, in the merchant's colours. Still no gradients.
- **Program titles** from the references (Suki Card, Happy Plus, Advantage Card, Value Card, Go+, GetGo …) show when
  the person has not typed their own program name; theirs always wins.
- **Merchants.** `LOYALTY_PROVIDERS` adds the programs from the references, grouped by kind. Existing cards keep their
  names and pick up the new look.
- **No merchant artwork is reproduced.** The reference photos are not shipped. Logos still come only from the curated
  favicon list (`merchantFavicons.js`); merchants without a curated domain show MOVO's icon. No new domains were added.
- **Readability.** Card text meets WCAG 4.5:1 on the card colour and on any motif it can cross (tested); Watsons,
  Southstar, Shell, Toy Kingdom and Robinsons colours were adjusted for that.

## Tests

`src/components/LoyaltyCardFace.test.js`: every listed merchant has its own layout, valid colours and a known motif;
text contrast on card and motif; logos only for merchants marked with a curated domain (and that exact domain);
program title fallback and the person's own title; short date; no gradients or image artwork. Existing loyalty sheet,
details and Wallet tests unchanged.
