# 2026-11-12 — Fix: Portrait card format preview without a plan

## Bug
The owner reported that on Free, the Portrait tile in Wallet → Sort & view showed the card in the landscape layout, shrunk into the portrait box. The cause: `CardArt` sets `orientation = 'landscape'` whenever `portraitCards` (Pro) is not available, and that included the sample drawn inside the format picker.

## Fix
- `src/components/CardArt.js`: a new `formatSample` prop. Only the format picker sets it, and it skips the landscape fallback, so the sample shows the real portrait layout. Every other card keeps the gate.
- `src/screens/Wallet.js`: the picker passes `formatSample` for both the selected card and the default sample. Without Pro, the Portrait tile shows a "Pro" lock tag and its accessible name reads "Portrait (Pro)". Tapping it calls `requireFeature('portraitCards')` and opens plans, as before.
- `src/App.css`: the lock tag, mirrored for right-to-left.

Access is unchanged. Without Pro, the wallet, card details and the card deck still draw landscape, and the saved `cardFormat` cannot be set to portrait.

## Validation
- `CardArt.test.js`: without a plan, a portrait card is drawn landscape, and a format sample is drawn portrait.
- Jest: 209 suites / 1,257 tests pass. tsc is clean. The strict build compiled.
- Browser check (Playwright against the local mock cloud):
  - Free: the picker shows landscape and portrait samples, with Pro on Portrait, and tapping Portrait opens "MOVO plans".
  - Pro+: both samples show the selected card, unchanged.
- Not run: real devices.

## Rollback
Revert the commit.
