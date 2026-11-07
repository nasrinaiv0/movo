# MOVO Pro+ Founder 100 — one free year promotion, gated rollout (2026-11-08)

## Requested business outcome
The first 100 distinct customers subscribing to Pro+ should receive a full year of Pro+ without charges for that offer period. The store's price and auto-renew behavior, not the app database, determines whether the year is genuinely free. Apple App Store Connect and Google Play Console need an approved 12-month free offer and explicit billing disclosures. The offer must not be advertised as live while setup is incomplete.

## This PR implements
- An OFF-by-default database launch switch; no user qualifies until the operator enables it after store approval.
- Unique, immutable 1–100 slots allocated under a global PostgreSQL advisory lock whenever a production store-verified active Pro+ entitlement is persisted. Sandbox purchases, other tiers, expired/pending products, frontend claims and forged metadata do not qualify.
- One slot per user; a retry or reinstall never allocates another. 101st+ customers are not awarded a slot.
- RLS own-read and server-only mutation; reserved awards do not activate Pro+ features. Refund/revocation voids the award but does not recycle the original reservation.
- Service-role-only redemption after external store evidence of an actual free 12-month offer and valid start/end dates, then the existing authoritative plan-status RPC recognizes that verified period as Pro+. No app screen or customer API may call redemption directly.
- Existing Pro/Pro+ subscriptions and one-month trials remain authoritative without the new promotion switched on.

## Hard deployment blockers; do not enable yet
1. Create and approve the correct 12-month free StoreKit offer in App Store Connect for the Pro+ subscription, and a matching 12-month free trial phase/offer in Google Play Console. Decide auto-renew/cancellation and display it before purchase.
2. Add a genuinely store-verified offer-redemption pathway to call movo_record_verified_founder_offer with evidence; only service-role code can do so, and must verify the offer reference, owner and store-signed dates. The migration alone does NOT prevent platforms from billing standard subscriptions.
3. Build reservation-to-offer redemption UI and secure access-code delivery (for Apple codes or eligible Google offers), handling expired codes and clear status in account settings. Do not show one year free until store discount is verified.
4. Define launch date, geographies, first-100 counting policy, prior-subscriber rules, refund/cancellation rules, legal terms, tax, auto-renew disclosures.
5. Run signed Apple/Google test purchases, cancellations, renewal checks, 101st-user tests, webhook retries, reconciliation and restore purchases on real devices.
6. The migration is NOT applied to production. Apply migrations, verify grants and RLS, and only then enable through owner-controlled server after all above checks.

## Operator-only launch switch
After store approvals and receipt integration:
~~~sql
update public.movo_proplus_launch_control
set enabled = true, enabled_at = now()
where id = 'first100_proplus';
~~~
No direct signup/claims API exists; existing store verification and the database trigger reserve only after authentic store evidence.

## Isolation and regression
- Vercel Sandbox: movo-proplus-first100-20261108, based on main be7c3d9. No production database, paid database branch or user records touched.
- Run: sudo -u postgres env MOVO_PG_SOCKET=1 PGPORT=55432 python3 scripts/test-proplus-first100-local.py
- Disposable local PostgreSQL 18 fixture. Tested disabled-by-default, 103 qualifying users -> 100 slots, no repeat allocation, no client write, server-only redeem, no reserved access, refund revocation and authoritative plan status.
- Supabase CLI generated the migration; no production migration applied.
- Rollback must preserve already redeemed contractual benefits and should not delete awarded slots until all customer obligations are resolved.

## References
- https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-subscription-offer-codes
- https://support.google.com/googleplay/android-developer/answer/140504?hl=en
- https://supabase.com/docs/guides/database/functions
