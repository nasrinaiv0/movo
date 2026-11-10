# Google Play billing provider readiness isolation — November 10, 2026

## Scope
Previous global checkout readiness required Apple IAP signing credentials even on Android. Native Google Play now requests provider-specific readiness and does not require unrelated Apple credentials. iOS checks Apple provider only. Older clients without a platform selector retain the conservative all-provider gate. Unknown selectors receive HTTP 400 with enabled:false.

Shared gates still require MOVO_STORE_BILLING_ENABLED=true, service-role credential, Supabase URL, IAP encryption key and cron secret. Google additionally requires its service-account JSON, RTDN push identity, OIDC audience and Pub/Sub subscription. Apple still requires App Store credentials and app ID. This endpoint cannot grant an entitlement; the server purchase verifier remains authoritative.

## Verification and limitations
Run targeted billing and native purchase tests; full TypeScript, Jest and production build; Android native CI and independent preview checks. Keep MOVO_STORE_BILLING_ENABLED=false in production. Only signed Play Console device/license tests can verify checkout, renewal, refunds, notification delivery and entitlements. No production secrets, SQL or billing activation were changed.

## Release gate
Google Play publication remains blocked by signed AAB and upload keystore, exact Android device testing, hybrid sync PR261 integration, Play Console closed testing and financial/privacy documentation. Rollback: revert staged changes and retain the default disabled flag.
