# MOVO offline financial ledger encryption — 2026-11-13

## Precommit progress and scope

Request: harden `offlineWorkspaceStore`, `localFinanceStore`, and the `hybridLocalStore` IndexedDB accounting/outbox without losing any unsynced records. This is **a separate stacked PR** targeting the existing PR #289 branch, not production/main. PR #289 already adds the native Keychain/Keystore read-cache key and a dedicated finance read-cache encryption path.

Inspected exact upstream PR #289 head `b739bd68de28a32d9cb50b83329d10aa14765729`, base main `2b9a1cf7720043c48c20d37d6f64e45e9f5e272a`, all 3 storage implementations, their App/finance/hybrid recovery call sites, iOS and Android key allowlists, startup, and regression tests.

### Implementation before commit

- **Synchronous app-level encryption**: include pinned, audited `@noble/ciphers@1.3.0` (MIT; npm integrity locked). XChaCha20-Poly1305 with fresh 192-bit random nonce, 256-bit key, authenticated additional data binding each ciphertext to storage type/key, owner ID, record/operation and field. This preserves MOVO's synchronous success/failure semantics in guest-wallet and account-workspace writes instead of returning optimistic success before async encryption.
- **Key derivation (no server secret)**: on iOS/Android derive a different 256-bit ledger key using HKDF-SHA-256 from PR #289's device-bound, Keychain/Android Keystore-stored random finance-cache seed. On web, derive the ledger key using an HMAC-SHA-256 CryptoKey created non-extractable and stored in IndexedDB (atomic first-creation across tabs). Only the derived key lives in JS memory. A persisted marker and existing ciphertext checks block silent rekey when a vault entry is missing.
- **Guest/owner localStorage**: seal `movo.local.accounts.v1`, `movo.local.transactions.v1`, `movo.offline.workspace.v2.<owner>` via `loadFinanceJson/saveFinanceJson`. No plaintext fallback on crypto/auth failure. Validation, last-confirmed ancestors, pending deletion tombstones and status flags remain semantically identical. A failed save returns false, and unreadable workspaces throw instead of appearing as empty, preventing accidental data overwrite.
- **Legacy upgrade**: before customer App render, migrate each plaintext localStorage or legacy Capacitor Preferences entry. Verify encrypted local write and decrypt round-trip; on native, persist and verify ciphertext in Preferences. If native/local copies diverge, retain the old native entry in an encrypted recovery capsule before replacing. No old journal/guest entries are intentionally cleared.
- **IndexedDB atomic migration**: in one `readwrite` transaction spanning `records`, `operations`, `metadata`, use cursor updates to encrypt only sensitive `record`, `payload`, `acknowledgement` and `legacyBackup` fields. Keep key paths, owner/group indexes, operation ID, sequence, revision, status, approval, lease generation and tombstones intact. If encryption fails partway, abort the **entire** transaction; do not partially migrate.
- **Runtime IndexedDB reads/writes**: transform sensitive fields at every store `put/add` and unseal at `request()` boundaries, including direct acknowledgements, claim/requeue, reconciliation, recovery backups, batch imports and rejections. If decryption fails inside a readwrite transaction, abort it.
- **Native startup**: generic native restore skips these sensitive legacy localStorage keys; the dedicated migration restores them in encrypted form. Newly written ciphertext is mirrored to Preferences, never the unencrypted financial payload.
- **Locked-state UX**: block customer App rendering if the encryption key or migration cannot be validated; show a clear explanation not to uninstall/clear data. Never display an empty wallet or acknowledge a transaction save while the vault is unavailable. Owner portal remains isolated.
- **Tests**: crypto tampering / owner+field substitution, random nonces, guest/wallet encryption, quota failure/retention, safe local migration, atomic IndexedDB rollback after simulated mid-transaction failure, pending outbox idempotency and cross-account isolation, and existing 225+ suites.
- **Security boundary**: application encryption protects stored payloads, not an unlocked device compromised by malicious same-origin JS, malicious extensions or XSS. Browser nonextractable CryptoKey prevents raw export, but script running on the same origin may still invoke it. Account/storage IDs and lease/sequence metadata remain plaintext for indexing/atomicity.

### Available isolated tests / environment

- Tried to provision an ephemeral Vercel sandbox scoped to the MOVO project. Vercel returned HTTP 402 `payment_required`. No plan, billing, team settings or production environment was modified. Use OpenAI-isolated Python checks and GitHub's disposable CI instead.
- Independent Python authenticated-encryption check: test round-trip and owner/AAD rejection passed. This is a separate cryptography-property check, **not** proof of MOVO JavaScript correctness; CI must run the actual JS implementation and native compilation.
- Initial branch commit is only after this document and `docs/PR_PROGRESS.md` are included. Exact-head CI, unsigned Android debug/release, iOS simulator build, Vercel preview and on-device migration acceptance must be rechecked.
- Stacked PR must remain open. Do not merge #289 or this PR, deploy, publish mobile releases, or apply database migrations.

### Migration and rollback / acceptance gates

1. Preserve and export *unsynced* records on an expendable test device **without uninstalling or clearing storage**; upgrade the native binary that has PR #289's secureKey allowlist; verify guest/owner rows, offline baselines and tombstones remain correct.
2. Force-restart offline after migration: records still appear, pending operations retain identical IDs and order, no duplicates or false success. Simulate a quota error, corrupt ciphertext, lost Keychain/Keystore key, and interrupted IndexedDB transaction. No data should be wiped.
3. Test mixed-version two-tab behavior (old tab vs new encrypted storage) and account switch; block unsafe downgrade/rollback on real devices. Downgrading to older binaries cannot read new ciphertext; cloud records survive, but unsynced local records are endangered by a downgrade. **Do not roll back native builds by uninstalling or clearing storage.**
4. Test in-app import, edit, delete, restore, transfer, payment, logout, owner change, reconnect, and repeated conflict retries. Confirm original rows and receipts survive account migration.
5. For iOS and Android, verify new signed builds and real-device vault accessibility (including app update with old Preferences backups, low-storage and device locked conditions). Sandbox/web CI cannot substitute for real hardware.
6. Confirm native Preferences can lag asynchronous ciphertext mirroring after a local save; durable localStorage is the synchronous acknowledgment. If device WebView data can be purged before Preferences mirroring finishes, a separate native synchronous durability hardening may still be necessary.
7. Legal/store privacy disclosures should be reviewed if encryption claims or backup behavior are changed in public copy; no legal documents automatically changed because actual release still requires on-device verification.

### Out of scope / unresolved risks

- `movo.preferences.v3` can carry some budget/subscription/planning data, and account QR caches/receipt/attachment offline blobs may use other stores; these are NOT covered by the three requested stores. A broader inventory and separate migration are needed before declaring every offline financial datum encrypted.
- Encrypted localStorage remains exposed to **active** XSS if script can access in-memory encryption logic, and browser-based HMAC keys have origin-profile isolation limitations.
- This stacked branch depends on PR #289's approved iOS/Android crypto key allowlist and read-cache-key generation. Merging in reverse order would break native boot. Release gate forbids doing so.
