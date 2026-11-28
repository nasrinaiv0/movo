# MOVO plush zodiac mascots

Contributor: Codex. Candidate base `a9688176401aef0fbb3495241f4e7201b0e86c57` on MOVO main.

- Home's mascot picker previews 12 original 3D-style plush zodiac characters. Each has Calm, Happy and Concerned portraits and a short selection motion. Home resolves spending reactions through `mascotMood`. Browser and native reduced-motion preferences disable movement.
- All 36 portraits are local 320 × 320 transparent WebP assets. The visual direction comes from the reference trio supplied by the owner. The artwork was generated for MOVO. There are no third-party characters, logos, remote artwork requests, birth-date inputs or new data fields. Retain this provenance for the separate store artwork review.
- Classic Aries and Photo remain supported. The saved zodiac choice reuses the existing scoped `mascotStyle` string. Plush Aries is available on every plan. The existing `premiumMascots` entitlement gates equipping the other signs. The picker still previews all signs and opens the Pro+ plan for locked choices. Expired entitlements fall back to classic Aries without erasing the choice.
- Node 26.13.1 passed all 1,859 tests across 280 suites, TypeScript, localization generation, and the strict optimized web build. The offline build emitted 269 resources, including all 36 portraits. Isolated Chromium verified every portrait, all three motions, the Pro+ route, closing without saving, applying and reloading plush Aries, focus return, and Photo and classic Aries navigation. Captures cover 390 px light, 320 px dark at the largest font setting, and 1280 px desktop. The project has no running Vercel sandbox available for this work and paid provisioning is outside the release scope.
- PR #347 is merged. Draft #348 covers store evidence and draft #349 covers the standalone Aries wardrobe. The owner requested a dedicated draft PR for this work. Independent review and deployment acceptance are pending. No production or store changes were made.

## Rollback

Revert the mascot feature commit to restore the classic Home selector. No database or preference migration needs to be reversed. The same preference key still holds the appearance selection, and an older build can restore its existing Aries or Photo option.

## Independent review brief

Ask Claude to inspect the light and dark browser captures and the motion preview alongside the code. Check padding, tile and button sizing, font scaling, focus order, narrow-screen and tablet layouts, and motion with accessibility settings. Review the 12 sign mappings, the entitlement downgrade fallback, image weight and provenance. Record findings with the reviewed commit before release. Native iOS and Android acceptance, Vercel preview verification, and storefront approval remain release checks.
