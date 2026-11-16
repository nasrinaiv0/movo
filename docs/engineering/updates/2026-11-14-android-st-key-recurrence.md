# MOVO ST-KEY recurrence — safe root-cause subdivision (2026-11-14)

## Report and evidence before commit
- The owner reports **ST-KEY still occurs** after testing the PR #302 auth-test APK. The exact installed package and originating exception are not available remotely; do not claim the actual cause is confirmed.
- PR #302 exact baseline `7aab6b5c055a2a43e86b98228d790cf46b8bab57` is open/unmerged. Android native CI and full regression CI passed; prior iOS run failed at **CoreSimulator screenshot/shutdown timeout** despite successful iOS simulator and unsigned release compilation; Vercel preview READY.
- Inspected `movo-pr302-authTest.apk` / GitHub Actions `movo-android-authcheck-7aab6b5c...`: APK and ZIP integrity passed, JS bundle contains new flow-key allowlist and Supabase SDK `@supabase/auth-js@2.119.0`.
- The SDK bundled key factories generate `<storageKey>-flow-<id>-code-verifier`, `<storageKey>-flows-code-verifier`, and the original fixed verifier. Local Python reproducibility test checked five actual key shapes (lengths 34, 48, 54, 86, 118); **all are accepted** by the new JavaScript regex and fit the native plugin's 128-character bound. Therefore broadening the allowlist again is not evidence based.
- `nativeAuthStorageFailureCode` currently maps all three concrete failures (`invalid_auth_storage_key`, `invalid_auth_storage_value`, `secure_auth_storage_native_only`) to one `ST-KEY`. That masks the required next diagnostic step. The code also maps native plugin key/value errors to the same generic result.

## Minimal change to diagnose the persistent failure safely
- Change **only** the fixed code label to `ST-KEY-NAME` for rejected vault slot names, `ST-KEY-VALUE` for invalid provided storage values, `ST-KEY-CONTEXT` for incorrect native context; preserve all existing `ST-BRIDGE`, `ST-CLEAN`, `ST-READ`, `ST-WRITE`, `ST-DELETE`, and `ST-OTHER` categories.
- Add tests for each error originating in JavaScript and native Android/iOS bridge; verify raw appended secret text is never rendered in a UI diagnostic.
- **No changes to session keys, value validation, encryption, OAuth redirect behavior, stored finances, native KeyStore/Keychain, account data, or providers.** No plaintext fallback or bypass; no production changes.

## Acceptance gates and manual steps
1. Require exact new-head full CI, Android auth-test artifact, iOS simulator build/smoke and Vercel preview. No green claim for iOS until complete; timeout must remain a real failing gate.
2. Install **MOVO Auth Test** from exact new PR head side-by-side with production, **do not clear app data**. Reproduce Google and email sign-in separately. Record only `ST-KEY-NAME`, `ST-KEY-VALUE`, `ST-KEY-CONTEXT` or other fixed `ST-*` label. Never record email/OTP, callback URL, auth code, token or finance data.
3. Repair that confirmed category on isolated PR only, rerun all gates, and validate physical Android login, restart/logout and second-account tenant isolation. Until then this is diagnosis, **not a solved Android login**.
4. No merge, release, Play AAB upload, Supabase migration or secrets change.
