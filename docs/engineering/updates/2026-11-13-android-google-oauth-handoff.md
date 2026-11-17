# Android Google OAuth handoff — 2026-11-13 (progress before implementation)

## Report and scope
- Owner reports Android Google sign-in says it could not start / check the OAuth provider.
- Review source at main `5b616ce88e640ee867418db66b4da90ac438f5a0`; Android signed AAB workflow #36 passed, but no real-device login proof.
- Production Supabase Google login/redirects exist in Auth logs, so the UI message alone does not establish that Google is disabled.
- This is an Android-only Google OAuth hardening branch. Do not alter Supabase, Vercel, Google Cloud, Play Console, website login, iOS behavior, passwords, or finance data.

## Root risk found and reference
- Android app calls `Browser.close()` immediately on every `movo://auth-callback` in `src/lib/native.js`.
- Capacitor Browser 8.0.5 has a documented Android race with `singleTask` deep links: closing an already-cleared Custom Tab can relaunch the previous OAuth URL or leave a browser controller stranded; subsequent `Browser.open()` may not launch. Issue: https://github.com/ionic-team/capacitor-plugins/issues/2610 (open as checked 2026-11-13).
- MOVO currently also handles both `appUrlOpen` and `getLaunchUrl()` without deduplicating a repeated OAuth authorization code. One-time PKCE code exchange must happen once.
- Native secure-vault errors such as `invalid_secure_auth_key` and `secure_auth_delete_failed` may be mislabelled in the UI as an OAuth provider failure.

## Proposed limited changes
1. For Android, avoid calling `Browser.close()` when handling OAuth deep links; the `singleTask` app activation clears the Custom Tab. Retain existing iOS closing behavior.
2. Suppress repeated **same-code** callbacks during one listener lifetime; allow distinct future attempts. Never log or persist OAuth codes, URLs, tokens, or provider credentials.
3. Categorize missing/native secure-vault failures as secure-storage problems rather than blaming the Google provider.
4. Add focused regression tests for Android handoff, duplicate callbacks, iOS behavior, and safe storage error classification.

## Security and verification gates
- Continue using Supabase PKCE, external Custom Tabs, existing exact `movo://auth-callback` intent filter and secure Keystore/Keychain session storage.
- Never introduce WebView Google auth, plaintext token storage, credential logging, broad intent-filter host or auth bypasses.
- Run the normal PR checks plus Android native build and Vercel preview where available; inspect the exact head and report failures.
- Do **not** merge, trigger signed store upload, change production settings, or declare device login fixed without a Google Play internal-test device check.
- Unverified external operator check: Supabase Auth Redirect URLs allowlist must contain `movo://auth-callback`.

## Implementation record (after progress plan)
- Android OAuth return no longer invokes Capacitor `Browser.close()` (avoids the documented race); iOS still closes its browser.
- Ignore a duplicate OAuth callback carrying the *same one-time PKCE code* while allowing distinct new codes. Ignore callbacks after the listener unmounts. No callback or token data is logged or persisted.
- Classify native vault and plugin failures as secure-storage failures instead of generic provider configuration.
- Added `src/lib/nativeOAuthReturn.test.js` for Android/iOS browser return, duplicate intents, errors, cleanup, and distinct attempts. Extended `src/lib/authErrorCategory.test.js` for native vault error codes.

## Remaining release gates
- Exact-head CI, native Android compilation, Vercel preview and device acceptance remain to be checked.
- AAB #36 was generated **before** these changes and is not evidence of this fix.
- Confirm live Supabase redirect allowlist and Google login on signed internal build. Do not merge or publish until those gates are proven.
