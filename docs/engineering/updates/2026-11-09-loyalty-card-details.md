# Memberships and rewards cards open the same Account details as other cards — 2026-11-09

## What changed
- Tapping a membership, loyalty, rewards, tokens or custom card in Wallet used to open the edit form. It now opens
  **Account details** (`src/components/LoyaltyDetailsSheet.js`) with the same layout as bank and card accounts:
  the card on top, then **Account overview / Transactions / Connected items / More** and the action row.
- The figures are rewards, never money: rewards balance with its unit, points earned in the last 30 days and in
  total, estimated from matching purchases through the card's earning rule (`estimateLoyaltyRewards`), membership
  expiry, a masked member code with show/copy, and the purchases that earned points. Connected items shows the
  earning account (opens its details) and a link to the rewards settings. More lists every saved detail.
- Actions: Edit card (returns to the details after saving), Remove card, and Copy member number (or Add member
  number when none is saved).
- Card face: the program name no longer truncates early, and a membership with an expiry shows "Valid thru MM/YY"
  like a payment card. The face renders at full size in the details sheet. New `copy` icon in the shared set.

## Verification
Component tests (layout, tabs, rewards-only figures, earning from matching purchases only, member code reveal,
earning account link, details, edit/remove, hidden balances), App test (Wallet tap → Account details → Edit card →
editor). Screenshot at 430×932 checked; no horizontal overflow. Full Jest 167 suites / 1015 tests, `tsc --noEmit`,
strict build.

## Data / security
UI only. Rewards stay outside balances and payment sources; no data or API change.
