# PR #229 — Adaptive filter typography, compact headers and scroll mascot

Date: 2026-11-07

## Requirement
Improve the Financial Planning Goals & Plans filter's text color adaptability, reduce the excessive top/bottom space of all primary MOVO headers to 10px each, and make the Home mascot shrink slightly on scroll.

## Scoped changes
- Inactive filter-chip text inherits the application text theme. Selected chip ink inverts for the existing sliding pill (white text on its dark fill in light appearances; dark text on its white fill in dark appearances). Preserve chip dimensions, typography, hit areas, shadow-free button policy and click behavior.
- Set 10px top/bottom padding and 10px bottom spacing on every direct screen header, retaining the iPhone safe-area padding on the screen itself. Preserve header button dimensions, 0.5px internal button padding, icons, navigation and horizontal alignment.
- Home's 3D ram used to reserve 80px despite compact headers. Use a 68px mascot slot and 88px artwork (60px/76px on phones narrower than 360px), then scale the artwork to 88% on scroll. Photo mascot scales to 90%. Existing app scroll listener and pointer targets remain unchanged; respect reduced-motion preferences.

## Regression verification
- New src/screens/AdaptiveFilterHeaderMascot.test.js checks exact CSS values, real tab click behavior, the app scroll-state integration, narrow phones and reduced-motion.
- All other pages, ledgers, calculations, databases, subscriptions, preferences and asset loaders remain unchanged.
- Build and test using Vercel Sandbox, then GitHub exact-head CI before merge. The project currently ignores hosted Vercel previews, so live iPhone appearance still requires a separate check.
