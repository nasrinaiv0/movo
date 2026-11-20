# QR referrals and one-month plan rewards

## November 16, 2026

- A new member can scan the referrer's QR, install MOVO and confirm the short code after signing in. Google Play can prefill the code from the install referrer. On iPhone the store landing page lets the person copy the code. Signed-out members who choose the free-month action with a valid code can complete it after sign-in. QR and install data by themselves only prefill the field.
- The referred member receives 20 points after the server verifies the account and store-distributed app. The first confirmed positive production charge adds 100 once. Free trials, zero-price offers, test purchases and renewals with an existing award earn no additional paid points. The existing inviter reward remains 5 on verification and 100 on the first verified charge. Historical verified claims keep their previous awards.
- Refer MOVO shows the balance and a confirmation for one non-renewing month of Pro (500 points) or Pro+ (750 points). Direct redemption is available from Android and web. Store subscribers can redeem once that entitlement expires, which avoids spending points on a term that could overlap a renewal. Existing MOVO trial and reward periods may queue the reward.

## Data and security

- The new migration preserves the legacy ledger and redemptions. It associates ledger events with the correct beneficiary, issues the invitee's +20/+100 only once, and reverses the paid bonus on a verified revocation when no qualifying period remains. Deleting the inviter anonymizes that relationship and keeps the invitee's points. An invitee account deletion uses the existing cascade.
- Reward debits use a server-side cost and per-account locks. A verified user can retry the same request without a second debit. Legacy mobile clients must update to use the new points UI. Direct clients keep their existing RLS and have no access to internal functions or ledger mutations.
- Google purchase verification uses the selected subscription item's successful order and explicitly excludes the free-trial phase. Delayed app verification checks already-confirmed store evidence in the same database transaction.
- The Terms and Privacy Policy describe the new reward and its app and purchase verification. Both effective dates are November 16, 2026.

## Release and rollback

1. Run the referral migration on a disposable or preview database with the prior IAP migrations. Apply it before deploying the new handlers. Keep `MOVO_REFERRAL_POINTS_ENABLED` off until the release checks succeed.
2. For Play Integrity, link the Android app to its Google Cloud project and set `GOOGLE_PLAY_CLOUD_PROJECT_NUMBER` on the server. Verify the Play App Signing SHA-256 digest in Google's API encoding, plus the existing service account's Integrity API access. Confirm the signed iOS build's App Attest capability, provisioning and matching `APPLE_TEAM_ID`.
3. Use a fresh MOVO account and a physical store-distributed app. Scan the inviter code, sign in, enter or confirm it, then open **Menu → Refer MOVO**. Verify +20 appears once and remains 20 after a free trial or Play license test. Verify a charged production purchase only in an approved purchase test, then check +100 once. Use a funded test wallet to confirm both redemptions and demonstrate Pro+ feature access after its start date. Apple in-app redemption requires a StoreKit offer-code implementation and App Review acceptance.
4. To pause rollout, turn off the referral points switch. Retain the ledger and issued entitlements. If rolling back application code, leave the additive migration and points switch off. Use a forward migration for a schema rollback so earned and spent points retain their values.

## Validation

- Node 26, TypeScript, full React/Jest regression suite, strict production build and email-template check.
- Disposable PostgreSQL 18.6 exercised the prior ledger and migration sequence, QR attribution after the trial had started, test and zero-payment exclusions, real IAP commit fixtures, late app proof, duplicate paid events, refunds, inviter deletion, both plan costs, and retry safety. Existing IAP identity and concurrent lease checks also ran.
- Local Chromium launch was blocked by the isolated runtime. GitHub Actions, Vercel preview, and signed physical device acceptance are tracked in the PR.
