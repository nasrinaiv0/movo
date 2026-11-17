# 2026-11-17 — PR #309 brought up to date with main

## Why
The owner asked to merge all finished PRs. Production already has this PR's database migration (`20261115225110_movo_referral_plan_rewards`). It was checked against production on 2026-11-17: `movo_redeem_referral_points(uuid, integer, text, uuid)`, `movo_referral_points_status`, `movo_record_native_referral` and the other referral functions are present. So the code can ship without a new migration.

## Resolution
- `screens/Profile.js`: `main`'s redesigned Profile layout (#315, #316) is kept, with this PR's `ReferralSheet` props (session key, notify).
- `public/terms.html`: this PR's "Referral points and rewards" section is kept. `main`'s Security & Data Guide link is added.
- Terms and Privacy both change text in this PR (the referral section, and App Attest / Play Integrity). Both are now effective **November 19, 2026**, later than `main`'s November 17 and 18 dates, so people accept the new text again. The tests that pin the dates were updated.
- Translations were regenerated, and both sides' progress entries are kept.

## Validation
Jest (244 suites, 1,540 tests) and `tsc --noEmit` pass on the merged tree.
