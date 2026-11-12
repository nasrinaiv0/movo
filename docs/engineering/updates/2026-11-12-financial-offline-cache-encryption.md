# MOVO offline financial read-cache encryption — 2026-11-12

## Owner request and progress documented before commit
- User asked to fix an audit finding: financial lists in `src/lib/offlineReadCache.js` were persisted as readable JSON in `localStorage` and silently mirrored into Capacitor Preferences on mobile.
- Inspected exact main commit `2b9a1cf7720043c48c20d37d6f64e45e9f5e272a`, native Keychain/Android Keystore adapters, the restore mirror, read-cache callers, financial sync architecture, and tests before preparing these changes.
- Decided to separate the **read-only offline list cache** from the *authoritative* offline workspace and IndexedDB pending-write ledger. Mixing synchronous financial writes with asynchronous encryption in one quick patch could lose unsynced accounting records. No such destructive change is made.

## Implementation changes
1. `src/lib/financeCacheCrypto.js`: encrypt each financial-list payload with AES-256-GCM and a fresh random 96-bit nonce, using owner ID + list key + format version as authenticated additional data. Strict format and size checks; no plaintext fallback when the key, browser crypto, or storage cannot be accessed.
2. Native iOS and Android allowlist exactly `movo-finance-cache-key-v1` for the existing device-only vault. A random 256-bit read-cache data key is stored through iOS WhenUnlockedThisDeviceOnly Keychain or Android Keystore-backed AES/GCM; it is NOT persisted as plaintext in Preferences or browser localStorage. Read back after first write before accepting. Native is still exposed to active compromise of a running JS context, which this patch does not claim to prevent.
3. Web: WebCrypto generates a non-extractable AES-GCM key stored with structured cloning in IndexedDB. If IndexedDB/key is unavailable and ciphertext already exists, ciphertext is never replaced with a fresh-key blob. Web crypto is **not** strong protection against an active same-origin XSS or a stolen/unlocked browser profile: a hostile script can use the stored CryptoKey. No password-based or hardware-backed browser key is claimed.
4. `offlineReadCache.js`: cloud-first list reads save only authenticated ciphertext. On network failure, decrypt cache only after confirming the active session's account. Denials/plan errors never use stale cache. Serialize concurrent writes per key.
5. Non-destructive migration: read legacy plaintext only for the verified owner; AES-GCM-encrypt it and read-verify the stored value, **then** remove mirrored old Capacitor Preferences and verify scrub. Interrupted write, failed cryptography, storage quota, or failed scrub leaves the old copy recoverable and does not return it as a downgrade. A subsequent read retries. Background startup sweep migrates rarely accessed lists after initial render; no blocking splash and no eager deletion.
6. `src/lib/native.js`: specifically exclude `movo.readCache.v1:` keys from ordinary Preferences restoration/mirroring, preventing new cache plaintext and ciphertext duplication. Older local wallet/workspace mirroring is untouched pending a separate non-destructive migration.
7. Add and update tests: Web encrypted output, offline round-trip, tampering, account/list swaps, server denials, legacy migration, quota/crypto failure, native Keychain/Keystore wrapped-key calls, Preferences cleanup and retry; static contracts for both native allowlists. Jest TextEncoder/Decoder polyfill applies to Jest only.

## Security, data and release implications
- **No Supabase migration, API change, cloud data modification, auth credential rotation, billing change, production update, or Google Play/App Store publish.**
- Native plugin allowlist changes require a **new signed iOS/Android binary**. Older app binaries will not support the new vault key; they keep their old bundled web logic until updated.
- **Backward compatibility limitation:** downgrading an app to older code after it has encrypted a read-only list will make that one cached list unreadable offline. Online financial records still live in Supabase; do not clear device storage to fix a failed migration.
- **Key loss:** if Keystore/Keychain or IndexedDB key is missing, encrypted lists remain untouched; the app must sign in online to rebuild a cache. Do not silently regenerate a key while ciphertext exists.
- **Rollback:** revert application/native changes on PR branch only. Never delete backups, force-clear local records, overwrite production, or assume new ciphertext can be read by old code.
- **Account isolation:** authenticated AES-GCM binds ciphertext to both account and logical list. This does not replace Supabase RLS or prevent deliberate XSS.

## Remaining high-priority financial-data storage gaps — not falsely claimed fixed
- `src/lib/offlineWorkspaceStore.js` stores baseline, working records, and pending deletion/tombstone rows as readable `movo.offline.workspace.v2.*` JSON. It has a **synchronous** load/save API used by live accounting UI.
- `src/lib/localFinanceStore.js` keeps guest account/transaction arrays as readable JSON.
- `src/lib/hybridLocalStore.js` stores signed-in financial ledger and pending operations in IndexedDB without application-layer encryption. This outbox is accounting-critical and requires atomic verified migration.
- `src/lib/native.js` continues to mirror some of those legacy financial keys into Preferences, so do not certify MOVO's **entire offline dataset** as encrypted. A later migration must preserve pending changes/tombstones and support interrupted upgrades, two-device ownership, and old binary compatibility.
- OWASP guidance on localStorage and IndexedDB: https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html

## Tests before / after commit
- Before commit: reviewed read-cache, native plugin allowlist, migration and sync paths; independent Python AES-256-GCM sanity check passed encryption/decryption, tamper, owner and list AAD tests.
- **Not yet independently proven:** exact-head GitHub Jest/TypeScript/build/i18n/audit, native Android compilation, signed iOS build, real-device encrypted cache persistence, migration on real existing user data, real Android sign-in or background sync. Inspect after PR creation. No claims of approval to merge.
- Rollout gate: stage and verify all automated and real-device checks; keep production unchanged until owner separately approves release.

## Manual acceptance for release
1. On an existing test phone WITH test data, back up unsynced local transactions; update without uninstalling or clearing storage. Confirm the old list migrates to ciphertext with no plaintext Preferences copy.
2. Go offline, force close/reopen, confirm loans/bills/goals/budgets display for the same verified account. Confirm a different account and signed-out mode see none.
3. Block native vault temporarily in test build: a failed read must retain the ciphertext/legacy bytes, not wipe financial records.
4. Simulate local quota and migration interruption. Verify encrypted copy is never replaced by plaintext and unsynced IndexedDB operations remain intact.
5. Test web Safari/Chrome with non-extractable CryptoKey persistence, tamper, and loss of IndexedDB key. Document browser-origin/XSS limitation.
6. Verify Android native debug/release compilation, iOS native compilation, app bundle signing, CI and Vercel **preview** before any production action.
