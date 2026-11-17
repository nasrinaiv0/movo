# 2026-11-17 — Google Play and Android sign-in fix records, consolidated

## Why
The owner asked to merge finished PRs and close the ones no longer needed. #295, #296, #297 and #299 had already reached `main` through #298 and later merges. After their conflict resolutions, each branch held only engineering notes, plus one extra regression test on #296.

## What this PR now carries
- Engineering records from all four PRs, which `main` lacked:
  - #299, exact Google Play offer: `2026-11-13-android-play-exact-offer-p0.md`, `2026-11-16-pr-299-main-conflicts.md`
  - #297, license-test purchase isolation: `2026-11-13-google-play-test-purchase-p0.md`, `2026-11-13-google-play-sandbox-ci-diagnosis.md`, `2026-11-16-pr-297-main-conflicts.md`
  - #296, cancellation kept until expiry: `2026-11-13-google-play-cancel-expiry-p0.md`, `2026-11-16-pr-296-main-conflicts.md`
  - #295, Android Google OAuth return and iOS screenshot recovery: `2026-11-13-android-google-oauth-handoff.md`, `2026-11-13-ios-simulator-screenshot-recovery.md`, `2026-11-16-pr-295-main-conflicts.md`
- The #296 regression test (`src/lib/purchaseVerification.test.js`): an expired, paused or on-hold Google subscription never regains access from a future expiry time.
- No application, API or database change. #295, #297 and #299 are closed in favour of this PR.

## Validation
`npm test` for `purchaseVerification`, plus the full suite and the docs check, on this head.
