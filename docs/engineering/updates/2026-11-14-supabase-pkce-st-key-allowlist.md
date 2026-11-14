# MOVO Android ST-KEY: Supabase PKCE native vault key compatibility — 2026-11-14

## Read-only diagnosis before implementation

- Owner reports `Secure sign-in storage is unavailable on this device ... (ST-KEY)` after Android Google/email sign-in failures. `ST-KEY` maps to rejected native auth key/value or nonnative platform; the original on-device exception was not collected.
- MOVO main baseline: `05b494d0560883163a05ef57f3a95b4e16516ed2` (PR #298 already merged). GitHub signed AAB #44 is built from this baseline and does **not** include this proposed patch. Earlier signed AAB #43 predates the `ST-KEY` UI classifier.
- `package-lock.json` pins `@supabase/auth-js@2.119.0`. Its PKCE flow supports `<storageKey>-flows-code-verifier` and `<storageKey>-flow-<flowId>-code-verifier` in addition to `<storageKey>-code-verifier`. Supabase's own SSR design documents those formats and bounds verifier flow IDs to 8–64 URL-safe characters.
- MOVO's `nativeSecureAuthStorage.js` only accepts the base session key and the fixed `-code-verifier` form. A new flow index/slot would fail before `MovoNative.secureSet` and yield `invalid_auth_storage_value`, surfaced as `ST-KEY`. This is a reproducible **source-level compatibility defect**, not proof of the precise phone's call path.
- Both Android and iOS native vault plugins already allow `sb-` keys containing `-auth-token` with a strict length under 128 characters. Do **not** modify native crypto or its key material, credentials, account sessions, financial records, database, or server configuration.

## Narrow implementation

1. Extend only the JavaScript adapter allowlist to the documented Supabase fixed verifier, pending-flow index, and per-flow verifier slot; require flow IDs of 8–64 `[A-Za-z0-9_-]` characters and overall length below 128.
2. Keep all auth values inside the existing Keystore/Keychain APIs. Existing `write → verified legacy scrub`, sign-out tombstone, rejection on inaccessible storage, and no-plaintext-fallback behavior stay unchanged.
3. Add positive tests for session/fixed verifier/index/slot; encrypted read+delete; and negative tests for malformed flow IDs, overlong keys, unrelated auth/user and financial keys.
4. Update `docs/PR_PROGRESS.md` in the same commit before opening PR. A Python-only regex harness confirmed 11 key formats and reproduces the original flow-index/slot rejection; this is **not** full Jest or native acceptance.

## Safety and release gates

- PR only: no merge, main/production deployment, signed AAB upload, Supabase migration, secret mutation, Android app data clear, KeyStore reset, or uninstallation.
- Require exact-head Phase 1, native Android APK, iOS, security and Vercel preview validation. The Google Play signed release must be rebuilt **after** an explicitly approved merge.
- Real Android Google account-selection/callback, email OTP delivery/verification, force-stop session persistence, sign-out and second-account financial isolation must pass on the same shipping code before Play promotion.
- If `ST-KEY` remains on a device after the patch, collect only a safe subtype diagnostic and non-sensitive build/package identity; do not request tokens or secret callback parameters.
