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

## CI runner compatibility follow-up
- PR #227's first Android job failed during the SDK setup action, before any application compilation: setup-android@v3 attempted sdkmanager tools, and the current repository no longer contains package 'tools'.
- Updated the workflow to rely on GitHub ubuntu-latest's already-installed Android SDK command-line tools and to install platforms;android-36 / build-tools;36.0.0 explicitly. Retry debug and unsigned release compile. This correction changes no production financial data or native auth behavior.

## Android CLI path follow-up
- Second PR #227 Android job failed before compilation: sdkmanager not present on default PATH in ubuntu-latest after removing the obsolete setup action. Android command-line tools were present in the previous runner under ANDROID_HOME/cmdline-tools.
- Adjusted workflow to discover sdkmanager by absolute path from ANDROID_HOME and invoke it explicitly. No app, data, or native-auth code changed. Require another native CI run before merge.


## Follow-up: Native phone-automation device credentials (same PR)
- Audit of the exact PR #227 head found that the autoLogKey device credential was excluded from cloud sync but was still embedded in the local preferences JSON, which native startup mirrored into ordinary Capacitor Preferences. This is a separate device credential from the Supabase session and can authorize Shortcut/notification transaction logging.
- Added src/lib/nativeAutomationKey.js as a device-only Keychain/Keystore-backed key store. Extended iOS and Android vaults to accept only the fixed reserved automation key name in addition to supported Supabase session keys. The value is never copied into general native preferences on new writes. Native React startup loads the protected key into process memory before rendering.
- Legacy migration writes the autoLogKey into the native vault before removing it from WebView localStorage and the mirrored Capacitor preferences record. On vault or cleanup failure, automation stays inactive and does not read the legacy secret into app state. A following launch can recover from the durable device key and retry cleanup.
- Updated App preferences persistence to strip autoLogKey on native, without affecting existing web preferences. The code restores the device-only key even when the general preferences cache is empty or corrupted. Web storage architecture is unchanged and still requires a separate threat-modelled session/credential design.
- Device-key rotation now durably saves a replacement before sending the revocation request for the prior key. If revocation fails, it attempts to restore the previous protected key and does not activate the replacement. Native vault failure prevents rotation.
- New tests cover legacy migration, conflicting cached/secure values, missing WebView cache with an older Capacitor mirror, interrupted secure writes, failed key-vault reads, interrupted cleanup, native storage scrubbing, and unchanged browser behavior; tests also assert the native plugin key allowlist and preference serialization.
- Residual concern: JS still temporarily handles the automation credential to register the Shortcut, and the external Shortcuts recipe necessarily contains the secret. This design reduces at-rest storage exposure; it does not protect against an already compromised WebView or user-exported Shortcut. Restrict device-token permissions on the server and provide revocation controls.
- No production database rows, device registrations, live auth tokens, Supabase settings, or secrets were changed. The PR remains draft until exact-commit CI and physical-device upgrade testing.
