# MOVO — User Data Security & Privacy Assurance

**Status:** Evidence-based technical and user-facing disclosure; **not a security certification**  
**Review date:** 13 November 2026 (Philippine Time)  
**Product:** MOVO — Money Organizer & Visual Outflow  
**Repository:** [nasrinaiv0/movo](https://github.com/nasrinaiv0/movo)  
**Production main audited:** `2b9a1cf7720043c48c20d37d6f64e45e9f5e272a`  
**Encryption hardening under review:** [PR #289](https://github.com/nasrinaiv0/movo/pull/289), [PR #290](https://github.com/nasrinaiv0/movo/pull/290), and this follow-up PR  
**Support and privacy requests:** support@nasrinai.com  
**Public notices:** [Privacy](https://movo.nasrinai.com/privacy) · [Terms](https://movo.nasrinai.com/terms)

> **Trust statement** — MOVO is designed to safeguard user-entered financial records with account authentication, user-scoped database access controls, protected server credentials, HTTPS/security-header configuration, controlled deletion, and tested isolation of financial operations. Application-level encryption of additional offline records is being strengthened through staged changes. These practices reduce risk; they do not eliminate all risks, and some improvements are **not yet included in the production app**.

## 1. What data MOVO handles

MOVO is a **personal finance organizer, not a bank**. It does not hold a customer's deposits or independently move money between banks. It stores information that users manually enter, import or authorize: bank/e-wallet account labels, balances and cards, transactions, categories, bills, debts, budget and savings plans, subscriptions, and optionally receipt/QR images. Cloud mode uses Supabase; local mode persists on the device. It may process account email and sign-in metadata. Optional phone automations can submit payment details. Optional AI assistance may share limited finance context with an AI service only under the feature's disclosed consent flow. Stock/FX data, third-party icons and payment links may contact outside providers.

**Never enter:** bank-account passwords, card PINs, CVVs, one-time login codes or other unnecessary authentication secrets into MOVO notes, chat, receipts or support requests.

## 2. Security architecture and evidence

| Layer | What is in place | Evidence and status | Limitations |
|---|---|---|---|
| **Cloud access isolation** | Supabase Row-Level Security and user-owner predicates on financial accounts, transactions, budgets and selected AI records. Authenticated SQL policies include matching `USING` and `WITH CHECK` owner predicates. | **Verified against production metadata, 13 Nov 2026:** **44/44** public base/partition tables have RLS enabled. Reviewed `financial_accounts`, `transactions`, `budgets`, `movo_ai_conversations`, and `movo_ai_messages` policies. No public views were returned. | RLS being enabled does not prove all RPCs, roles, policies and cross-table paths are safe; test with multiple real test accounts before release. |
| **Authentication** | Supabase Auth; server code obtains user identity from a validated token, not from untrusted browser fields. Owner console has an explicit owner-ID allowlist and checks AAL2 (MFA) before privileged operations. Native auth storage uses iOS Keychain or Android Keystore in applicable native builds. | Code: `src/lib/nativeSecureAuthStorage.js`, `api/owner/index.js`, auth tests. | Google/email sign-in and device-vault behavior require physical Android/iOS testing. Local convenience app lock is not an alternative to server authentication. |
| **Protected server credentials** | Service-role and provider secrets are read server-side, not embedded in the browser's publishable-key settings. Dedicated build/security tests check for leaked mobile secrets. | Code: `api/log.js`, `api/owner/index.js`, `api/nasrinai/chat.js`; security CI. | Misconfigured external secrets or API access still need operational monitoring and rotation procedures. |
| **Transport and browser hardening** | Vercel configuration includes HSTS, CSP, frame-blocking, `nosniff`, referrer and permissions policies. Sensitive JSON API responses commonly use `no-store`. | Code: `vercel.json` and named API handlers; preview/build tests. | CSP currently permits broad external `https:`/ `wss:` connections and media images; tightening requires a verified inventory of approved hosts. Actual production HTTP headers need a live probe. |
| **Financial transaction safety** | Durable local operations, transaction ordering, idempotency, owner checks and approval/reconciliation logic reduce accidental duplicate or cross-owner posts. | Source: `hybridLocalStore.js`, `hybridFinanceWriter.js`; exact-head tests on PR #290: **227 suites / 1,368 tests passed**; PostgreSQL tenant isolation and hybrid security jobs passed. | Passing unit/isolated tests does not prove every device, network interruption or live banking scenario. |
| **Device cache encryption** | AES-256-GCM for finance read cache using native vault-backed keys or non-extractable web keys. | **Staged only:** PR #289, NOT merged or live. | Older versions may still store offline read-cache data in plaintext. |
| **Wallet and ledger encryption** | XChaCha20-Poly1305 with authenticated owner/record binding; native HKDF key separation and browser non-extractable WebCrypto; encrypted guest wallet/workspaces and IndexedDB outbox with atomic migration. | **Staged only:** PR #290, NOT merged or live. Web and Android CI green. | iOS simulator and actual upgrading devices have NOT yet proven migration durability. Browser XSS can still access decrypted data when running within a trusted unlocked session. |
| **Offline QR cache** | QR images are sealed with authenticated encryption; existing PNG data URLs migrate in a single all-or-nothing IndexedDB transaction. | **Staged in this follow-up PR:** `src/lib/accountQrLocalStore.js`, `src/lib/accountQrEncryption.test.js`. | Not live until merged/released; poor storage health or invalid legacy QR bytes can interrupt the safe upgrade. |
| **Account deletion** | Self-service authenticated deletion workflow with scoped storage cleanup, backend user deletion and cascade checks. | `api/account/delete.js`, `src/lib/accountDelete.test.js`, [account-deletion page](https://movo.nasrinai.com/account-deletion.html). | Service backups, audit/legal retention and secondary local devices may have separate retention/clearing needs. |
| **Privacy and optional integrations** | In-app consent for optional AI financial context; server sanitization and bounded payloads; explicit terms and privacy notices. | `api/nasrinai/chat.js`, `public/privacy.html`, `public/terms.html`. | External AI/market/favicon vendors may receive network metadata or user-consented content; third-party retention differs from MOVO. |
| **Mobile storage and backup** | Android manifest disables ordinary app backups and data extraction; native secure auth store uses platform key protection. | `android/app/src/main/AndroidManifest.xml`, `android/app/src/main/res/xml/data_extraction_rules.xml`, platform plugin sources. | Device OS/platform security and physical-device regression tests remain critical. |

### Why multiple layers matter

1. **Identity checks** establish which user is making a request.
2. **Row-Level Security** limits access to authorized cloud records even when a client sends an arbitrary ID.
3. **Authenticated encryption** makes applicable offline payloads unreadable if the stored bytes are copied without the key, and detects tampering.
4. **Atomic journal writes** reduce the chance that a failed sync or interrupted upgrade loses a pending transaction.
5. **Limits and isolation tests** detect regressions before production deployment.
6. **Privacy controls** let people decide when optional AI data flows occur and how to request their records.

No single layer guarantees complete security, and none should be presented as an independent certification.

## 3. What has been independently verified for this review

- **Production Supabase metadata:** 44 of 44 public base/partition tables show `relrowsecurity=true`. Sensitive example policies limit rows to `auth.uid() = user_id` with authenticated role checks. The four payment/reminder tables with `anon` table-level SELECT privilege were inspected: their RLS policies apply **only to authenticated users** and compare the user ID, so the table-level GRANT alone is not evidence of public row visibility. No public SQL views were found in this scan.
- **Security-advisor findings are NOT zero:** 15 `SECURITY DEFINER` functions are callable by `authenticated` users and require individually reviewed authorization semantics; 15 RLS-enabled tables have no user policies, which generally blocks direct client access but should be documented as intentional; Supabase Auth's **leaked-password protection is reported as not enabled**.
- **Production deployment:** main `2b9a1cf…` is **READY**, and is unchanged while the encryption PRs remain open. There is no verified production deployment of the new offline encryption path.
- **Staged PR #290 exact-head `57a50370…`:** full Jest regression **227/227 suites, 1,368/1,368 tests**, TypeScript and web production build passed; finance tenant isolation, hybrid accounting security, IAP integrity and Android native debug/unsigned release compilation passed; Vercel preview READY. The earlier PR #289 iOS simulator launch timed out, and the #290 iOS workflow had not completed at the prior checkpoint. New QR changes require fresh CI.

These findings are a **point-in-time inspection**, not continuous monitoring or an independent penetration test.

## 4. What MOVO cannot guarantee

- No platform can promise zero risk, zero breach probability or absolute recovery of locally stored data.
- A stolen unlocked device, browser extension, compromised OS or malicious JavaScript running on MOVO's origin may access plaintext while the app is legitimately using the decryption key.
- A lost secure-store key or deleted browser profile can make locally encrypted, **unsynced** records unrecoverable. Uninstalling the app or clearing storage is not a safe repair for migration failures.
- Downloads, screenshots, CSV backups, custom stickers, app preferences, third-party networking and cloud backups may have different protections from the encrypted finance ledger.
- Earlier native/web versions may have written some records as readable JSON before the app-level encryption upgrade. Updating the app and completing its migration are necessary before claims about that storage apply.
- HTTPS protects network connections in transit when properly configured, but does not automatically encrypt every device, file export, provider log or third-party cache.
- MOVO is **not represented** as SOC 2 audited, ISO 27001 certified, PCI DSS certified, independently penetrated, or legally compliant in every jurisdiction merely because these controls exist.

## 5. Current security work still required before a safety certification or release

| Priority | Required action | Why it matters |
|---|---|---|
| **P0 — do not release encryption yet** | Verify iOS simulator compilation/launch and signed iOS/Android old-install migration on expendable devices containing pending transactions, including force-close, no network, quota errors, keychain failure, cross-account and rollback. | Protects real unsynced financial data and app availability. |
| **P0 — privileged database functions** | Review the 15 callable `SECURITY DEFINER` functions for strict `auth.uid()` validation, ownership, `search_path`, execute grants, idempotency, and multi-user abuse. Do not blindly revoke functions used by accounting. | These functions can bypass normal RLS by design. |
| **P1 — credential quality** | Review whether password sign-in is enabled; if it is, enable and test Supabase leaked-password protection in the console. | The live advisor reports this security setting as needing attention. |
| **P1 — browser external origins** | Inventory approved API, icon, media, AI, voice and OAuth hosts; narrow `connect-src` and `img-src` without disabling integrations. | Reduces potential exfiltration paths if an XSS vulnerability occurs. |
| **P1 — local storage inventory** | Audit finance-like amounts inside `movo.preferences.v3`, media caches, custom stickers, receipts and all exports. Encrypt where justified; use explicit consent/retention for artifacts. | Three-store encryption is not whole-device encryption. |
| **P1 — resilience** | Test quota failures, offline conflict recovery, encrypted native Preferences mirroring order, deliberate sign-out, key loss and account deletion. | Guards against silent data loss and unintended retention. |
| **P1 — compliance operations** | Confirm data processor agreements, cross-border transfers, breach-response contacts/timing, consent evidence, retention schedule, Apple/Google disclosures and Philippines Data Privacy Act obligations with qualified reviewers. | Code alone does not establish statutory or store-policy compliance. |
| **P2 — assurance evidence** | Schedule independent application penetration tests and periodic infrastructure/security-advisor reviews; document remediation and incident tabletop exercises. | Moves security claims from development tests to independent assurance. |

Supabase security-advisor references: [Definer functions](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) · [RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) · [Compromised-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## 6. What users can do

Use your own device, enable its screen lock, protect email and store accounts, and do not share bank login credentials with MOVO. Review any import, transaction and AI suggestion. Export an additional copy of critical transactions (stored securely; exports themselves are readable files). Avoid uninstalling or clearing the app while a local sync is pending. Use **Settings → Delete Account** and the public privacy contact channel for requests. Be aware that clearing local storage can permanently erase local-only data.

## 7. Public-facing wording approved by this technical review

> **MOVO is built with privacy and financial data protection in mind.** We use authenticated access, user-specific database rules, secure connections, protected server credentials and tested transaction safeguards. Newer supported versions also use application-level encryption for selected offline records after their migration is complete. No system is risk-free, and security protections depend on the app version, device and features you use. We recommend protecting your device and keeping a secure copy of important records. Read our Privacy Policy for details.

**Do not publish** stronger statements such as “100% secure,” “bank-grade verified,” “end-to-end encrypted,” “fully encrypted everywhere,” or “certified compliant” unless independently substantiated.

## 8. Engineering change log / document provenance

This report belongs to the dedicated stacked follow-up PR based on #290, which itself depends on #289. It accompanies:
- `src/lib/accountQrLocalStore.js`: seal QR PNG data URLs at rest, authenticate cache-entry IDs, migrate old data in one IndexedDB transaction.
- `src/lib/accountQrEncryption.test.js`: offline QR encryption, cross-entry tampering, recovery and atomic rollback.
- `src/index.tsx`: complete QR migration before the normal customer app mounts.
- `public/privacy.html` and `public/terms.html`: version-dependent local encryption disclosures that do not claim absolute security.
- `public/security.html`: accessible user-facing security explanation.
- `src/lib/securityAssuranceContracts.test.js`: protect essential security/documentation invariants in CI.

**Safe release sequence:** review and validate PR #289 → review and validate PR #290 → review and validate this PR → verify platform/app-store/legal declarations and signed device migration → separately authorize merges, store publication and production deployment. No direct Supabase/Vercel production mutation is authorized by this document.

### Source references

- [Supabase Row-Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Database Advisor](https://supabase.com/docs/guides/database/database-linter)
- [OWASP HTML5 localStorage guidance](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [Philippines National Privacy Commission](https://privacy.gov.ph/)
- [MOVO encryption PR #289](https://github.com/nasrinaiv0/movo/pull/289)
- [MOVO encryption PR #290](https://github.com/nasrinaiv0/movo/pull/290)

---
*Reviewed on 13 November 2026. Security evidence, configuration, plan access and app behavior can change. This page is not a legal opinion, external certification, financial guarantee or a promise of perfect security.*
