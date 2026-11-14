# Android Google/email sign-in: native secure-storage diagnosis — 2026-11-14

## Progress plan recorded before code implementation

- Owner sees `Secure sign-in storage is unavailable on this device. Restart MOVO and try again.` in Android.
- PR #298 exact parent `26d30e7cdda04601e830c3013045b7c13cefb62a` is open and unmerged; the separate `MOVO Auth Test` APK is a debug build, not the Play-installed app.
- Source: `AuthPanel` maps many different failures to the same storage message: missing `MovoNative` bridge, Keystore read/write, incompatible auth key, or `secure_auth_legacy_cleanup_failed`. It is not sufficient evidence to blame Google OAuth provider, email delivery or the cloud public key.
- Source: `nativeSecureAuthStorage.setItem()` encrypts the session or PKCE verifier then unconditionally calls `Preferences.remove()` and `Preferences.get()` even when no old Preferences entry exists. A failed redundant remove causes sign-in failure *after* encrypted storage succeeded. Only a possible mechanism: the user's exact native error category is not yet known.
- Source: existing tests intentionally fail closed for real stale plaintext data or inaccessible storage; preserve that safety property. Android encrypted financial data, existing tokens, secure Keystore aliases and stored records must NOT be reset or overwritten.
- The correct Google/Email provider settings and real device state cannot be determined from this message alone. No user-data wipe, reinstall of the Play app, production config alteration or disabled vault is authorized.

## Minimal implementation scope

1. During legacy cleanup, first inspect the browser key and Capacitor Preferences key. Only call removal for an actually present legacy value; verify deletion after removal. If lookup or required cleanup fails, continue to reject sign-in and retry non-destructively on a subsequent attempt. Do not fall back to plaintext.
2. Surface safe fixed diagnostic codes `ST-BRIDGE`, `ST-READ`, `ST-WRITE`, `ST-CLEAN`, `ST-KEY`, `ST-DELETE` or `ST-OTHER` alongside the already-localized general message. Do not expose raw error messages, OAuth state, PKCE codes, token values, email addresses or backend credentials.
3. Add tests for no-op cleanup, legitimate legacy scrub, blocked cleanup remaining fail-closed, and diagnostic mappings.
4. Rerun exact-head test/security CI, Android native APK and Vercel preview. A build that compiles does not prove Android secure storage is usable on a real device.
5. Test on **MOVO Auth Test** without overwriting the Play app. Ask for only the safe `ST-*` diagnostic label if the failure persists, then repair the confirmed device-specific cause before release.

## Explicit restrictions

No merge, production deploy, Google Play upload, database migration, secrets change, native Keystore reset, financial-data deletion, app-data clear, or weakening of the encrypted storage guard. The source fix is a safe targeted reduction in unnecessary storage bridge calls, **not a claim that the reported phone is fixed**.
