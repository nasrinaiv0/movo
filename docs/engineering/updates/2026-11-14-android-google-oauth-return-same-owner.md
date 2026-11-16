# Android Google sign-in returns without entering MOVO — isolated diagnosis and fix (2026-11-14)

## Progress and evidence documented before commit

- Owner confirms email OTP sign-in **succeeds** in isolated MOVO Auth Test APK, but browser-based Google account selection does not visibly complete app sign-in.
- At inspection PR #302 was already **merged** at `7f7180186f19faa1e3422722e1463cd5cb1d2795`; current main `775b69378e4941a51a7bf134a491d45652c2565a`. Leave main, Google Play signed AAB workflow, Vercel production, Supabase and user data unchanged. This follow-up uses a separate PR.
- Read-only Supabase logs in the relevant 2026-11-14 10:40 UTC window show two Android-browser `/auth/v1/authorize` HTTP 302, two `/auth/v1/callback` HTTP 302, and one Android `/auth/v1/token` HTTP 200. Platform/package identity of that last exchange is **not established**, and logs cannot prove the test APK completed login. Do not expose request URLs, codes or user identifiers.
- Source-level reproducible case: `App.js` `applySession` exits early when `cloudAuthUserRef.current === nextUserId` **before** navigating from `Sign in` to `Home`. If Google uses the same already-known Supabase identity as email OTP or a previously restored session, the screen can stay on Sign In even after a successful session event. This is independent from any Android browser-return collision.
- Separate possible device-only cause: `com.nasrinai.movo` and `com.nasrinai.movo.authcheck` both register `movo://auth-callback`. Android may deliver a callback to the wrong installed package. No safe source-only change can guarantee a unique test callback without registering a distinct redirect in Supabase and an exact matching manifest. Do not broaden server redirect allowlist or modify production without approval.
- Supabase Auth PKCE one-time codes are short-lived and single-use. Keep existing same-client encrypted verifier and one-time exchange semantics; no token logging, retry of spent codes or unsafe fallback.

## Minimal source-only fix

- Navigate from Sign In to Home for **any valid authenticated session**, even when the identity matches the previously recognized owner; do this before the same-owner short-circuit. Keep the existing owner-specific cache isolation and skip unnecessary finance reloads.
- Preserve the existing app URL validation, Google Custom Tab, single exchange and secure Keystore/Keychain storage.
- On a callback failure, display only `OA-PROVIDER`, `OA-NO-CODE` or `OA-EXCHANGE` next to the existing localized generic message; never echo URL/error text. This distinguishes provider callback failures from SDK code exchange failures. Absence of any code may indicate that Android routed the link to a different app.
- Add pure navigation, fixed-code and App-usage regressions.
- No oauth provider, redirect URI, native manifest, production package, signing secret, financial calculation, cloud data or database changes.

## Required acceptance

- Exact-head Phase 1, Android `authTest` APK/R8, iOS simulator, finance tenant isolation, Vercel preview.
- Physical Android **MOVO Auth Test** with Google account selection, browser return **to that app**, successful Home navigation, email OTP unchanged, app restart/session retention, sign-out and second test-account finance isolation.
- For coexistence with the Play app, select MOVO Auth Test in the Android chooser or clear only the **default link handler** for the regular MOVO app. Never clear app storage or uninstall the production app. This PR does not solve wrong-package callback delivery by itself.
- No merge, Play upload or production change until verified.
