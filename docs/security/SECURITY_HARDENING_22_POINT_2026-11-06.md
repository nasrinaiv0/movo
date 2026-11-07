# MOVO — 22-point security hardening cross-check

Source: App Security Hardening & User Trust Checklist, pages 1–4.
The PDF checkboxes are empty. This is MOVO code evidence, not the PDF asserting compliance.
Audit base main 9c423c7; native changes staged until compiled and reviewed.

| # | PDF control | State on security branch | Evidence / remaining gap |
|---|---|---|---|
| 1 | Account MFA and passkeys | GAP | Existing local app lock is not account MFA |
| 2 | OAuth with PKCE | PARTIAL | Supabase PKCE configured; real Android callback not verified |
| 3 | Password Argon2id/bcrypt | NOT APPLICABLE YET | OTP/OAuth; managed Supabase auth |
| 4 | BOLA/IDOR ownership | PARTIAL | 28/28 public tables RLS; 12 financial privileged RPCs need negative user tests |
| 5 | HttpOnly web sessions | GAP | Supabase web session JavaScript-readable |
| 6 | CSP/CORS | PARTIAL | Headers present; broad connect sources and API origin checks need review |
| 7 | CSRF | CONDITIONAL | Bearer auth; cookie conversion requires CSRF defense |
| 8 | Native Keychain/Keystore | STAGED | Device-only Supabase and automation-key vaults; physical-device sign-off pending |
| 9 | Device-only auth values | STAGED | iOS WhenUnlockedThisDeviceOnly; AndroidKeyStore non-exportable key; automation token migrated |
| 10 | JS bridge/dynamic code | PARTIAL | No eval found in examined app; native bridge tests pending |
| 11 | Device attestation | GAP | No App Attest/Play Integrity server integration |
| 12 | TLS and pinning | PARTIAL | TLS 1.3/HSTS, no certificate pinning |
| 13 | Verified mobile links | GAP | Custom-scheme OAuth; requires Apple and Android signing identities |
| 14 | Binary/WebView hardening | STAGED | Android R8 rules, native release build CI |
| 15 | TLS/HSTS/encryption | PARTIAL | Web verified; managed DB and backups not independently attested |
| 16 | Queries and schemas | PARTIAL | Supabase queries and selective body validation, no uniform schema gate |
| 17 | Rate limiting | PARTIAL | Automation RPC throttling, broad API/OTP limits not proved |
| 18 | Secrets/automatic scanning | PARTIAL | Production npm audit clean, code scans and dependency monitoring incomplete |
| 19 | Error privacy/screen masking | STAGED | iOS opaque cover, Android FLAG_SECURE and generic API errors |
| 20 | Session dashboard | GAP | No remote session revoke UI |
| 21 | Biometrics | PARTIAL | iOS and browser local app lock; Android native biometrics not validated |
| 22 | Alerts/deletion/security.txt | PARTIAL | Self-service deletion; staged disclosure policy, missing login email alerts |

Live Supabase read-only findings: all 28 public tables RLS-enabled; 12 authenticated SECURITY DEFINER warnings, one deny-all RLS mapping table, leaked-password protection disabled. No independent two-user exploit test performed.

Absolute security cannot be certified. Device testing, adversarial permission testing, review and patching must continue after every release.

## Additional device-key finding
PR #227 originally protected Supabase refresh tokens but continued mirroring the phone-automation device credential in the general settings object. The follow-up moves this separate transaction-logging secret into the same native vault, removes it from general persisted preferences, and preserves the legacy key only until write-before-delete migration succeeds. Native executable and signed-device tests remain necessary; do not equate successful static tests with hardware-backed validation.

## 2026-11-08 security re-audit addendum

The original 22-point assessment above remains historical. For current severity, evidence and gating, see **`docs/security/PR227_GAP_AUDIT_2026-11-08.md`**. This follow-up confirms 28/28 public tables with RLS, 12 authenticated-executable privileged financial functions requiring real two-user negative tests, Android native compilation passed, iOS job canceled, an exact PR-head Sandbox pass (644 tests), and merge conflicts with the 34-commit-newer `main`. The native cleanup helper currently swallows legacy storage deletion errors; never assert guaranteed removal of plaintext copies. Branch protection is currently disabled on `main`. Release remains blocked.
