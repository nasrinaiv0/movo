# 2026-11-23 — Keep the original Aries and add the zodiac guardians

## Scope

The owner's reference sets the costumes, color palettes and signature props for twelve new humanoid chibi characters. The sign-in lineup now places the existing Aries first, the new gold-horned Aries second and the remaining eleven signs in zodiac order. The original animate-on-welcome and Home Aries continue using the shared component.

The lineup uses one transparent 12-cell WebP atlas bundled with the app and staggered two-dimensional CSS entrance animations. It keeps the compact monochrome sign-in presentation and honors both the browser and iOS app Reduce Motion settings. The original Aries uses its existing component and entrance motion. The change introduces no focus targets. The regression test checks all thirteen positions, both distinct Aries designs, twelve unique atlas cells and the original sign-in header.

## Validation

Animated contact sheet and twelve 320 × 320 transparent animation exports were decoded, inspected and checked for continuous looping. The app atlas was verified as a 512 × 384 transparent WebP with twelve padded cells. Node 26.13.1 passed type checking, all 266 Jest suites / 1,772 tests, the production build and offline packaging. The hashed WebP is byte-identical to the staged atlas and is listed in the built service worker. Hosted preview and exact-head checks are tracked on PR #337.

## Data and rollback

The source adaptation uses owner-provided artwork as a visual reference. The app uses original generated sprites for the new designs and loads its art from the app bundle. No authentication, legal consent, API, database, entitlement, settings or financial data change is required. Revert the follow-up commit to restore the previous zodiac lineup. The existing Aries source and public APIs remain compatible.
