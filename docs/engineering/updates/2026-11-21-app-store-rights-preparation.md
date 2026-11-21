# App Store copyright and duplication preparation — 2026-11-21

The owner is preparing a first submission; there is no App Review rejection to appeal. This change addresses repository-supported risks under Apple's current 4.1, 4.2, 4.3 and 5.2 guidance. It does not establish legal ownership, trademark clearance or Apple approval. Continue in #330; do not create duplicate app records or replace MOVO's architecture.

## Findings and implementation

The public wallpaper catalog had 630 saved IDs and one explicit franchise title, “Witcher 3 Live.” Public logo/wallpaper/tutorial/mascot media had no completed redistribution-rights register. Earlier `APPROVED_BY_OWNER` flags and a non-affiliation disclaimer do not prove the rights holder's permission. Apple also lists **MOVO - SEND TO SPEND**, MovoCash, Inc., in Finance; name clearance remains unresolved. The owner has not authorized a replacement identity, and neither the display name nor canonical bundle ID is changed.

`src/lib/assetRights.js` enforces the original-only policy for installed iOS and the production build profile. Brand image helpers, fallbacks, inline subscription marks, market images and merchant trade dress use generic labels/marks. Card artwork becomes deterministic generated SVG geometry. Saved wallpaper IDs, account names, custom user uploads and private records survive. Premium artwork resolution returns before unreviewed storage/cache reads; no objects are deleted. The old franchise title is quarantined outside the active catalog.

The iOS guide keeps its captions and Next/Back/Skip/Continue controls. Its legacy screenshot/audio pack is excluded, generated illustrations have no fictional screenshot highlights, and unavailable audio has no offered control. Web/Android legacy media is retained and is not represented as legally cleared.

`build:app-store` regenerates third-party notices, runs a strict build, removes only the four generated output folders, rebuilds the offline shell and checks the artifact. Native CI, local iOS sync and Codemagic use that profile. The artifact check rejects unexpected public media and reinserted packs; it also checks removal of the inline trademark chunk. Source copies are retained for recovery and provenance. No reviewer-specific bypass or user/account detection exists.

Terms → Third-party notices uses the existing sheet to read bundled text, with translated loading/error states and request cancellation. Notices preserve collected locked-package licenses, upstream OCR/PDF notices and four font OFL texts. MPL native plugins include full license text and exact source-package URLs. A standalone full-notice provenance gap for tr46 0.0.3 is explicitly retained; collecting its MIT metadata does not resolve it. See the [App Review packet and rights register](../../app-store/APP_REVIEW_PACKET.md) and [upstream provenance](../../legal/upstream/README.md).

## Verification

- Node 26.13.1 full JavaScript regression: 258 suites / 1,689 tests pass. Typecheck passes. Nine packaging/offline/release-contract checks pass. The generated catalog has 3,256 strings in 12 complete languages; 85 limited catalogs are not represented as complete.
- Source whitespace checks pass with imported notice texts excluded; upstream license whitespace/line endings are retained verbatim for provenance.
- Both regular web and original-only strict production builds pass. Web retains its existing logo-pack behavior; the original-only shell has 54 resources and excludes the four unreviewed public media packs.
- Focused regressions cover actual iOS platform enforcement, image/inline fallbacks, generated-SVG input safety, all 630 saved wallpaper IDs, guide navigation without unavailable audio, bundled-notice success/failure/cancellation and build-copy removal without source deletion.
- Isolated Chromium visual acceptance uses a fictional guest account with 100.25 balance, reduced motion, a 390 × 844 viewport and blocked external requests. The long notice scrolls to its end without horizontal overflow and Escape closes the sheet. Wallet and notices screenshots are supporting responsive-web evidence, not signed iPhone or App Store screenshots. [Inspected evidence](../../audits/2026-11-21-app-store-rights-review.md).
- The upload/submission checks intentionally hold on missing real evidence. No pending item is marked reviewed merely because code passed tests.

## Remaining acceptance and rollback

Complete name/brand rights, original asset/contributor/license provenance (including the unresolved notice), one App Store record, truthful metadata and final screenshots, then signed-device/live-backend evidence. Record only real, redacted supporting references in `docs/app-store/submission-evidence.json`. The signed upload gate requires the first four reviews; the public-submission gate also requires signed-device/backend acceptance, avoiding a circular TestFlight prerequisite. Neither check grants Apple approval.

Production remains independently blocked by Vercel's overdue-team restriction; no paid settings or protection were changed. Prior #330 native iOS/Android checks passed at `68e44af9`; the R8 retry completed both compiler comparisons but lost emulator-5554 during offline instrumentation after seed acceptance. That is a failure, not paired-device acceptance. Fresh exact-head CI is required after this change. Separate encryption/erasure/store lifecycle acceptance is retained.

No database migration, schema, API/record format, financial calculation, auth/credential handling, pricing, entitlement, production data or App Store record changed. React/CRA, Capacitor, Supabase, existing navigation and UIKit remain. No store upload or production deployment was performed. Rollback should preserve saved IDs and recovery bytes; do not restore unreviewed packs to an iOS release. Correct a rejected artifact or notice by rebuilding from reviewed source rather than erasing private user data or changing the bundle ID.
