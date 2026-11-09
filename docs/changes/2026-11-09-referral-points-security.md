# MOVO native-verified referral points — security and release

## User rules
- Everyone has one short, reusable referral code: `M` + five digits (e.g. `M78038`). A new account enters it within 7 days of sign-up (Refer MOVO, the free-month panel, or automatically filled in from a friend's download link).
- 5 points after a new, verified account enters a friend's code and the genuine native MOVO app passes server-side Apple App Attest or Google Play Integrity.
- An additional **100 points once per referred account** after its first **verified production** Pro or Pro+ paid purchase. StoreKit/Google Play notifications and purchase verification update the ledger idempotently.
- Points have **no cash value**, are not billing credits, savings, cashback, loyalty points, or finance data. Existing 10 qualified paid referrals → 3-month Pro reward remains separate and unchanged.
- Payment refund/chargeback creates a single **−100 points** compensation event if no eligible verified paid entitlement remains. Renewals/plan changes never re-award the same 100.
- The user supplies the code during onboarding or in Profile within 7 days of account creation; merely downloading from an app store cannot attribute a referral. Download QR codes (iPhone and Android) carry the code to the web app, which fills it in.

## Abuse controls
- Short codes are public by design (people share them); guessing is limited to 10 code entries per account per hour, recorded even when the code is wrong.
- One referral per referred account (`referred_by` is set once, never cleared), and unique constraint per (claim, event_kind) to prevent replay/race duplicate awards.
- Verified email/phone, no self-referrals by account ID, no attaching a code to previously paid or already-referred accounts, and a 7-day window after sign-up.
- Server-only RPCs run SECURITY INVOKER, check service role, fully schema qualify objects; RLS enabled; no client table writes/points credit endpoint.
- Sign-in bonus requires a **single-use five-minute challenge**, verified App Attest or Play Integrity, production app identity/certificate, nonce/timestamp verification and server consume. Challenge issuance capped at 10/hour/account; code entry capped at 10/hour/account; more than 10 new verified signup awards/day/referrer held for manual fraud review (no points posted).
- Native App Attest / Play Integrity **do not prove a unique human**; iOS key rotation and Android device farming remain possible. Explicit review and velocity controls mitigate but cannot eliminate Sybil fraud.
- No device fingerprint/advertising ID is collected. iOS App Attest key hash and Android signed token hash are limited to anti-replay. Do not turn on points redemption until privacy/legal and fraud review are complete.

## Configuration before enabling (do not paste secrets into chat)
- Apply migration `supabase/migrations/20261109153000_verified_referral_points.sql` **only after** staging SQL tests and production backup.
- Set `MOVO_REFERRAL_POINTS_ENABLED=true` on server only after migration, end-to-end native tests, privacy review and receipt verification checks.
- Configure `APPLE_TEAM_ID` and production App Attest capability/entitlements for the app bundle `com.nasrinai.movo`; use an actual signed iPhone for end-to-end verification.
- Configure Google Play Integrity Standard API, Play Console project linkage, `REACT_APP_GOOGLE_PLAY_CLOUD_PROJECT_NUMBER` and `GOOGLE_PLAY_INTEGRITY_CERT_SHA256` as returned by Google Play; Google service account must have Play Integrity permission.
- No sandbox or TestFlight verification should count as a paid production upgrade. Web-only use cannot issue the native signup bonus.
- If mobile integrity is unavailable, keep points pending (fail closed), not awarded optimistically.

## Release checks
- Unit tests: `src/lib/referrals.test.js`; existing `Profile.test.js` and `PlanRestrictions.test.js`.
- Vercel Sandbox: full React build/typecheck + all tests; verify responsive dark/light sheet on mobile before merge.
- Database: migration on disposable test DB, RLS advisors, concurrency tests for double redemption, self referrals, 10/day rate limit, repeated payments and refund/reversal.
- Native: Play Integrity signed app installed from Google Play test track (production gating separate); Apple App Attest real device; verify expired challenge, replay, wrong signing cert and environment mismatches.
- Rollout stays disabled until verified. Do not run this migration automatically on production from an unreviewed PR.
