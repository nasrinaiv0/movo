# MOVO Apple SDK integration — implementation and release log
Date: 2026-11-09
Repository: `nasrinaiv0/movo` · Branch: `feat/apple-sdk-foundations-20261109`
Scope: iOS Capacitor 8, Swift, React, Supabase/Vercel. No production deployment or database migration performed by this change.

## Status by Apple framework

| Framework | Current status | Code / dependency | Remaining work |
|---|---|---|---|
| LocalAuthentication (Face ID / Touch ID) | Already implemented and retained | `ios/App/App/MovoNativePlugin.swift`, `src/lib/appLock.js` | Device test: opt-in, cancel, biometric reset, passcode fallback, background re-lock |
| App Intents / Siri | NEW: native expense review intent, Xcode target registration, React deep-link source recognition and tests | `ios/App/App/MOVOAppIntents.swift`, `ios/App/App.xcodeproj/project.pbxproj`, `src/lib/autoLog.js` | Xcode build and on-device Siri discovery + confirmation; no unattended transaction creation |
| Keychain Services | One device-only vault (from #227): allowlisted `movo-autolog-key` and Supabase `sb-*-auth-token` entries | `ios/App/App/MovoNativePlugin.swift`, `src/lib/nativeAutomationKey.js`, `src/lib/nativeSecureAuthStorage.js` | #248's separate `automationKey` bridge was folded into #227's vault at merge (2026-11-09) so the plugin defines each method once |
| Sign in with Apple | Existing Supabase OAuth code, not verified end-to-end | `src/lib/financeRepository.js`, `src/lib/native.js` | Configure Apple provider in Supabase, Apple Developer Services ID/Key, native callback; verify session restores and cloud RLS |
| StoreKit / StoreKit 2 via Capgo Native Purchases | Existing purchase/restore flow, server-side Apple signed-data verifier | `src/lib/nativePurchases.js`, `api/lib/purchaseVerification.js`, `api/purchases/*.js` | Apple Store product setup, root certs, signing API credentials, entitlement schema, sandbox/production purchase tests. Billing MUST remain disabled |
| PassKit / Wallet | Not integrated; MOVO's membership cards are internal representations | None | Only offer Apple Wallet passes if issuer authorization, Apple pass signing certificate, supported pass fields and user consent are in place. No bank-card export |
| WidgetKit / Live Activities | Not integrated | None | Requires separately signed Widget extension, app group, privacy-safe summary model, optional ActivityKit attributes, consent, device tests |
| BackgroundTasks | Not integrated | None | Requires BGTaskScheduler identifiers/Info.plist registration, offline queue and conflict-safe sync, OS-scheduled tests. Cannot guarantee run intervals |

## Newly implemented Siri review flow

1. iOS 16+ installs an `AppIntent` named **Review an expense in MOVO** with required positive amount and nonempty merchant.
2. Swift validates finite amount and length, percent-encodes the URL query using `URLComponents`, and opens `movo://log?src=siri_shortcut&amount=...&merchant=...`.
3. MOVO's pre-existing native URL handler converts the URL into the React `#/log` route.
4. The URL is **untrusted**: no automation bearer key is included. Existing plan gating and transaction review apply. User explicitly confirms; no silent debit, transfer, or financial record is created. A signed-in cloud user must have cloud records loaded before review.
5. The existing `readLogLink` parser rejects zero/invalid values. The user can dismiss; no data is sent from Swift to third-party servers.

### Security constraints

- The Siri deep link is not a payment receipt or authorization and is never accepted as verified bank data.
- Keychain uses `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`, allowlisted key names and the device's own Keychain; secret values never appear in Vercel env templates.
- Keychain is not a defense against malicious JavaScript running inside MOVO's WebView. Maintain Content Security Policy, dependency review, RLS and backend authorization.
- No code in this PR migrates finance records, alters cloud/local reconciliation, enables subscriptions, or bypasses plan restrictions.
- Native Apple OAuth and StoreKit events must be authenticated/verified server side; purchase UI alone is not proof of entitlement.
- Do not use Apple Pay/Wallet as a source of bank transactions. Apple's payment APIs don't provide unrestricted transaction history.
- Private purchase keys stay server-side, never `REACT_APP_*`. Keep `MOVO_STORE_BILLING_ENABLED=false` until integration verification.

## Vercel variables registered as placeholders

Existing `.env.example` was expanded with the **actual names read by backend code**:
`APPLE_ROOT_CERTS_BASE64`, `APPLE_APP_ID`, `APPLE_IAP_SIGNING_KEY`, `APPLE_IAP_KEY_ID`, `APPLE_IAP_ISSUER_ID`,
`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, `GOOGLE_PLAY_PACKAGE_NAME`,
`GOOGLE_PLAY_RTDN_AUDIENCE`, `GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL`.
These are **store purchase verification credentials**, not Apple/Google OAuth credentials. The OAuth provider credentials belong in Supabase Authentication providers. No private values were committed.

## Manual requirements before release

- Apple Developer: verify Bundle ID `com.nasrinai.movo`, Apple Sign In capability, developer team and signing profiles.
- Supabase: configure Apple OAuth provider, allowed redirect URLs, verify `movo://auth-callback` on device and web sessions on `https://movo.nasrinai.com`. Do not put OAuth client secret in `REACT_APP_*`.
- App Store Connect: create subscription IDs matching `src/lib/store-products.json`, fill Apple API settings in Vercel, test refunds, expiration, renewal and restore on real devices.
- Repair missing plan entitlement schema after comparing checked-in migrations (production logs show absent `movo_plan_grants`); no production migration was run.
- For Widgets/Wallet/BackgroundTasks: approve feature-specific designs and iOS targets/capabilities, then separately implement and test. These are **not shipped or claimed complete** here.
- Never overwrite local device records because a cloud sync failed; test user sign-out/sign-in and stale responses.

## Quality gates and evidence

- **Verified 2026-11-09 in Vercel Sandbox** `sbx_fNllYdfj7EbtDLZP4hxIGN9aPzDe`: `npm run typecheck` PASS, `CI=true npm test -- --watchAll=false --runInBand` PASS, `npm run build` PASS (all exit code 0). These tests cover web/JS behavior only, not Swift compilation or real user login.
- Native iOS compilation, Siri phrase extraction, permissions, real StoreKit and OAuth: require Xcode/macOS, Apple signing and physical-device/TestFlight tests. A Linux Vercel Sandbox cannot validate these.
- GitHub commit status for the PR head reports **Vercel – movo: failure** with a deployment-blocked account guidance URL, not a successful hosted preview. This is distinct from the passing isolated Vercel Sandbox checks. Investigate the deployment authorization/block before a release.
- No PR merge or production release until all required checks are green.
- Rollback: revert the feature branch commits; no schema or data changes are needed. Disabling the App Intent's Xcode source membership removes the Siri action.

## Change log

- Added `MOVOAppIntents.swift` and linked it into the app Xcode target.
- Mapped `siri_shortcut` deep-link source to a clearly labelled review prompt.
- Added unit tests for Siri expense URLs and untrusted-key behavior.
- Keychain: uses the #227 vault (automation key and auth tokens); #248's duplicate wrappers were removed when the two PRs were combined.
- Updated the example env list and Vercel placeholder registry for verified Apple/Google store verification names.
- Inherited the separate auth/cloud-load deduplication fix from `fix/web-auth-session-cloud-load-20261109`. Its production behavior still requires a signed-in end-to-end test.
