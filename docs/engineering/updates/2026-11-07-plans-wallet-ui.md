# Plan and Wallet mobile UI refinement

Based on main 9d3b04fd (merged PR #236). Removes the global cloud-read-only banner without weakening API/database restrictions. Free users retain local-mode settings and export/import access.

Plan comparison now uses horizontal scroll snapping, direct plan selectors and reduced-motion-aware navigation. The first-launch offer has a separately scrollable content area and fixed referral/claim footer within the dynamic viewport. Existing purchase and trial handlers are preserved; no prices or new entitlements are introduced.

Wallet membership/reward entries are card faces with provider, card type, masked number and points. Hidden balances also hide point values. Removed the separate Memberships & rewards title/Add link, generic Others section heading and duplicate Wallet add-card/account shortcuts. The Wallet header plus opens the complete card/account picker from every filter. The Others filter itself remains as requested previously. Reward estimates remain separate from spendable financial balances.

Validation: Vercel Sandbox full Jest, TypeScript, production build and mobile browser results recorded in the PR. No production migrations or billing changes in this UI follow-up.

Badge hierarchy: Bronze at 3/7/14 days, Silver at 30/60, Gold at 100 and Platinum at 365. Earned progress and internal IDs are preserved.

Sandbox verification: 765 tests / 135 suites passed; TypeScript and production build passed. Chromium 320×568 light, 390×844 dark and 430×932 light passed fixed trial-controls visibility, horizontal plan selection, membership card and header picker checks, with no horizontal overflow.
