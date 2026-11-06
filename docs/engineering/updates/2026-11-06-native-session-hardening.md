# MOVO — Native session vault and mobile privacy hardening

Date: November 6, 2026 (Asia/Manila)
Base main: 9c423c7197a2cc48289ea620ce308db8826d2c55
Security branch: security/native-auth-backup-privacy-20261106
Basis: MOVO 22-point Security & Trust Checklist PDF (pages 1–4).
Release state: NOT CERTIFIED / STORE BILLING REMAINS DISABLED.

## Security controls changed
- Supabase native session storage now uses an asynchronous native vault adapter rather than JavaScript localStorage. Browser session behavior is unchanged. OAuth PKCE remains configured.
- iOS: custom Capacitor Keychain plugin with WhenUnlockedThisDeviceOnly accessibility and a device-bound service. Native errors fail closed; never store auth in plaintext.
- Android: dedicated Capacitor plugin using a non-exportable AndroidKeyStore AES-256-GCM key, a fresh IV and authenticated per-item key name; ciphertext lives only in private SharedPreferences excluded from backup.
- Legacy native migration writes the previous Supabase session/PKCE verifier into the native vault before deleting old browser and Capacitor Preferences copies. If migration fails, old data stays for retry without being served by the new auth adapter.
- Android backup and transfer disabled, FLAG_SECURE blocks screenshots and app-switcher previews on all screens. This intentionally restricts users from screenshots; use a secure app export/share flow instead.
- iOS opaque cover on inactive scene blocks financial records from app-switcher snapshots.
- Android R8 release minification enabled with Capacitor plugin keep rules; Android debug and unsigned release build CI added; iOS CI installs the committed dependency lock with npm 11.
- Public vulnerability disclosure contact at /.well-known/security.txt.
- Tests cover native vault migrations, failures, plaintext cleanup and native configuration contracts.

## Open security risks and commercial release gates
1. Web sessions remain JavaScript-readable, not an HttpOnly/SameSite server-side cookie architecture. Implementing a BFF, CSRF checks, secure refresh and authenticated regression tests is a separate migration. Do not mark PDF item 5 complete.
2. An exploited WebView/XSS can still access tokens once the trusted JS runtime reads them. Harden script/CSP/content sinks and perform XSS and dependency analysis.
3. The iOS movo://auth-callback custom scheme remains. Verified HTTPS Universal/App Links require Apple Team ID, signed Associated Domains entitlement, Android release signing SHA-256 certificate fingerprint and hosted AASA/assetlinks. Android native OAuth return remains unverified.
4. No server-enforced App Attest or Play Integrity yet; add only with platform ownership, attestation keys, replay/rotation design and device test coverage.
5. Twelve authenticated-callable Supabase SECURITY DEFINER financial functions need staged two-user negative authorization testing. Presence of auth.uid or search_path does not establish ownership of linked records.
6. Passkeys and account MFA, remote session revocation, login alerts, broad user/IP API rate limits and native biometric policy are incomplete.
7. Apple simulator and Android debug/release CI must pass. Signed device tests still required for Keychain/Keystore accessibility, session migration, logout, OAuth callback, app-switcher privacy, Android screenshot restrictions and native installation upgrades.
8. Native backup disabled does not retroactively remove historical old-app backups. In an incident revoke affected Supabase sessions, protect reset flows and require reauthentication.
9. Full dependency tree has development tool vulnerabilities, distinct from a zero-warning production-only npm audit; keep supply chain inventory updated.
10. Android FLAG_SECURE blocks screenshots by design, including QR sharing; accessible in-app export is recommended.

## Reliability and rollback
- No changes to Supabase schemas, finance data, RLS, privileged functions, store purchase rows or secrets.
- Web production behavior remains unchanged; the server host and auth flows are still the same.
- Rollback: reverting code is possible but would return native auth to insecure Preferences storage. Do not deploy an older native release without a managed sign-out/security migration plan.
- Keep branch unmerged if native builds, tests, migration logic or same-commit documentation checks fail.

## Evidence
- Isolated Vercel Sandbox: movo-22-point-security-audit-20261106, exact main source SHA 9c423c7.
- Initial 17 focused native storage and privacy tests passed; remaining full tests/build and native CI results are required before merge.
- This work is security hardening, not a penetration-test certification or claim of a fully secure app.
