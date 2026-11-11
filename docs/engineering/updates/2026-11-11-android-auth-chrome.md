# Android native sign-in and navigation repair — 2026-11-11 (PR #273)

## Root causes
MOVO's web app adds the `native-chrome` root CSS class on both iOS and Android via `startNativeChrome()`, but native Liquid Glass top/bottom bars are implemented only on iOS. The CSS then hides the web header, five-tab dock and fade on Android without a replacement.

The signed Google Play AAB is built in GitHub Actions from Create React App assets. Unlike a Vercel-hosted web deployment, this build did not pass the public `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` environment values, causing `supabaseConfigured` to be false in the installed app.

## Patch
- Limit `startNativeChrome()` to Capacitor iOS. Android and browser continue rendering existing web headers and dock without altering UI assets.
- Regression test simulates a native Android platform and proves no `native-chrome` class is added.
- Before building a signed Play AAB, read the Supabase HTTPS project URL from the `google-play-release` environment variable `REACT_APP_SUPABASE_URL` and public anon/publishable key from the protected secret `REACT_APP_SUPABASE_ANON_KEY`.
- Fail the signed build when variables are missing/invalid, and reject `sb_secret_` and JWTs whose role is not `anon`. Never echo key values or embed server keys in JavaScript.
- Add standalone Node guard tests to Google Play PR signing CI.

## Release operator actions and verification
1. Configure `REACT_APP_SUPABASE_URL` as a GitHub environment variable and `REACT_APP_SUPABASE_ANON_KEY` as an environment secret under `google-play-release`. They are distinct from Vercel environment variables. Use only the public Supabase anon/publishable key.
2. Enable desired email and Google providers in Supabase Authentication; allowlist `movo://auth-callback` for native OAuth, configure Google's provider callback at Supabase, and validate Google Sign-In and OTP on a physical Android device.
3. Merge only after CI and preview verification. Create a new signed AAB from main with a fresh greater versionCode. Upload to a Play testing track and confirm sign-in, navigation and account isolation on-device before production.
4. Vercel Sandbox session creation for the MOVO team returned 402 `payment_required` on 2026-11-11, so Vercel Sandbox UI/browser and native-device testing could not be completed in this change. This does not imply a successful release.
