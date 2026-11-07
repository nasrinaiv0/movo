# PR #225 — Chat thinking, solid More icon, and Google favicon fit

Date: 2026-11-06

## Requirement and changes
- Chat: remove the decorative pill/card behind the "Almost there…" progress state, including its inherited 0.25px pseudo-hairline, and remove the green circular background. Retain the animated NasrinAI sphere as a freestanding adaptive-color SVG plus readable status label and role=status announcement. These rules cover all progress phases without touching the actual message composer.
- More: use three properly filled, currentColor SVG circles (radius 2.15), not outlines, in the existing accessible icon system. Do not alter navigation or button callbacks.
- Google S2 favicon images: zero CSS padding and full available box in Wallet/account, scheduled subscriptions, transaction rows, Stocks and Crypto Market, and the subscription catalog. Keep the fetched square icon aspect ratio with object-fit:contain. Remove the subscription catalog's additional parent padding only when a Google favicon is present.
- No changes to unrelated images (MOVO fallback, custom art, QR codes) or finance/ledger calculations. Logo availability and fallback behavior remain unchanged.

## Tests and risk containment
- src/components/ChatMoreFavicons.test.js verifies status element/unstyled container, More's three filled dots, Google favicon CSS selectors and BrandLogo fallback behavior.
- Preserve theme switching, reduced-motion behavior, icon accessibility and responsive containers. Current screenshot references show Chat progress, More tile and Scheduled renewals.
- Test typecheck, translation coverage, full suites, build and GitHub CI in Vercel Sandbox; live preview remains a separate manual review gate when Vercel ignored builds cancel preview.
