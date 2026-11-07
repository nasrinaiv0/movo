# Wallet loyalty, membership, rewards, tokens and Other cards (2026-11-08)

## Scope and evidence
- Based on main at be7c3d9 (merged transaction-running-balance PR #238).
- Preserve existing membershipCards preferences, reward estimates, and ledger isolation.
- Add five explicit non-cash collectible-card types: Loyalty, Membership, Rewards, Tokens, Other. Require custom card-type text for Other.
- The Wallet Others filter places Cash and all collectible cards inside the same two-column wallet-card-grid using exactly the account card's 856:540 landscape aspect ratio. All displays a compact two-column collectibles section; legacy full-width reward panels removed.
- Show points/tokens in place of financial balances. The normalizer never creates cash accounts or allows collectible points to flow into spendable balances.
- Curated, lazy-loaded 64px merchant favicons with stable flat-color brand themes. Unknown providers use a neutral MOVO gift icon and never turn user text into external URLs. Network logos are for identification, not affiliation; never claim a merchant-issued card.
- Existing memberships and token cards remain readable and editable. Mask membership numbers; the Wallet privacy toggle masks points and estimated points.

## QA
- Vercel Sandbox: movo-wallet-merchant-cards-20261108 in the MOVO project, branch base be7c3d9.
- Run: CI=true npm test -- --runInBand; npm run typecheck; CI=true npm run build; npm audit --omit=dev.
- Check on iPhone-sized viewport: two equal-width cards per row (7-Eleven matches Cash); no visible button border; light/dark; readable text; custom card type persists; existing members still open; privacy hide; no currency symbol for points.

## Security and rollback
- Zero database migrations and no server-side entitlement, payment, or cloud behavior changes.
- Never interpolate arbitrary custom brand strings into a remote image URL. Approved logo registry can block images.
- Roll back the PR branch or remove its Wallet category rendering; retain existing user membershipCards records.
- Separate outstanding work: cloud-to-local entitlement transition and first-100 Pro+ promotion must receive independent security/billing review.

## iPhone-width browser regression (2026-11-08)
- Vercel Sandbox optimized build visited from mobile Chromium at 390px width with synthetic guest cash account and three saved collectible cards. In Others, Cash, 7-Eleven, custom Employee Benefits and Starbucks all measured 169×107px; 7-Eleven and Starbucks use curated 64px logos, and unknown store displays no external logo request.
- In the All view, cards were initially duplicated both inside the existing Accounts widget and a redundant extra collectibles section. Removed the extra section; All renders collectibles with Accounts once, while Others retains the shared compact grid. No finance ledger code changed.
- Browser/device QA does not establish native iPhone Safari perfection or merchant brand affiliation. Production untouched.
