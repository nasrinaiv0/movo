# MOVO iOS app (Capacitor)

The iOS app packages the **same React code** as the website with [Capacitor](https://capacitorjs.com). The website,
its APIs (`api/`) and Supabase are unchanged by this work; the app calls the production APIs. No Mac or local Xcode
is needed: the native project is generated and synced on Linux, and builds, signing and uploads run in the cloud.

## Decisions

- **Capacitor, not Expo.** About 95% of the code is reused as is; Expo would mean rewriting every screen and `App.css`.
- **Bundled, never remote.** `capacitor.config.json` has no `server.url`; the built site is shipped inside the app (App Store guideline 4.2 and 2.5.2).
- **Native HTTP** (`CapacitorHttp`). The app's `fetch` goes through iOS's native client, so requests have no browser
  Origin and no CORS preflight. `/api/nasrinai/chat` already accepts requests without an Origin when they carry a
  valid bearer token, and `/api/log` has no origin check, so **no server or env change is needed**.
- **Swift Package Manager**, not CocoaPods, so there is no `pod install` step.
- **iPhone only, portrait only**, iOS 15+. The app is built with the iOS 26 SDK for Liquid Glass (phase 2).

## Platform helper (`src/lib/platform.js`)

| Helper | Website | iOS app |
|---|---|---|
| `apiUrl('/api/log')` | `/api/log` (same origin, as before) | `https://movo.nasrinai.com/api/log` |
| `appOrigin()` | `window.location.origin` | `https://movo.nasrinai.com` (used for Shortcut recipes and email links) |

## Native services (phase 2, `src/lib/native.js`)

| Feature | Website | iOS app |
|---|---|---|
| Google / Apple sign-in | Redirect in the page | System browser sheet (`@capacitor/browser`); Supabase returns to `movo://auth-callback?code=…`, which `finishOAuth()` exchanges (PKCE) |
| Records on this device | `localStorage` | Same, plus every `movo.*` / `sb-*` key mirrored to native Preferences and restored before the first render if iOS cleared web storage |
| Alerts | Notification API + `sw.js` | `@capacitor/local-notifications` (`pushGranted()` / `enablePush()` / `showSystemNotification()` pick the right one) |
| App Lock biometrics | WebAuthn platform authenticator | Face ID / Touch ID through LocalAuthentication (`MovoNative.authenticate`) |
| Payment links | `#/log?…` | `movo://log?…` becomes the same `#/log?…` link |

## Liquid Glass chrome (`src/lib/nativeChrome.js`, `ios/App/App/GlassChrome.swift`)

- The web header and dock still render (hidden by `.native-chrome` CSS). `readChrome()` reads their title, back
  button, action buttons, red dots, tabs, active tab and badges from the page; icons are the web icons rendered to PNG
  template images, so both look the same. `MovoNative.setChrome` draws them natively; native taps click the same web
  buttons. **No screen needs to know about the native bars.**
- Top bar: a soft blur that fades out at its lower edge, a glass back button, the title, and a glass capsule with the
  header actions. Home keeps its greeting in the page and sends only its action buttons.
- Dock: a floating glass capsule with an accent selection capsule that slides with an ease-out (no bounce).
- While any sheet or dialog is open (`aria-modal="true"`) both bars fade out so they never cover it.
- iOS 26: `UIGlassEffect` (Liquid Glass). iOS 15–18: a system blur material. The window follows MOVO's light/dark
  theme so the status bar, keyboard and pickers match.

## Commands

```sh
npm run ios:sync      # (Node 22+) typecheck + tests + build, then copy build/ into ios/App/App/public
npx cap sync ios      # copy an existing build/ only
```

`ios/App/App/public` and the generated `capacitor.config.json` copy are git-ignored; CI regenerates them.

## Native project settings (`ios/App/App/Info.plist`)

- Camera, microphone, photo library and Face ID permission text.
- `ITSAppUsesNonExemptEncryption = false` (HTTPS only), so TestFlight does not ask about export compliance.
- App icon (1024px, opaque) and splash use the MOVO mark.
- Bundle id `com.nasrinai.movo` (owner-confirmed 2026-11-02; it cannot change after the first upload) and display
  name `MOVO`. App Store subtitle: up to 30 characters, still to be chosen.

## Phases

| Phase | Scope | Status |
|---|---|---|
| 1 | Capacitor setup, iOS project (SPM), platform helper, native HTTP, icons, permission text | Done (#139) |
| 2 | Sign-in through the system browser + `movo://auth-callback`, native storage mirror, local notifications, Face ID app lock, `movo://` links, native Liquid Glass top bar and dock, macOS CI compile | Done (#139) |
| 3 | In-app account deletion: Settings → Delete Account → type DELETE → `POST /api/account/delete` (verified token; transactions, then the Auth user via the Admin API; every other table cascades). No migration needed. Legal details still come from the owner | Account deletion done; legal details need the owner |
| 4 | Cloud build (`codemagic.yaml`, workflow "iOS TestFlight"): tests, web build, `cap sync`, automatic signing with the App Store Connect API key, unique build number, upload to TestFlight | Config ready; needs the owner's API key and env group in Codemagic |
| 5 | Device testing, screenshots, App Store submission | — |

## Owner prerequisites

- Apple Developer Program membership and an App Store Connect API key (App Manager).
- A Codemagic account linked to this GitHub repository.
- Completed legal details and a privacy policy URL; a reviewer demo account.
- **Before Google/Apple sign-in works in the app:** add `movo://auth-callback` to Supabase → Authentication → URL
  Configuration → Redirect URLs, and enable the Apple provider. Email codes work without this.
- Paid plans must use Apple's In-App Purchase on iOS. MOVO includes a StoreKit purchase/restore flow, but `MOVO_STORE_BILLING_ENABLED` must stay disabled until signed TestFlight verification, App Store Connect products, notifications, entitlements and expiry/refund tests pass. Do not activate purchases using client-only plan status or bypass the server verification gate.
- Apple TestFlight purchases are **Sandbox** purchases. MOVO's production receipt verifier and database entitlement commit intentionally reject Sandbox receipts and must not be loosened. Use a separately isolated staging backend/DB to exercise real Sandbox purchase-to-entitlement flows, or leave subscriptions unavailable until that test environment has been validated. A signed IPA alone is not a paid-billing acceptance test.

## Codemagic (phase 4)

`codemagic.yaml` → workflow **iOS TestFlight** (Mac mini M2, Node 22, latest Xcode). One-time setup by the owner:

1. App Store Connect → Users and Access → Integrations → create an API key (App Manager); download the `.p8` once.
2. Codemagic → Team → Integrations → Developer Portal → add that key and name it **`MOVO_ASC`**.
3. Codemagic → the MOVO app → Environment variables → group **`movo_web`**: `REACT_APP_SUPABASE_URL` and
   `REACT_APP_SUPABASE_ANON_KEY` (the public browser values Vercel uses; never the service role key).
4. App Store Connect → My Apps → + → iOS app, bundle id `com.nasrinai.movo`, name MOVO.
5. Start **iOS TestFlight** in Codemagic, or push a tag `ios-vX.Y.Z`. Codemagic creates the distribution
   certificate and profile, builds, signs (build number = Codemagic build number) and uploads to TestFlight.

## CI

`.github/workflows/ios-build.yml` compiles the app for the iOS simulator (unsigned) on `macos-26` with Xcode 26 for
every PR that touches `ios/`, `src/` or the Capacitor config. It proves the Swift compiles; it does not sign or upload.

## Known limits

- Native Sign in with Apple (the system Apple ID sheet) is not used yet; Apple sign-in goes through the browser sheet.
- Notifications are local (shown while MOVO runs or is resumed); there is no server push yet.
- The visual result of the glass bars has to be checked on a device or simulator (first TestFlight build, phase 4).

## Release safety gates (2026-11-11)

The current unsigned macOS workflow also compiles the **Release configuration** for a generic physical iOS target, executes packaging contract unit tests, boots an iPhone Simulator, opens a Siri deep link and uploads a smoke screenshot. This proves native **compilation and startup**, not Apple signing, real login, cloud sync or on-device payments. The workflow is deliberately triggered by changes anywhere in `src/`, `api/`, `ios/`, `public/` or release infrastructure.

`scripts/check-ios-release-readiness.cjs` fails closed when a bundled-web app is accidentally converted into a remote wrapper; the native bundle ID changes; signing, icon or permission metadata disappears; or native auto-finishing of transactions is enabled. It checks the **actual** App Store icon is an opaque 1024×1024 RGB PNG. Run `node --test scripts/check-ios-release-readiness.test.cjs && node scripts/check-ios-release-readiness.cjs` before every archive.

Codemagic uses locked dependencies, checks for Xcode 26+, and signs only through the owner's `MOVO_ASC` App Store Connect integration. Configure `movo_web` with the public Supabase URL and publishable/anon client key; never place service-role secrets, Apple signing private keys or database passwords in the iOS bundle. An uploaded TestFlight build must be independently inspected in App Store Connect.

**Mandatory owner and tester acceptance gates, not automated by this source repository:**

1. Confirm Apple Developer membership, the `com.nasrinai.movo` App ID, signed App Store IPA, valid provisioning and TestFlight processing. No signed build has yet been verified here.
2. Test fresh OTP signup, auto-continuation, returning session, Google and Apple callbacks, background/foreground lock, biometric cancel and sign-out on a real iPhone.
3. Verify that offline account/transaction writes load after force-quit, reconnect through explicit Sync local to cloud, keep cents exact and never cross Supabase user ownership boundaries.
4. Test receipt capture, photo picker, microphone transcription, Siri review and local notifications with granted, denied and revoked permissions.
5. Validate account deletion, restored purchases, canceled purchases, auto-renewal, server notifications, refunds and expiration. Use Apple's Sandbox through an isolated staging entitlement environment; do not grant production paid/referral credits for Sandbox receipts.
6. Produce and inspect Xcode's privacy manifest report for all included Capacitor/third-party SDKs; complete App Store privacy disclosures, age rating, legal/support URLs, support contact, review notes and sample credentials.
7. Validate small and large iPhone layouts and keyboard/safe-area responsiveness using the **final signed TestFlight artifact**.

**Release decision:** Do not mark public iOS distribution ready until these gates have evidence. Vercel Sandbox access returned `402 payment_required` during this audit; resolving that billing restriction is an external requirement, not a code patch.
