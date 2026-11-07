# PR #227 — Native security remediation and main integration

**Date:** 2026-11-08 (Asia/Manila)  
**Target:** MOVO, security/native-auth-backup-privacy-20261106  
**Base integrated:** be7c3d9cb9cfb0f3d4686bf0f587ef603f378eec  
**Release status:** DRAFT. Not security-certified; production unchanged.

## Security fixes implemented

1. **Strict native auth legacy cleanup** in `src/lib/nativeSecureAuthStorage.js`: remove and verify browser and Capacitor Preferences auth-key copies. Failure returns a generic cleanup error instead of allowing a new session to access a stored token while recoverable plaintext remains. A later vault read retries cleanup. The session is preserved securely pending retry.
2. **Interrupted logout protection:** write an encrypted vault tombstone before scrubbing legacy copies. On cleanup failure, a stale plaintext token cannot be imported on the next launch. After successful cleanup, remove the tombstone. This deliberately favors confidentiality over login availability when storage fails; require native signed-device testing.
3. **Automation token deactivation on restore failures:** on every attempted native key restore, clear in-memory ready/cached state before querying the vault. Previously activated in-memory credentials cannot survive a subsequently failed read/cleanup attempt.
4. **Main integration:** reconcile new financial UI in `src/App.js`, including automation plan access and recent-log after-transaction balances, plus both concurrent documentation histories. Preserve the security vault and app behavior. Git merge parent `be7c3d9cb9cfb0f3d4686bf0f587ef603f378eec` includes newer MOVO code.
5. **iOS CI coverage:** update workflow triggers for native auth / automation bridge JS changes, so changes in secure persistence cannot skip simulator compilation due to path filters.

## Vercel Sandbox verification
- Sandbox `movo-security-audit-pr227-20261108` isolated from production.
- Integrated worktree: `npm run typecheck` passed; Jest **143 suites / 814 tests passed**; `CI=true npx react-scripts build` passed.
- Focused native key tests: 21/21 passed, including failed legacy cleanup, retry, revoked-session tombstone, and late vault failure. The full suite includes these tests.
- Android PR CI on previous security head: debug and unsigned R8 release build passed, run 42245136225. This does not validate this new head or signed hardware.
- iOS previous security-head job: canceled, run 42245135999. New-head iOS CI and signed-device tests required.

## Still blocked (not silently fixed)
- **GitHub main branch protection:** GitHub reported disabled. Repository admin must require reviewer approval, required CI checks and no bypass; a workflow file alone does not enforce branch protection.
- **12 authenticated-callable privileged financial RPCs:** read-only static inspection confirms auth.uid/user_id/search_path references but does **not** prove cross-account security. Need isolated two-user adversarial tests of cross-linked IDs, currency, delete/reversal, idempotency and balance side effects. No live schema/SQL change made.
- **Signed device QA:** iPhone Keychain/Keystore, older-app upgrade, hard reboot, logout during failed cleanup, OAuth return, app-switcher, secure QR export, and Android signed release remain unverified.
- **Web sessions:** browser uses JS-readable Supabase storage, not an HttpOnly BFF. CSP/XSS/CSRF and verified HTTPS app links need separate threat-modelled changes; credentials/signing IDs unavailable.
- **MFA/passkeys/session UI, login alerts, broader auth/API/OTP throttles and server-side device attestation:** not yet implemented or production verified. Supabase default signOut has global refresh-token revocation, but existing access JWTs remain valid until expiry.
- **Leaked-password protection:** Supabase Advisor currently warns disabled; evaluate whether password sign-in is enabled and configure in Supabase Dashboard.
- **Security test stage:** a staging Supabase branch / signed devices requires separate operator approval/identities. No cross-tenant exploit verification on production was attempted.

## Rollback
A rollback to older native versions may restore insecure plaintext token persistence. Prefer signed-out migration, device-key rotation and controlled rollout. Do not roll back to a vulnerable storage adapter without incident review. Live production auth, database data, RLS and billing entitlements were not changed.

## Follow-up — account session self-service revocation

- Added `revokeOtherSessions` repository method using the documented Supabase `auth.signOut({ scope: 'others' })` API. The Profile menu now offers a separately confirmed **Sign out of other devices** action and reports provider failure rather than claiming success. The active device stays signed in.
- Existing `signOut()` behavior is Supabase **global** by default. Both scopes revoke refresh tokens, but already-issued JWT access tokens remain usable until their expiry; this is **not** instant revocation or a session-inventory dashboard.
- Regression tests `src/lib/sessionRevocation.test.js` check the exact scope and provider error propagation. Existing authentication and financial APIs are unchanged.
- No personal session data is exposed, stored or logged by this action. Requesting device names, IPs, and individual session revocation would need a separately reviewed server-side endpoint and user-visible consent.
