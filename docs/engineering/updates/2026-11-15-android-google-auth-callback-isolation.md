# MOVO Android Google OAuth: isolate Auth Test callback (2026-11-15)

## Evidence recorded before code commits
- Owner reports Google account selection finishes but Android MOVO does not sign in; email OTP previously worked in isolated Auth Test.
- Read-only Supabase gateway logs at 2026-11-14 22:50 UTC / Nov 15 06:50 Manila show one Android GET /auth/v1/authorize HTTP 302 and one GET /auth/v1/callback HTTP 302, with **no corresponding token exchange** in that time bucket. The authorize query's sanitized redirect target is `movo://auth-callback`. Logs cannot establish which Android package received the return.
- Confirmed shared-route defect: Play `com.nasrinai.movo` and debug Auth Test `com.nasrinai.movo.authcheck` both declare `movo://auth-callback`. Android may dispatch to either package despite their separate Android Keystore PKCE verifier storage; the receiving app cannot safely exchange another package's code.
- Base main at inspection: `c9165b51ad41c11b167e10d4d566852baa509d45`; PR #303 already merged. Isolated branch only; main/production/store/DB untouched.

## Fix contract
- Production Android & iOS keep `movo://auth-callback`. Debug authTest registers **only** `movo-authcheck://auth-callback` for OAuth; both preserve `movo://log` for quick-log.
- Runtime Android redirect derived from *exact installed package ID* using Capacitor App.getInfo(). Unknown IDs or failures must reject; never silently fall back to production.
- Use package-specific callback for Google/Apple OAuth and email magic links; typed email OTP unchanged. Maintain PKCE code verification on the original device, native Keystore/Keychain session storage, single-use exchange, and existing token-free diagnostics.
- Add web/iOS/Android regression tests, check Android APK manifests, rerun required native/finance CI and Vercel preview.
- No cryptographic bypass, no session copying between packages, no access-token logs, no Google/Supabase secret changes.

## Required manual Supabase test-only prerequisite
A project administrator must add **exact** `movo-authcheck://auth-callback` to Authentication → URL Configuration → Redirect URLs for Supabase project `cjsjmorqvuvvwbfyztiz`. Leave `movo://auth-callback` and Site URL unchanged. Do not add wildcard URL patterns. This live setting will NOT be modified as part of this PR.
Supabase docs: https://supabase.com/docs/guides/auth/redirect-urls

## Acceptance
1. Exact-head Phase 1, Android debug/authTest/R8, iOS build+smoke, finance isolation, hybrid sync and Vercel preview all pass.
2. On a test Android device with Play MOVO installed, install the exact-head Auth Test. Verify only Auth Test claims `movo-authcheck://auth-callback`. Test Google account selection → Auth Test → PKCE exchange → Home; verify OTP, restart, sign-out, and second-account finance tenant isolation. Do not clear production app data.
3. Signed Play internal-test APK/AAB for the *approved* main commit requires separate physical Android verification. Do not conflate a debug test pass with Play release acceptance.
4. No PR merge, production changes, migrations, AAB upload, store release, or Supabase setting modifications without explicit approval.

## Advantages and constraints
Package-specific callback removes a concrete Android test-vs-Play routing collision, but it depends on a narrowly scoped new redirect allowlist entry and does not establish that other production-device routing issues are fixed until signed internal-testing acceptance.