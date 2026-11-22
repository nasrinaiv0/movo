# MOVO Store Billing — implementation and console setup

Implementation: Native StoreKit 2 and Google Play Billing through @capgo/native-purchases (Capacitor 8).
Server authority: Apple-signed transaction JWS and Google Play Developer API subscription verification.
Entitlements: public.movo_store_entitlements; no client-side purchase state grants access.

## Product catalogue

Create the following **current** subscription product IDs in Google Play Console (and in App Store Connect only when an iOS launch is planned). The actual store catalogue in `src/lib/store-products.json` is authoritative. Older Pro/Max/Ultra identifiers are obsolete and must not be configured for this release:

| Product ID | MOVO tier | Google Play base plan |
|---|---|---|
| com.nasrinai.movo.pro.monthly | Pro | monthly |
| com.nasrinai.movo.pro.annual | Pro | annual |
| com.nasrinai.movo.proplus.monthly | Pro+ | monthly |
| com.nasrinai.movo.proplus.annual | Pro+ | annual |

Prices are loaded from the stores and must not be hardcoded in the app. Configure product descriptions, localized prices, subscription group, billing periods, grace period, tax settings, and availability in each store console.

**Annual saving (owner, 2026-11-12):** the plans panel says **"Save 20%"** on Annual. Price each annual base plan at 80% of twelve monthly payments in every country, in both stores (annual = monthly × 12 × 0.8). For example, ₱199/month gives ₱1,910.40/year; round down, never up, so the saving is at least 20%. In the apps, the badge is worked out from the store's own prices (`annualSavingPercent` in `src/lib/storeProducts.js`). If the prices are set differently, the app shows the real figure rather than 20%. The website has no store prices, so it shows the policy figure (`ANNUAL_SAVING_PERCENT`). Keep the two consoles and that constant in step.

## Required server environment variables

- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (server-only; never REACT_APP_ prefixed)
- Apple Root CA G3 is pinned in `api/lib/certs/apple-root-g3.json`. Environment variables cannot replace the trust anchor.
- APPLE_APP_ID — numeric App Store app ID; required for production JWS verification.
- APPLE_IAP_SIGNING_KEY / APPLE_IAP_KEY_ID / APPLE_IAP_ISSUER_ID — App Store Connect In-App Purchase server API credentials for current transaction status.
- GOOGLE_PLAY_PACKAGE_NAME — com.nasrinai.movo.
- GOOGLE_PLAY_SERVICE_ACCOUNT_JSON — service-account JSON with Google Play Developer API access to read and acknowledge subscriptions.

## Database migration

Apply supabase/migrations/*_movo_store_entitlements.sql to the intended Supabase project only after reviewing the migration and taking a backup. This repository change does not apply it to production automatically.

## Restore and account linking

- Restore is user-initiated and calls the native store restore API.
- Every recovered purchase is sent to the server for verification.
- Current purchases are linked to a deterministic UUID-shaped MOVO account token, not an email address.
- A store purchase already linked to another MOVO account cannot be silently reassigned.
- Expired, revoked, paused, on-hold, and pending purchases must not unlock a paid tier.
- A Google purchase is acknowledged only after server verification and entitlement persistence.
- Apple and Google purchases are tied to the signed-in MOVO account. Users can access an already verified entitlement on another device by signing in to the same MOVO account.

## Manual store-console and device tasks

- [ ] Create the four current product IDs and subscription groups in App Store Connect for a future iOS release.
- [ ] Create the four current Pro / Pro+ product IDs and monthly/annual base plans in Google Play Console.
- [ ] Set actual prices, billing periods, territories, tax, grace-period and account-hold policies.
- [ ] Enable the In-App Purchase capability for the iOS target.
- [ ] Configure an App Store Server API key and App Store Server Notifications V2 URL.
- [ ] Configure Google Play Developer API service-account access and Real-time Developer Notifications Pub/Sub.
- [ ] Add the Vercel secrets listed above.
- [ ] Apply the Supabase migration to the correct project.
- [ ] Test sandbox purchases, renewals, grace period, billing retry, cancellation, expiration, refunds/revocations, account switching, restore, and cross-device sign-in on real devices.
- [ ] Confirm store product metadata and localized price strings appear in the purchase UI.
- [ ] Add support and subscription management links to the store listing and in-app paywall.

## Important

This code implements purchase verification and restoration foundations. It is not live until the products exist in both stores, required server secrets are configured, the migration is applied, store notification endpoints are configured, and sandbox/device tests pass.

## Server notification environment and endpoints

- Apple App Store Server Notifications V2 URL: https://movo.nasrinai.com/api/purchases/apple-notifications
- Google Play RTDN Pub/Sub push URL: https://movo.nasrinai.com/api/purchases/google-notifications
- GOOGLE_PLAY_RTDN_AUDIENCE — exact HTTPS audience configured on the Pub/Sub push subscription.
- GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL — exact verified service-account email used for Pub/Sub OIDC push authentication.

Apple notifications are verified as signed JWS payloads. Google RTDN push requests are verified using Google's OIDC token and configured audience before the purchase token is queried against the Play Developer API.

## Release gate (6 November 2026)
`MOVO_STORE_BILLING_ENABLED` defaults to disabled. The app checks `/api/purchases/config` before opening native checkout. Keep it disabled until signed iOS/Android builds pass purchase, restoration, refund, revocation and renewal tests. The store-entitlements migration must be deployed first. `MOVO_STORE_TEST_USER_IDS` is legacy and never authorizes tester access. The current owner-requested tester policy below supersedes the former production-only restriction; genuine verified test transactions use service-owned, account-bound admission.

Before enabling checkout, test the fresh Apple Server API transaction status lookup, webhook retries and delayed delivery, and obtain native-language review of the new release copy. The restored implementation is not a certification of store approval.

## Hardened billing deployment (2026-11-09)

Apply `20261109160000_iap_integrity.sql` before deploying these handlers. Keep billing disabled during this coordinated rollout: the migration disables the legacy write RPC. Configure `GOOGLE_PLAY_RTDN_SUBSCRIPTION` (full Pub/Sub resource), `MOVO_IAP_TOKEN_ENCRYPTION_KEY` (64 random hex characters), and `CRON_SECRET` (at least 32 random characters). None are client-side variables. Retain the encryption key until all old acknowledgment jobs have completed; rotate via a controlled decrypt/re-encrypt procedure. The cron runs every 10 minutes; monitor its 503 responses and oldest outstanding job age, alerting well before Google's acknowledgment deadline.

Historical production-only restriction, superseded by the owner-requested 2026-11-22 tester policy: genuine Apple Sandbox and Google license-test evidence can grant account-bound tester access after the coordinated verifier/migration rollout. Forged receipts and client-declared test flags remain rejected; sandbox evidence cannot become production revenue.

Current lifecycle: canceling Google renewal retains access through the verified current expiry; expiration, pause/on-hold and revocation do not unlock a paid tier. Sandbox renewal periods can be accelerated by the stores. Manual grants, trials, and other independent valid purchases remain independent sources of access; refunding one receipt revokes that receipt.

Subscriptions only: MOVO has no one-time-product catalog. An unrecognized positive subscription notification returns a retryable response until client verification establishes ownership. Authenticated revocations are recorded even before ownership is established. Monitor unknown-owner failures and provider dead-letter queues. The server checks Apple's app account UUID and Google's actual `obfuscatedExternalAccountId` field against MOVO's existing deterministic per-user UUID mapping. Changing that mapping would orphan existing receipts.

The encrypted acknowledgment outbox is committed with entitlements. Retries never downgrade a newer revocation to pending. Public error responses and logs exclude raw SDK error messages, tokens, and stack traces. Event IDs and revocation tombstones must not be pruned while receipts remain replayable.


## Verified tester subscriptions (2026-11-22)

The owner requests subscription access for testers in both stores. For a new environment, deploy the verified Sandbox receipt/notification handlers together with `20261122055847_verified_store_tester_subscriptions.sql`. The current production rollout is recorded below; do not replay an already recorded migration. This targeted billing migration preserves the existing tables, client grants, account binding, lease fencing, environment separation, revocation tombstones and paid-referral rules. It does not require or authorize the three held #274 financial-erasure/retention migrations.

After successful server verification and atomic commit, MOVO automatically records the owner as a tester in its existing service-owned table. No manual MOVO tester allowlist entry is needed. That row alone grants no access: a current, unexpired store entitlement is still required. Clients cannot self-enroll, choose `sandbox`, replace the trusted store environment or move a receipt to another account. Existing administrator-admitted testers remain compatible. Sandbox entitlements remain `sandbox`, always have `paid_verified=false`, and earn no paid-referral credits.

1. **Apple:** configure the four subscription products and Sandbox notification URL in App Store Connect, and use TestFlight or a properly configured Sandbox tester on a store-signed build. Apple TestFlight purchases are Sandbox purchases. MOVO verifies the signed evidence and looks up current state against Apple's Sandbox server; app identity, certificate trust and account-token checks remain mandatory.
2. **Google:** configure the account under Play Console **License testing**, make the build available through an appropriate testing track, and install using that Google account. Track membership alone does not make purchases free. Use the store-provided test payment methods; MOVO trusts Google's `testPurchase` classification, not a client flag.
3. Sign into the intended MOVO account **before purchasing**, then choose Pro or Pro+. Existing unbound receipts cannot be silently claimed; create a fresh test purchase under the correct account rather than bypassing ownership validation.
4. Sign into the same MOVO account on the second device, including across iOS/Android. The server-owned entitlement follows the MOVO account; do not purchase a second subscription solely to restore access. Restore purchases on the original store if the initial verification was interrupted.
5. Exercise renewal, expiration, cancellation, refund/revocation and restore. Store sandbox periods may be much shorter than real monthly/annual periods. Independent valid trial/manual/production grants may still provide access after one test term ends; those are not extended by test admission.

Apple signed notifications retain the verified transaction environment. Unclaimed Sandbox events cannot create production revocation tombstones; a signed-in purchase/restore first establishes ownership. Known test renewals and refunds update the same account's test entitlement. Google test acknowledgements still occur only after verification and persistence, with encrypted retry jobs.

Required live acceptance: active API hosting; valid store-server credentials; billing configuration readiness and controlled checkout activation; applied targeted migration; correctly configured store products/testers/webhooks; real purchases and second-device checks. The public API was last confirmed HTTP 402 `DEPLOYMENT_DISABLED`; local tests cannot establish live tester availability while it is disabled. Do not paste credentials into chat or store them in frontend variables.


2026-11-22 production status: after explicit owner approval, the targeted tester migration is deployed as `20261122064410` (source `20261122055847`). Exact function, service-only access and tester RLS were verified. The API remains HTTP 402; no live purchase, checkout activation or store acceptance is established by this database rollout.
