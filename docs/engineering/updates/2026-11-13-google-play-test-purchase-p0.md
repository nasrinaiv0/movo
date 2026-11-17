# MOVO P0 — verified Google Play license-test purchases — 2026-11-13

## Progress recorded **before implementation**
- Owner authorized isolated, nonproduction changes; **do not modify Supabase production data, secrets, Vercel production, main, or Google Play releases**.
- Base commit: `5b616ce88e640ee867418db66b4da90ac438f5a0`.
- Current `verifyGoogle()` rejects `testPurchase`, so license testers cannot complete Play purchase-to-entitlement-to-acknowledgement checks. The fenced `movo_iap_commit` RPC only accepts `environment='production'`.
- Existing SQL `public.movo_store_test_users` service-role-only allowlist is present and empty on the inspected live project. Production `movo_plan_status` reads only production entitlements. Never automatically enroll users or treat a test purchase as paid production revenue/referral.
- Source: https://developer.android.com/google/play/billing/test and https://developer.android.com/google/play/billing/lifecycle/subscriptions

## Required security design
1. Verify every Google purchase token with Google Play Developer API, validate product and *server-bound* MOVO account. Use Google's `testPurchase` response to mark environment as `sandbox`.
2. Require a **server-managed allowlisted test account** for sandbox persistence; all other test purchases fail closed and production entitlements stay untouched. Do not infer test status from client flags, email addresses or untrusted request bodies.
3. Store sandbox entitlements separately by `environment` and never treat them as paid production referral orders. Only explicitly allowlisted test accounts may unlock sandbox access; everyone else requires production proof.
4. Acknowledge successful verified sandbox purchases through the same fenced encrypted-token outbox, so Google does not refund them for missing acknowledgement.
5. Authenticate Pub/Sub RTDN and verify tokens with Google before applying any state. Unknown-owner sandbox notification must not award benefits or cause a production tombstone.
6. Keep native signed builds, UI, web login, Vercel/Play/Supabase live settings, and financial data untouched during preparation.

## Implementation and release gates
- Surgical client verification, RTDN, entitlement read, and schema RPC updates in a **new migration**, never an in-place production database edit. Migration compatibility must be proven with disposable PostgreSQL CI.
- Synthetic Google Play mock regression: license test vs paid; cross-account denial; status and expiry; acknowledgement; isolation and referral non-qualification; iOS/Android CI and Vercel preview.
- Do not merge, apply migration, upload AAB, or enable actual license tester until all gates pass.
- Manual acceptance: operator enters tester's **verified MOVO auth.users ID** into service-role-only `movo_store_test_users` in a nonproduction test environment; install signed Play internal AAB; verify purchase, upgrade, restore, renewal, cancellation, expiry, RTDN, and refund/revoke; test ordinary user isolation.

## Implementation record
Proposed code, migration and tests prepared with PR_PROGRESS entry after the separate planning commit. Exact-head CI, preview and operator tests remain release gates.
## 2026-11-13 — Fix first disposable IAP assertion without weakening entitlement isolation
- First PR #297 IAP CI run #43355492063 failed a test that mistakenly assumed no store source after sandbox allowlist removal; a distinct legitimate synthetic production receipt still existed.
- Correct only the synthetic sandbox tier assertion: pro_plus while test allowlisted, production pro after allowlist removal. Security migration and runtime guards unchanged.
- Progress and failure diagnosis were documented before this code commit in docs/engineering/updates/2026-11-13-google-play-sandbox-ci-diagnosis.md.
