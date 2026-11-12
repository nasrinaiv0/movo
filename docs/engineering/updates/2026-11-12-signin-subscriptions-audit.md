# 2026-11-12 — Settings → Profile route; sign-in and subscription audit (iOS and Android)

Owner request: "If I click Profile in Settings, it should route to Profile, not to the edit page. Make sure the Android and iOS sign in and subscriptions are working. No mistake; priority is quality and security."

## 1. Settings → Profile
- `src/screens/Settings.js`: the Profile row calls `go('Profile')` instead of `go('EditProfile')`. Editing is still one tap away on the Profile card.
- `src/App.js`: new `goBack(fallback)`, which returns along the screen trail. Profile's back arrow uses it, so Settings → Profile → Back returns to Settings, and Menu → Profile → Back returns to Menu.
- Test: an `App.test.js` case covers both paths.

## 2. Sign-in audit (read only, production Supabase project `cjsjmorqvuvvwbfyztiz`)
Evidence:
- **Auth logs, last 24 h:**
  - Google authorize → callback → PKCE token exchange succeeded, both for an existing account and a new sign-up.
  - Email one-time code succeeded, including the second-factor (TOTP) step.
  - Errors were only expired or revoked sessions refused by the server, as expected.
- **`auth.flow_state` referrers (aggregate):** `movo://auth-callback` is accepted as a return address for Google. A disallowed address would be replaced by the site URL.
- **Identities by provider:** email 2, google 3, **apple 0**.
- **Public `/auth/v1/settings`:** `apple: false`, `google: true`, `email: true`.
- **`/auth/v1/authorize?provider=apple`:** `400 Unsupported provider: provider is not enabled`.
- **App code and native config are consistent:**
  - PKCE flow.
  - The exact `movo://auth-callback` link, registered in iOS `CFBundleURLSchemes` and the Android intent filter.
  - The system browser (Custom Tabs / SFSafariViewController).
  - Keychain/Keystore session storage with no plaintext fallback.

Findings and changes:
- **Blocker (owner action): Sign in with Apple is switched off in Supabase.** Enable it under Supabase → Authentication → Providers → Apple. This needs the Apple Developer Services ID, Team ID, Key ID and a Sign in with Apple key (.p8). Add `https://cjsjmorqvuvvwbfyztiz.supabase.co/auth/v1/callback` as the return URL in the Apple Services ID. App Store guideline 4.8 expects Sign in with Apple (or an equivalent) in an iOS app that offers Google sign-in.
- **Fixed (`src/lib/financeRepository.js`):** in the apps the provider URL is built locally and opened in the browser, so a switched-off provider showed Supabase's raw JSON error page. `oauthProviderEnabled()` now reads the public provider list (publishable key, 4 s timeout) before opening the browser. A provider reported as off raises `oauth_provider_not_supported`, which `AuthPanel` turns into a customer message. If the answer is unknown (offline, timeout or an unexpected reply), the check never blocks sign-in.
- **Customer wording (`AuthPanel.js`):** "Sign in with Apple isn't available yet. Continue with Google or your email instead." and "Google sign-in isn't available right now. Continue with your email instead." These replace text that told customers to "check the provider settings". Translated into 11 languages in `src/i18n/catalog/ui-2026-11-12-auth-providers.js`.
- Tests: `src/lib/oauthProviderCheck.test.js` covers the list read, never blocking on unknown answers, and a switched-off provider stopping before the browser opens. The `AuthPanel.test.js` wording is updated.

## 3. Subscription audit (read only)
Evidence:
- **Vercel Production settings:** all required billing settings exist by name (values were not read).
  - App Store: `APPLE_IAP_SIGNING_KEY`, `APPLE_IAP_KEY_ID`, `APPLE_IAP_ISSUER_ID`, `APPLE_APP_ID`, `APPLE_ROOT_CERTS_BASE64`.
  - Google Play: `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` and the RTDN settings.
  - Shared: `MOVO_IAP_TOKEN_ENCRYPTION_KEY`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, with `MOVO_STORE_BILLING_ENABLED=true`.
- **Live `/api/purchases/config`:** `google` → `{"enabled":true}`; `apple` → `{"enabled":false}`.
- **Database:**
  - `movo_plan_grants`, `movo_store_entitlements` and the `movo_iap_*` tables exist.
  - `movo_plan_status` and `claim_movo_trial` are SECURITY DEFINER, executable by `authenticated` and not by `anon`.
  - `movo_plan_status` refuses any caller other than the account owner or the service role, and counts only `environment = 'production'` store rows.
- **Vercel runtime errors (7 days):**
  - Missing `movo_plan_grants` (Nov 8, before its migration); resolved.
  - A Node `url.parse` deprecation warning from a dependency.
  - Unrelated NasrinAI upstream `key_format_invalid_format` errors (Nov 11). Check the `NASRINAI_API_KEY` format.
- **App flow (`src/lib/nativePurchases.js`):**
  - The server verifies the purchase before anything unlocks.
  - StoreKit finish happens only after verification, and Google Play acknowledgement is confirmed by the server.
  - Unfinished transactions are recovered on launch.
  - The store account is bound to a hashed `appAccountToken`.

Findings and changes:
- **Google Play:** ready on the server. Real purchases still need Play internal testing with a license tester.
- **Blocker (owner action): App Store checkout is blocked.** One Apple setting fails the server's validation. `APPLE_APP_ID` is the only Apple value with a format rule: it must be the numeric "Apple ID" from App Store Connect → App Information (digits only, not the bundle ID). The other three only need to be non-empty.
- **New, to find it without exposing secrets:** the owner Command Center (`api/owner`, owner allowlist plus two-factor) Billing view returns `storeReadiness` for Apple and Google: checkout ready, blocked or switched off, plus the names of failing settings. Values are never read into the response. `OwnerConsole.js` shows it as "Store checkout readiness". A test in `src/owner/ownerApi.test.js` (also in `api/owner/index.test.js`) proves that names appear and secret values never do.
- Known product gap, handled in open PR #274 rather than here: a cancelled subscription keeps access until expiry only with #274's change.

## Environment change made during the audit
With the owner's approval prompt, this session's cloud environment now allows `cjsjmorqvuvvwbfyztiz.supabase.co`, so the live provider list could be read. No production setting, provider, data or credential was changed.

## Validation
- Jest: 215 suites / 1,306 tests pass. tsc is clean. The strict build compiled.
- Not run: real iPhone and Android devices, App Store sandbox or Play license-test purchases.
