# MOVO user-data assurance, privacy disclosures & QR cache encryption

**Review date:** 13 November 2026  
**Status:** Draft stacked follow-up to PR #290 (which depends on PR #289); no release approval.

## Scope and evidence gathered before commit

1. Read the exact PR #290 head `57a50370f5785bbc43487239558005f267df28a5`, Vercel `vercel.json`, user-facing Terms/Privacy, sensitive API authentication paths, native Keychain/Keystore and Android backup declarations, and `accountQrLocalStore`.
2. Verified production Supabase metadata **read-only**. Of 44 public application tables returned, all 44 have RLS enabled. Spot-checked authenticated `auth.uid() = user_id` policies including financial accounts, transactions, budgets and AI records. Four payment/reminder tables allow an `anon` schema/table-level SELECT grant but have **authenticated-only owner RLS policies**; this alone did not establish anonymous row exposure. No public SQL views returned.
3. Queried Supabase security advisors without changing database: `authenticated_security_definer_function_executable` **WARN 15**; `rls_enabled_no_policy` **INFO 15**; `auth_leaked_password_protection` **WARN 1**. Do **not** call database security perfect. See https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
4. Production still READY at `2b9a1cf7720043c48c20d37d6f64e45e9f5e272a`; PRs #289/#290 are open, no production deployment of new finance encryption. PR #290 exact-head `57a50370` passed 227 suites / 1,368 tests, PostgreSQL tenant isolation, hybrid security, IAP integrity, Android native unsigned debug/release compilation, and Vercel preview. iOS queued as of this review; PR #289's iOS simulator smoke previously timed out.
5. Found offline **bank/e-wallet QR image data URLs stored plaintext** in IndexedDB `movo-account-media-v1/account-qr` even though financial ledgers are encrypted in proposed PR #290. User's request justifies closing this additional at-rest gap. No storage deletion or production migration.

## Code changes staged

- `src/lib/accountQrLocalStore.js`: encrypt QR data URLs with finance vault XChaCha20-Poly1305, bind AAD to cache ID, enforce normalized PNG signature/size, never put a readable `dataUrl` into IndexedDB. Authenticated `getLocalAccountQr` rejects altered/swap/malformed ciphertext. Legacy QR data are upgraded with one `readwrite` cursor transaction; simulated failure aborts ALL replacements, keeping recoverable copies.
- `src/lib/accountQrEncryption.test.js`: no plaintext in raw IDB, owner/key swap rejection, idempotent migration, interrupted upgrade atomic rollback, tamper detection, invalid MIME spoofing, and lazy upgrade after older app writes.
- `src/index.tsx`: perform QR migration after the finance vault and journal are verified, before the customer React application mounts. A failure uses the existing non-destructive locked-state UI.
- `docs/security/MOVO_USER_DATA_SECURITY_ASSURANCE_2026-11-13.md`: evidence-based security assurance with verified vs staged matrix, vendor/data-flow disclosures, limitations, risks and source pointers.
- `public/security.html` and Vercel `/security` rewrite: accessible, responsive user-facing safety summary without fabricated certifications or 100% secure claims, dark/light responsive style, restrained motion and reduced-motion support.
- `public/privacy.html` and `public/terms.html`: fix outdated blanket claim that app-level browser financial encryption never exists; replace with version-dependent and data-category-specific wording. This is a **material privacy disclosure change**: legal effective dates and store declarations must be reviewed at release, not silently treated as already effective.
- `src/lib/securityAssuranceContracts.test.js`: regression guard for site security headers, route, honest legal claims, auth/native backup protections and pre-render safe migration order.

## Security caveats, blocking gates and rollback

- This is a **stacked, unmerged** change. New encrypted QR storage relies on PRs #289/#290 native key allowlist and synchronous finance vault. Never merge this follow-up on its own or publish mobile binaries out of order.
- **No data loss intent:** migration changes only QR image payload fields, not cache IDs, last-updated timestamps, financial records, server account state or pending operations. On any crypto/cursor error it aborts the whole IDB transaction. Retrying must not delete old data. Corrupt QR can intentionally block startup rather than cause a misleading empty cache, so manual recovery UX needs physical-device testing.
- Browser and native decrypted data remain accessible to compromised app/session script; offline encryption is not end-to-end encryption. Exports and some other local preferences/assets remain outside this scope.
- Security advisor warnings are not remediated in this PR: do NOT blindly revoke definer-function privileges used by active accounting and billing. Separate SQL authorization review/migrations are required and must be staged with tenant tests.
- Supabase Auth leaked-password protection is an **external console setting** that needs an operator review (particularly if password logins are supported). This PR does not change production Auth configuration.
- Live CSP has broad external origin rules; narrowing without a complete dependency inventory can break social/favicon/media/OAuth. Review separately after staging host inventory.
- **CI required after this commit:** exact-head full Jest, security contract tests, Android compilation, native iOS build/simulator, cloud accounting tests and Vercel preview. CI does not replace signed update/rollback testing on two real phones.
- **Manual release checklist:** securely export unsynced data from a disposable test phone; upgrade app (do not uninstall/clear), validate QR images and finance records offline after force-close, account switch, corrupted cache, full storage, key loss and old-version downgrade. Explicit owner approval required for merges, production deploy, database changes or app-store publication.

## Test status before initial commit

- Static source review and security controls documented, **no new QR integration CI result yet**. Previous parent PR #290 automated tests green. Future logs must reference the exact new PR commit, not inherited parent checks.
- Vercel managed sandbox previously returned HTTP 402 `payment_required`; no billing settings changed or paid environment created. GitHub disposable CI is the available execution platform.

## First-run CI follow-up and repair rationale (documented before repair commit)

On `0c0f04b071a884e2a96f31844390141e3035a503`, Phase 1, hybrid-accounting and Android stopped in Jest with 3 failing suites (226/229 passing, 1,376/1,379 passing). Vercel preview failed; tenant isolation and IAP checks passed. Investigation found (1) test-only invalid PNG fixture in QR migration (validator working as designed), (2) static legal pages manually edited without updating canonical generator, and (3) a potentially flaky existing CSV auto-upload/clean-state wait on a test that passed in parent PR #290.

Changes prepared: valid PNG signature fixture; canonical `src/lib/legalSupplement.json` updated; matching legal-policy generator/date/re-consent logic and expected test version; canonical generated `public/privacy.html` and `public/terms.html` byte-for-byte equality independently verified before commit. NO weakening of ciphertext validation, no changes to financial journal, no production mutation. Keep CSV sync test unchanged for rerun; investigate if repeatable. All gates still required.

