# MOVO mobile billing hostile audit and hardening

Audited baseline: `115cf784fbc6ef4495d599e945347562a1f69a0c`; integrated with main `e50b7061` including PR #258, `nasrinaiv0/movo`, 9 November 2026. Scope: subscription verification, Apple V2 notifications, Google RTDN, database state, native acknowledgment boundary and production plan calculation. This is a source audit and isolated execution assessment; no production database migration, store-console change, production-secret inspection, real purchase or refund was performed.

## 1. Exploit scenarios found

No unauthenticated receipt-forgery or cross-account binding bypass was demonstrated. Do not mistake the absence of these findings for a production certification.

| Severity | Baseline evidence | Concrete attack/failure path | Remediation |
|---|---|---|---|
| High | `20261105152530_movo_store_entitlements.sql`: rejects updates whenever stored expiry exceeds incoming expiry | Keep a newer/longer entitlement, then receive a valid refund with a shorter expiry. The refund can be ignored. A modified client can keep replaying old receipts while webhook processing races. | Persist negative store facts independently of expiry; apply them under atomic locking. |
| High | `google-notifications.js`: voided purchases update rows directly; RPC only protects a revoked row when its transaction/order ID matches | Race a restore lookup with the direct void update, or replay a voided Google token whose next lookup has another order ID. The transaction-ID-only guard is insufficient for a token-wide revocation. | Token-wide Google tombstones; transaction-scoped Apple tombstones; fenced lookups and atomic commits. |
| High | Both notification handlers return HTTP 200 for unknown subscription owners | A refund/revoke arriving before initial client registration is permanently discarded. Delay initial verification on a modified device to expose this ordering gap. A later stale provider result may then be accepted without the lost negative fact. | Record authenticated unknown-owner revocations; retry positive events until ownership can be established. |
| High | `verifyGoogle` never uses `linkedPurchaseToken` | Upgrade/downgrade a subscription and restore the predecessor. The old higher-tier row can remain active alongside its replacement. | Resolve the verified predecessor, enforce same owner, and tombstone/revoke it in the same transaction. Pending replacements do not cancel their predecessor. |
| Medium | `decodeAppleTransaction` and `verifyAppleNotification` try Production and Sandbox; `movo_plan_status` admits sandbox rows for test users | An allowlisted testing account can use free test purchases for production premium access. This is **not** a demonstrated bypass for arbitrary non-allowlisted users. | Production-only verification and production-only store plan selection. Separate test infrastructure required. |
| Medium | No `notificationUUID` / Pub/Sub `messageId` ledger | Repeated legitimate deliveries or captured authenticated push requests repeat API calls and side effects; no atomic completion record exists. | Unique provider/event primary key, committed together with state; authenticated duplicates return 200. |
| Medium | Verify route acknowledges inline; failure directly overwrites status with pending; RTDN has no acknowledgment path | A process crash can lose acknowledgment, leading to auto-refund. A delayed acknowledgment failure can overwrite a newer revocation/state. Native code also contains an acknowledgment fallback. | Encrypted transactional outbox, server-only acknowledgment and scheduled retry; failures never rewrite entitlement state. |
| Medium | `verify.js` has no rate limiter and trusts optional Content-Length for body size | A signed-in attacker scripts malformed receipts or repeatedly invokes expensive store verification across serverless instances. | Strict Zod input schemas and database-backed 10/minute/user limit before store verification; actual parsed body size check. This does not claim to solve distributed multi-account traffic floods. |
| Medium | `verify.js` returns the pre-persistence `verified` object | A stale update rejected by SQL can still produce `status: active` and a premium tier in the client response, creating UI/backend disagreement exploitable in client-only displays. | Return committed state only. Backend authorization remains authoritative. |
| Low | Webhook handlers log truncated raw SDK error messages and convert every failure to 400 | Provider messages can contain token-bearing URLs; transient DB/API outages are reported as malformed input and are hard to distinguish operationally. | Fixed error codes only; generic retryable 503 for operational failures; no stack/token response logging. |

### Existing controls retained and strengthened

- Apple already uses `SignedDataVerifier` with online checks; no `jwt.decode()` acceptance or deprecated `verifyReceipt` call was found in the billing implementation. Pin the official Apple Root CA G3 DER and its SHA-256 rather than trusting configurable CA bytes.
- Production bundle/package is exactly `com.nasrinai.movo`. Apple production app ID remains mandatory. Nested renewal JWS is now independently verified and tied to the transaction's original ID.
- Google already uses `verifyIdToken` with audience and expected verified email. Add explicit issuer checks and the exact Pub/Sub subscription resource. The Google library supplies cryptographic signature/expiry validation.
- Both stores already require the existing MOVO per-user UUID binding. Google v3's actual response field is `externalAccountIdentifiers.obfuscatedExternalAccountId`, not `obfuscatedAccountId`. Preserve this established mapping so current receipts remain usable.
- The old table already has unique subscription-key, transaction-key and token-hash constraints. Add explicit original-ID/token-hash indexes and identity consistency checks; do not claim these protections were absent.
- Google already calls `subscriptionsv2.get` and does not grant PENDING. The requested ACTIVE/GRACE-only policy additionally removes CANCELED access, including paid time remaining. This is an intentional restrictive product-policy change, not proof that normal canceled-subscription access was a vulnerability.

## 2. Refactored production code

Complete Node.js/CommonJS implementations match this repository's Vercel backend runtime; no pseudocode or placeholder handlers:

- `api/purchases/verify.js`: authenticated client verification; strict input; shared rate limit; fenced provider lookup; committed state response; post-commit acknowledgment.
- `api/purchases/apple-notifications.js`: production JWS authentication; nested transaction verification; negative events applied directly from authenticated signed facts; atomic deduplication.
- `api/purchases/google-notifications.js`: OIDC authentication, exact subscription/package validation, server truth lookup, binding and predecessor cleanup, atomic revocation/deduplication.
- `api/lib/purchaseVerification.js`: provider validation and server-owned product/tier mapping. Normal Apple client verification uses App Store Server API transaction lookup. Valid signed Apple negative notifications do not depend on an extra API call succeeding.
- `api/lib/iapSecurity.js`: Zod schemas, fenced leases, sanitized errors, AES-256-GCM token encryption with token hash as authenticated context, persistence and acknowledgment helpers.
- `api/purchases/retry-acknowledgements.js`: secret-authenticated cron drains the durable outbox. API calls are bounded; deferred jobs cannot monopolize the oldest-job batch.
- `api/lib/certs/apple-root-g3.json`: official G3 certificate, SHA-256 `63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179`.
- `api/purchases/entitlements.js`: production-only entitlement listing; removes legacy test-user allowlist writes.
- `src/lib/nativePurchases.js`: removes client acknowledgment fallback; retains StoreKit finish after backend verification.

External calls cannot participate in a PostgreSQL transaction. The implementation acquires a 90-second database lease before the lookup and requires its unexpired fencing UUID during the atomic commit. The commit takes sorted advisory locks and row locks, checks ownership, records deduplication/revocation, updates predecessor and current rows, and inserts acknowledgment work in one transaction. Expired workers cannot commit or release a successor's lease. No database transaction is held open during network calls.

Apple ordering checks purchase time, transaction identity and verified signed time; a refund for an old transaction does not revoke a later valid transaction. Google treats RTDN as a trigger for current server state; token-wide revocations remain terminal even if order IDs change. This avoids using an old RTDN timestamp as if it described the current lookup result.

## 3. Database schema and index guardrails

Exact deployable SQL is in `supabase/migrations/20261109160000_iap_integrity.sql`:

- Unique `original_transaction_id` for Apple; unique SHA-256 `purchase_token_hash` for Google. Raw purchase tokens never enter the entitlement table.
- Provider/event ID primary key covers Apple `notificationUUID` and Google Pub/Sub `messageId`.
- Identity consistency checks, existing constrained status/environment columns, event/purchase timestamps.
- Private lease, revocation, acknowledgment and rate-limit tables with RLS; no public/authenticated write policies.
- Only service role can execute mutation RPCs. The legacy mutation RPC loses its service-role execute grant so stale handlers fail closed.
- Production plan calculation excludes sandbox and canceled store states. Refunding one receipt does not remove unrelated manual grants, trials or another valid purchase.

Migration preflight intentionally fails on inconsistent historical identities or duplicates. Investigate such rows rather than deleting them automatically. Deploy in a coordinated billing maintenance window, migration first and matching handlers next. Do not roll back only the handlers while leaving the old RPC disabled.

Required new server configuration: `GOOGLE_PLAY_RTDN_SUBSCRIPTION`, `MOVO_IAP_TOKEN_ENCRYPTION_KEY` (32 random bytes encoded as 64 hex characters), `CRON_SECRET` (at least 32 random characters). Existing provider/service-role secrets remain server-only. Never rotate the token encryption key without draining or re-encrypting pending jobs. Configure and monitor the ten-minute Vercel cron; investigate pending jobs well before the three-day acknowledgment deadline.

## Verification evidence and limits

All execution was isolated in Vercel Sandbox. Production data and store credentials were not used.

- Final integrated application typecheck, 173 Jest suites / 1,063 tests and production build passed after integrating PR #258. PostgreSQL checks also passed with the real referral migration, including point award/reversal and redeemed Pro access.
- Final focused run: 4 suites / 33 tests covering verification, native purchase behavior, boundary schemas, encryption/tampering, safe errors, OIDC claim rejection, duplicate delivery, post-commit acknowledgment and committed-state responses.
- Real Apple library rejected unsigned, missing-chain and substituted-algorithm JWS payloads using the pinned official root.
- Disposable PostgreSQL migration and behavioral tests passed: receipt ownership, shorter-expiry refunds, token-wide revocation across order IDs, unknown-owner Apple refunds, later legitimate purchases, delayed renewals, predecessor tombstones, expired fencing, atomic event rollback, rate limits and execute permissions.
- Separate-connection PostgreSQL race test passed: exactly one of two concurrent callers acquired a lease.
- Mobile Chromium at 390×844 rendered the built application with no page errors or horizontal overflow. Native StoreKit/Play dialogs cannot be validated by a browser smoke test.

Remaining release checks: real store purchase/renewal/refund/revoke/upgrade delivery, valid-chain positive Apple receipt, provider IAM/console configuration, cron authentication and production configuration. These require separate test infrastructure and actual store evidence. No claim of live store end-to-end certification is made. Unknown-owner positive events intentionally return 503 and require alerting/dead-letter monitoring; subscription ownership is established by authenticated client verification or a verified linked predecessor. MOVO's catalog contains subscriptions; this patch does not add one-time-product billing.

References: official Apple library https://github.com/apple/app-store-server-library-node ; Apple PKI https://www.apple.com/certificateauthority/ ; Google Pub/Sub auth https://docs.cloud.google.com/pubsub/docs/authenticate-push-subscriptions ; Play v3 subscriptions https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2 ; acknowledgment https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptions/acknowledge .

Reproduce focused checks with `CI=true npm test -- --runInBand src/lib/iapHandlers.test.js src/lib/iapSecurity.test.js src/lib/purchaseVerification.test.js src/lib/nativePurchases.test.js` and `node scripts/security/iap-crypto-smoke.cjs`. For SQL tests, use a fresh disposable local PostgreSQL database named `iap_security`, generate its isolated fixture using `python3 scripts/security/iap-db-bootstrap.py`, apply that output with `psql -v ON_ERROR_STOP=1`, then run `scripts/security/iap-db.test.sql` and `scripts/security/iap-concurrency.test.py`. The fixture creates test roles/auth tables and must never target a deployed database.

### PR #258 compatibility

Referral upgrade award/reversal calls execute inside the fenced entitlement transaction when MOVO_REFERRAL_POINTS_ENABLED=true. They use committed state and the existing unique referral ledger. The plan-status function preserves the 500-points-to-Pro redemption branch. SQL tests cover the paid award, refund reversal and redeemed-point plan access.

The published merge tree before this documentation-only evidence update matched the Vercel Sandbox-tested tree exactly: `4ccfafc4088d0729bda614a9fdd0d68261adc42a`.
