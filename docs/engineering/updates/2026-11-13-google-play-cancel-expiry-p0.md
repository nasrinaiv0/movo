# MOVO P0 — Google Play cancellation-through-expiry — 2026-11-13

## Progress recorded before implementation
- Owner authorized isolated-branch P0 remediation; **no production changes, no merge, no signed AAB or store upload**.
- Base production-main commit: `5b616ce88e640ee867418db66b4da90ac438f5a0`.
- Current `api/lib/purchaseVerification.js` maps `SUBSCRIPTION_STATE_CANCELED` directly to `expired`, despite Google Play returning a future `lineItems[].expiryTime` for ordinary stop-renewal cancellation. Current `movo_plan_status` grants only `active` and `grace_period`.
- Google Play policy: ordinary cancellation retains paid benefits until verified expiration; revocation ends access immediately; expired, on-hold and paused states must not be treated as active. Source: https://developer.android.com/google/play/billing/lifecycle/subscriptions
- PR #274 also proposes the fix but is a 93-file compliance/migration change. This branch deliberately isolates the two-line runtime fix + synthetic regression tests; do not merge both without reconciliation.
- No real user data or store credentials are required for the tests.

## Planned patch and validation
1. Map canceled state to `active` only while its *server-verified* expiry is later than current time; otherwise `expired`.
2. Add deterministic fake-Google API tests for future/past cancellation, explicit expired state, on-hold, paused, and revoked pathways; do not make real store purchases.
3. Recheck Phase 1, iOS/Android native CI, billing/security CI, Vercel preview and exact branch head. Preserve real-device and billing-RTDN checks as manual release gates.

## Implementation verification (fill after tests)
Code patch and tests prepared in a subsequent isolated commit, together with a PR_PROGRESS entry. Exact-head CI, preview, and manual device checks still pending.