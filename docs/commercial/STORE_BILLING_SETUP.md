# MOVO Store Billing — implementation and console setup

Implementation: Native StoreKit 2 and Google Play Billing through @capgo/native-purchases (Capacitor 8).
Server authority: Apple-signed transaction JWS and Google Play Developer API subscription verification.
Entitlements: public.movo_store_entitlements; no client-side purchase state grants access.

## Product catalogue

Create these exact subscription product IDs in App Store Connect and Google Play Console:

| Product ID | MOVO tier | Google Play base plan |
|---|---|---|
| com.nasrinai.movo.pro.monthly | Pro | monthly |
| com.nasrinai.movo.max.monthly | Max | monthly |
| com.nasrinai.movo.ultra.monthly | Ultra | monthly |
| com.nasrinai.movo.pro.annual | Pro | annual |
| com.nasrinai.movo.max.annual | Max | annual |
| com.nasrinai.movo.ultra.annual | Ultra | annual |

Prices are loaded from the stores and must not be hardcoded in the app. Configure product descriptions, localized prices, subscription group, billing periods, grace period, tax settings, and availability in each store console.

## Required Vercel environment variables

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

- [ ] Create the six product IDs and subscription groups in App Store Connect.
- [ ] Create the six product IDs and monthly/annual base plans in Google Play Console.
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
`MOVO_STORE_BILLING_ENABLED` defaults to disabled. The app checks `/api/purchases/config` before opening native checkout. Keep it disabled until signed iOS/Android builds pass purchase, restoration, refund, revocation and renewal tests. The store-entitlements migration must be deployed first. `MOVO_STORE_TEST_USER_IDS` is legacy and no longer enables sandbox access on production. Use a separate backend/database for store testing.

Before enabling checkout, test the fresh Apple Server API transaction status lookup, webhook retries and delayed delivery, and obtain native-language review of the new release copy. The restored implementation is not a certification of store approval.

## Hardened billing deployment (2026-11-09)

Apply `20261109160000_iap_integrity.sql` before deploying these handlers. Keep billing disabled during this coordinated rollout: the migration disables the legacy write RPC. Configure `GOOGLE_PLAY_RTDN_SUBSCRIPTION` (full Pub/Sub resource), `MOVO_IAP_TOKEN_ENCRYPTION_KEY` (64 random hex characters), and `CRON_SECRET` (at least 32 random characters). None are client-side variables. Retain the encryption key until all old acknowledgment jobs have completed; rotate via a controlled decrypt/re-encrypt procedure. The cron runs every 10 minutes; monitor its 503 responses and oldest outstanding job age, alerting well before Google's acknowledgment deadline.

Production purchase and notification endpoints now reject all sandbox/test purchases. The production plan RPC ignores historical sandbox rows even for test users. TestFlight/Play license testing needs a separate backend/database and explicit sandbox verifier implementation; there is no insecure production fallback.

Per the owner's requested policy, Google CANCELED states no longer grant access even if their paid expiry is in the future. This is stricter than the normal Play cancellation lifecycle. Communicate this product behavior before rollout. Manual grants, trials, and other independent valid purchases remain independent sources of access; refunding one receipt revokes that receipt.

Subscriptions only: MOVO has no one-time-product catalog. An unrecognized positive subscription notification returns a retryable response until client verification establishes ownership. Authenticated revocations are recorded even before ownership is established. Monitor unknown-owner failures and provider dead-letter queues. The server checks Apple's app account UUID and Google's actual `obfuscatedExternalAccountId` field against MOVO's existing deterministic per-user UUID mapping. Changing that mapping would orphan existing receipts.

The encrypted acknowledgment outbox is committed with entitlements. Retries never downgrade a newer revocation to pending. Public error responses and logs exclude raw SDK error messages, tokens, and stack traces. Event IDs and revocation tombstones must not be pruned while receipts remain replayable.
