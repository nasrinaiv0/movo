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
| `oauthAvailable()` | `true` | `false` until phase 2 (the app offers email codes) |

## Commands

```sh
npm run ios:sync      # typecheck + tests + build, then copy build/ into ios/App/App/public
npx cap sync ios      # copy an existing build/ only
```

`ios/App/App/public` and the generated `capacitor.config.json` copy are git-ignored; CI regenerates them.

## Native project settings (`ios/App/App/Info.plist`)

- Camera, microphone, photo library and Face ID permission text.
- `ITSAppUsesNonExemptEncryption = false` (HTTPS only), so TestFlight does not ask about export compliance.
- App icon (1024px, opaque) and splash use the MOVO mark.
- Bundle id `com.nasrinai.movo` and display name `MOVO`: **confirm both before the first App Store Connect record**;
  the bundle id cannot be changed after the first upload.

## Phases

| Phase | Scope | Status |
|---|---|---|
| 1 | Capacitor setup, iOS project (SPM), platform helper, native HTTP, icons, permission text | This PR |
| 2 | Native sign-in (system browser + `movo://auth-callback`, native Sign in with Apple), native storage for session and local records, local notifications, Face ID app lock, `movo://` links, native Liquid Glass top bar and dock (`MovoGlassChrome`) | Next |
| 3 | In-app account deletion (server endpoint + migration + tests); legal details from the owner | Needs owner input |
| 4 | Cloud build (Codemagic, automatic signing with an App Store Connect API key), TestFlight | Needs owner accounts |
| 5 | Device testing, screenshots, App Store submission | — |

## Owner prerequisites

- Apple Developer Program membership and an App Store Connect API key (App Manager).
- A Codemagic account linked to this GitHub repository.
- Confirmed bundle id and app name; completed legal details and a privacy policy URL; a reviewer demo account.
- For phase 2: add `movo://auth-callback` to the Supabase Auth redirect URLs and enable the Apple provider.
- Paid plans must use In-App Purchase on iOS (guideline 3.1.1); the first release ships without them.

## Known limits in phase 1 builds

- Google/Apple sign-in buttons are hidden in the app; email codes work.
- Web notifications and the WebAuthn Face ID lock are not available in the iOS web view until phase 2 replaces them.
- Records in device-only mode live in the web view's storage, which iOS may clear; phase 2 moves them to native storage.
