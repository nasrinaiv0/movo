# Verified subscriptions for Apple and Google testers — 2026-11-22

The owner requests that subscriptions work for testers on both iOS and Google Play. This explicitly replaces the historical production-only Apple Sandbox policy. It does not authorize fake entitlements, client test flags, paid-referral credits for test purchases, unrelated financial migrations or store publication.

## Behavior

Accept genuine Apple-signed Sandbox transactions/notifications and query current Apple transaction state through the matching Sandbox Server API. Production receipts still use production verification and API identity. Certificate trust, configured app identity, product allowlist, receipt/account-token binding and returned transaction/environment consistency remain mandatory. Sandbox purchases always have `paidVerified=false`.

Keep Google's trusted `testPurchase` classification from the Play Developer API. After a successful, fenced, service-only entitlement commit, atomically record a verified tester in the existing private `movo_store_test_users` table. A manual MOVO tester enrollment is no longer required. Failed/foreign claims roll back without enrolling anyone. Admission alone grants no plan: the existing server plan RPC still requires a current active/grace entitlement and store expiry. Existing administrator-enrolled testers remain compatible.

Test entitlements remain `sandbox`, cannot overwrite a production receipt identity and cannot earn paid-referral credits. Refunds, revocations, expiration, fencing, replay resistance, encrypted Google acknowledgement retries and product tiers retain their existing rules. Apple notification handling now preserves verified environment instead of hardcoding production. Unclaimed Sandbox events cannot create production tombstones; ownership is first established by a signed-in verified purchase or restore.

The plan belongs to the MOVO account across both device platforms. Another device uses the same server-owned entitlement after sign-in; no second purchase, device-local Pro flag, account-token change or financial structure rewrite is needed. Existing clients using the current native purchase contract remain compatible. Old receipts without MOVO account binding cannot be silently assigned.

## Paths and migration

`api/lib/purchaseVerification.js`, `api/purchases/apple-notifications.js`, billing/handler tests, `scripts/security/iap-*`, and `20261122055847_verified_store_tester_subscriptions.sql`. The targeted migration replaces only `movo_iap_commit`, preserving service-role-only execution, security-invoker mode, existing tables, policies and constraints. No existing entitlement or financial row is rewritten. Verified future commits can add tester participation rows atomically.

Read-only production metadata confirms the currently deployed commit body exactly matches the prior repository function, client/anonymous execution is denied, and the tester table has RLS. Current-head hosted checks subsequently passed and the explicitly approved targeted migration is deployed; see the approved production migration record below. Do not replay the three separately held #274 erasure/retention migrations. Never use a broad migration push as a substitute for this targeted billing rollout.

## Verification

All 266 frontend suites / 1,771 tests pass; typecheck and the strict original-only production build, notices and 54-resource worker pass. Local disposable PostgreSQL 18.7 runs the complete billing SQL suite with the new migration: verified admission for both stores; ownership and environment isolation; expiry and refund/replay behavior; paid-reward exclusion; direct client enrollment denied; authenticated own-plan reads and foreign-plan denial. Independent authenticated database sessions return the same tester plan. Concurrent receipt claims retain exactly one fenced lease winner. The real Apple SDK rejects forged signatures/algorithms for both Production and Sandbox payloads. Fresh hosted/native/SQL/container checks are required for the published head.

A synthetic Apple fixture originally reused another test's user and masked that fixture's points-plan assertion; it was moved to its own synthetic account, then the full SQL suite passed. No production test customers or financial rows were created or read.

## Store setup and remaining live gates

Apple TestFlight uses Sandbox purchases. Google testers must be configured under Play Console License testing; track membership alone does not make a purchase free. Use store-provided test payment methods. Sign into the intended MOVO account before purchasing and verify on the second device with that same account. Sandbox renewals/expiry can be accelerated; independent trial/manual/production access remains independent.

See [store setup](../../commercial/STORE_BILLING_SETUP.md#verified-tester-subscriptions-2026-11-22). Real signed-device purchase/restore/renew/refund testing, store product availability, server credentials, webhook routing, controlled checkout readiness, targeted migration deployment and an operational API remain required. The public API was last confirmed HTTP 402 DEPLOYMENT_DISABLED, and authenticated Google Cloud deployment access remains unavailable. No real store purchase or live tester acceptance is claimed from local tests. No billing switch, store listing, DNS/IAM or hosting setting was changed here.

Rollback: before activation, revert the verifier and targeted function together. After activation, preserve all purchase history and financial records; revocations/expiry must use the verified store lifecycle. Do not delete production purchases or pretend that reverting code automatically revokes existing valid test terms.

## Approved production migration — 2026-11-22

After explicit owner approval, applied only `verified_store_tester_subscriptions` to MOVO production Supabase `cjsjmorqvuvvwbfyztiz`. Recorded version is **20261122064410**, corresponding to source file `20261122055847_verified_store_tester_subscriptions.sql`. Do not infer that a difference in source/runtime timestamps requires replaying the migration or any held migrations.

Post-apply metadata queries confirm the exact tested function body, security-invoker mode, execution allowed for service_role and denied for authenticated/anon, tester-table RLS, and no new security advisories. The three #274 erasure/retention migrations remain unapplied. No existing financial or purchase rows were rewritten, no synthetic production tester grants were inserted, and no checkout flag, hosting/IAM/DNS or store configuration changed.

The earlier automatic-review rejection did not execute SQL. This successful attempt followed the owner's explicit production-migration approval. The database capability is now deployed; the matching merged #333 backend handlers must also be served before Apple Sandbox acceptance is available. Restoring an old production-only deployment is insufficient. The billing API still returns HTTP 402 DEPLOYMENT_DISABLED. Live purchase/restore/renew/refund and second-device verification remain blocked by hosting and must not be represented as passed.
