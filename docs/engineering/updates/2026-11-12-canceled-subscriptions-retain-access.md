# MOVO canceled-subscription entitlement fix — 2026-11-12

## Confirmed problem
- The existing Google Play verifier maps `SUBSCRIPTION_STATE_CANCELED` to `expired` immediately, even with future `lineItems[].expiryTime`, contrary to Google Play subscription policy.
- Apple auto-renew-disabled events must be handled as non-renewing entitlements, distinct from `REFUND`/`REVOKE`.
- The live `movo_plan_status` database RPC omits `canceled`, and the IAP commit guard also excludes it.

## Solution (isolated branch, no PR)
- Play: status `canceled` while expiry is in the future; `expired` at and after expiry. Only store-verified purchases and recognized product IDs can confer access; revoked, paused and on-hold subscriptions remain ineligible. Paid referral credit needs verified positive order evidence even for canceled subscriptions.
- Apple: verified `DID_CHANGE_RENEWAL_STATUS/AUTO_RENEW_DISABLED` marks non-renewing, unexpired subscription `canceled`; `AUTO_RENEW_ENABLED` can restore `active`. Only store-verified refunds/revocations remove entitlements immediately. Order events by signed notification timestamp.
- Database: compatibility migration updates `movo_iap_commit` acknowledgement and paid-referral allowlists; updates `movo_plan_status` to include nonexpired canceled subscriptions and return `storeStatus` so clients can explain renewal state. RLS, owner isolation and service-only grants remain unchanged.
- UI: Plan & Usage shows canceled renewal and exact verified access-end date without changing the Pro/Pro+ feature gate before expiry.
- Tests: Google canceled-before/after-expiry, refunded-order non-credit, Play line-item order ID, Apple off/on notification, Plan & Usage state.

## Release safety
- No production migration or data changes performed. Do not bulk-restore previously misclassified `expired` rows, because existing data alone does not prove current store entitlement; refresh using signed store purchase restore or authenticated notifications.
- The SQL migration must be applied safely before the updated backend handlers (staging or disposable Postgres first). Complete IAP isolated DB tests and both stores' real sandbox/device checks before release.
- Avoid stale notification replay, double acknowledgement and referral re-credit; keep renewal and revocation semantics independent.
- Official policy: https://developer.android.com/google/play/billing/lifecycle/subscriptions and https://developer.apple.com/documentation/appstoreservernotifications/notificationtype
- NO PR, merge, production release or production DB modification was authorized.
