/**
 * MOVO finance vault — at-rest encryption for synchronous local wallet/workspace
 * and the atomic IndexedDB ledger/outbox. XChaCha20-Poly1305 (24-byte CSPRNG nonce)
 * via audited @noble/ciphers. Never use this to protect auth/session tokens.
 *
 * Startup MUST call initialiseFinanceVault() before rendering the customer app.
 * Web: a non-exportable HMAC-SHA-256 CryptoKey lives in IndexedDB. Its derived
 * data key is kept only in memory. Native: HKDF separates this data key from the
 * Keychain/Keystore-protected finance read-cache key. No remote key escrow.
 *
 * Not a defense against active same-origin XSS or a compromised/unlocked device.
 */
import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { MovoNative } from './native';
import { Preferences } from '@capacitor/preferences';
import { isNativeApp } from './platform';
import { CACHE_VAULT_KEY, initialiseFinanceCacheKey } from './financeCacheCrypto';

const VAULT_DB = 'movo.finance.vault.v1';
const VAULT_STORE = 'keys';
const VAULT_ID = 'hmac-sha256-v1';
const KEY_SENTINEL = 'movo.finance.vault.initialized.v1';
const STORAGE_PREFIX = 'movo.finance.sealed.v1:';
const RECOVERY_PREFIX = 'movo.finance.recovery.v2:';
const PREVIEW_RECOVERY_PREFIX = 'movo.finance.recovery.v1:';
const MAX_PLAINTEXT = 8_000_000;
export const SEALED_TAG = '__movo_finance_sealed_v1';
let inMemoryKey = process.env.NODE_ENV === 'test' && globalThis.__MOVO_TEST_FINANCE_KEY__ instanceof Uint8Array
  ? new Uint8Array(globalThis.__MOVO_TEST_FINANCE_KEY__) : null;
let initPromise;

const encode = text => new TextEncoder().encode(text);
const decode = bytes => new TextDecoder().decode(bytes);

function cryptoEngine() {
  const engine = globalThis.crypto;
  if (!engine?.subtle || typeof engine.getRandomValues !== 'function')
    throw new Error('financial_encryption_crypto_unavailable');
  return engine;
}
function base64(bytes) {
  let str = '';
  for (let i = 0; i < bytes.length; i += 0x6000)
    str += String.fromCharCode(...bytes.subarray(i, i + 0x6000));
  return btoa(str);
}
function unbase64(str, maxBytes) {
  // A repeated-group validation regex can exhaust the stack on a large workspace.
  if (typeof str !== 'string' || str.length > Math.ceil(maxBytes / 3) * 4 ||
    str.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(str))
    throw new Error('financial_encryption_invalid_base64');
  const padding = str.indexOf('=');
  if (padding !== -1 && (str.length - padding > 2 || !/^={1,2}$/.test(str.slice(padding))))
    throw new Error('financial_encryption_invalid_base64');
  return Uint8Array.from(atob(str), c => c.charCodeAt(0));
}
function legacyKey(name) {
  return name === 'movo.local.accounts.v1' || name === 'movo.local.transactions.v1' ||
    /^movo\.offline\.workspace\.v2\.[0-9a-f-]{36}$/i.test(name);
}
export function isSensitiveLocalKey(name) { return legacyKey(String(name)); }
export function isSealedFinance(value) {
  return !!(value && typeof value === 'object' && value[SEALED_TAG] === 1);
}
function looksLikeEnvelope(value) {
  return !!(value && typeof value === 'object' && (
    Object.prototype.hasOwnProperty.call(value, SEALED_TAG) ||
    Object.prototype.hasOwnProperty.call(value, 'alg') && Object.prototype.hasOwnProperty.call(value, 'c')
  ));
}
function assertKey() {
  if (!(inMemoryKey instanceof Uint8Array) || inMemoryKey.length !== 32)
    throw new Error('financial_encryption_key_unavailable');
  return inMemoryKey;
}
function verifyAad(scope) {
  if (typeof scope !== 'string' || scope.length < 5 || scope.length > 350)
    throw new Error('financial_encryption_invalid_scope');
  return encode('MOVO-FINANCE-V1|' + scope);
}
export function sealFinance(value, scope) {
  const key = assertKey();
  if (isSealedFinance(value)) throw new Error('financial_encryption_double_seal');
  const raw = encode(JSON.stringify(value));
  if (!raw.length || raw.length > MAX_PLAINTEXT) throw new Error('financial_encryption_payload_size');
  const nonce = cryptoEngine().getRandomValues(new Uint8Array(24));
  const ct = xchacha20poly1305(key, nonce, verifyAad(scope)).encrypt(raw);
  return { [SEALED_TAG]: 1, alg: 'XCHACHA20-POLY1305', n: base64(nonce), c: base64(ct) };
}
export function unsealFinance(value, scope) {
  if (!isSealedFinance(value) || value.alg !== 'XCHACHA20-POLY1305')
    throw new Error('financial_encryption_envelope_invalid');
  const nonce = unbase64(value.n, 24), cipher = unbase64(value.c, MAX_PLAINTEXT + 16);
  if (nonce.length !== 24 || cipher.length < 16 || cipher.length > MAX_PLAINTEXT + 16)
    throw new Error('financial_encryption_ciphertext_invalid');
  const bytes = xchacha20poly1305(assertKey(), nonce, verifyAad(scope)).decrypt(cipher);
  return JSON.parse(decode(bytes));
}

export function sealedFinanceStorageKey(storageKey) {
  if (!isSensitiveLocalKey(storageKey)) throw new Error('financial_encryption_storage_key_invalid');
  return STORAGE_PREFIX + storageKey;
}

function parseLocal(raw, scope, requireSealed = false) {
  let value;
  try { value = JSON.parse(raw); }
  catch { throw new Error('financial_encryption_local_data_corrupt'); }
  if (isSealedFinance(value)) return unsealFinance(value, scope);
  if (requireSealed || looksLikeEnvelope(value))
    throw new Error('financial_encryption_envelope_corrupt');
  return value;
}

function writeVerified(storage, name, ciphertext) {
  storage.setItem(name, ciphertext);
  if (storage.getItem(name) !== ciphertext) throw new Error('financial_encryption_write_unverified');
}

function verifiedEnvelope(value, scope) {
  const sealed = sealFinance(value, scope);
  unsealFinance(sealed, scope);
  return JSON.stringify(sealed);
}

function readLocalCopies(storage, logicalKey) {
  const destination = sealedFinanceStorageKey(logicalKey);
  const scope = 'local:' + logicalKey;
  const encrypted = storage.getItem(destination);
  const legacy = storage.getItem(logicalKey);
  const raw = encrypted ?? legacy;
  const current = raw === null ? null : parseLocal(raw, scope, encrypted !== null);
  if (encrypted !== null && legacy !== null && JSON.stringify(parseLocal(legacy, scope)) !== JSON.stringify(current))
    throw new Error('financial_encryption_legacy_writer_conflict');
  return { destination, scope, current, encrypted, legacy };
}

function settleLegacyStorage(storage, logicalKey) {
  const { destination, scope, current, encrypted, legacy } = readLocalCopies(storage, logicalKey);
  if (legacy !== null) {
    if (encrypted === null) writeVerified(storage, destination, verifiedEnvelope(current, scope));
    // Older open tabs cannot address the encrypted namespace. If they change
    // the legacy value during the upgrade, retain it and stop instead of guessing.
    if (storage.getItem(logicalKey) !== legacy)
      throw new Error('financial_encryption_legacy_writer_conflict');
    storage.removeItem(logicalKey);
  }
  return current;
}

export function loadFinanceJson(logicalKey) {
  return settleLegacyStorage(globalThis.localStorage, logicalKey);
}

export function saveFinanceJson(logicalKey, value) {
  const storage = globalThis.localStorage;
  const destination = sealedFinanceStorageKey(logicalKey);
  // Preserve any prior ciphertext if an older client wrote to the legacy namespace.
  if (storage.getItem(logicalKey) !== null || storage.getItem(destination) !== null)
    settleLegacyStorage(storage, logicalKey);
  writeVerified(storage, destination, verifiedEnvelope(value, 'local:' + logicalKey));
  return true;
}

export function removeFinanceJson(logicalKey) {
  const storage = globalThis.localStorage;
  storage.removeItem(sealedFinanceStorageKey(logicalKey));
  storage.removeItem(logicalKey);
  return storage.getItem(sealedFinanceStorageKey(logicalKey)) === null &&
    storage.getItem(logicalKey) === null;
}

/** Protect sensitive fields, not indexed owner/sequence/lease metadata. */
const FIELDS = ['record', 'payload', 'acknowledgement', 'legacyBackup'];
function fieldScope(entry, field) {
  const owner = String(entry?.ownerId || '');
  const context = entry.id
    ? 'operation:' + String(entry.id) + ':' + String(entry.group || '') + ':' + String(entry.recordId || '')
    : entry.recordId ? 'record:' + String(entry.group) + ':' + String(entry.recordId) : 'owner-metadata';
  if (!/^[0-9a-f-]{36}$/i.test(owner)) throw new Error('financial_encryption_owner_invalid');
  return 'idb:' + owner + ':' + context + ':' + field;
}
export function secureHybridEntry(entry) {
  if (!entry || typeof entry !== 'object') return entry;
  const next = { ...entry };
  for (const field of FIELDS) {
    const current = entry[field];
    if (current === null || current === undefined) continue;
    const scope = fieldScope(entry, field);
    if (looksLikeEnvelope(current) && !isSealedFinance(current))
      throw new Error('financial_encryption_envelope_corrupt');
    if (isSealedFinance(current)) {
      unsealFinance(current, scope); // Reject mismatched / corrupt existing ciphertext.
      continue;
    }
    next[field] = sealFinance(current, scope);
  }
  return next;
}
export function revealHybridEntry(entry) {
  if (Array.isArray(entry)) return entry.map(revealHybridEntry);
  if (!entry || typeof entry !== 'object' || entry instanceof Date) return entry;
  const next = { ...entry };
  for (const field of FIELDS) {
    if (entry[field] === null || entry[field] === undefined) continue;
    if (!isSealedFinance(entry[field])) throw new Error('financial_encryption_envelope_corrupt');
    next[field] = unsealFinance(entry[field], fieldScope(entry, field));
  }
  return next;
}

function ciphertextKey(name) {
  return typeof name === 'string' && (isSensitiveLocalKey(name) ||
    name.startsWith(STORAGE_PREFIX) || name.startsWith(RECOVERY_PREFIX) ||
    name.startsWith(PREVIEW_RECOVERY_PREFIX));
}

function encryptedStorageValue(name, raw) {
  return raw !== null && raw !== undefined && (
    name.startsWith(STORAGE_PREFIX) || name.startsWith(RECOVERY_PREFIX) ||
    name.startsWith(PREVIEW_RECOVERY_PREFIX) || raw.includes(SEALED_TAG));
}

function existingDatabaseContainsCiphertext(name, stores) {
  if (typeof indexedDB === 'undefined') return Promise.resolve(false);
  return new Promise((resolve, reject) => {
    let complete = false;
    const open = indexedDB.open(name);
    const finish = (callback, result) => {
      if (complete) return;
      complete = true; callback(result);
    };
    open.onupgradeneeded = () => {
      // A missing database is not encrypted data. Keep this probe read-only.
      open.transaction.abort();
      finish(resolve, false);
    };
    open.onblocked = () => finish(reject, new Error('financial_encryption_database_blocked'));
    open.onerror = () => finish(reject, open.error);
    open.onsuccess = () => {
      const db = open.result;
      if (complete) { db.close(); return; }
      const names = stores.filter(store => db.objectStoreNames.contains(store));
      if (!names.length) { db.close(); finish(resolve, false); return; }
      const tx = db.transaction(names, 'readonly');
      let found = false;
      const scan = entry => {
        const value = entry.target.result;
        if (!value || found) return;
        found = Object.keys(value.value || {}).some(field => (
          (FIELDS.includes(field) || field === 'sealedData') && looksLikeEnvelope(value.value[field])
        ));
        if (!found) value.continue();
      };
      for (const store of names) tx.objectStore(store).openCursor().onsuccess = scan;
      tx.oncomplete = () => { db.close(); finish(resolve, found); };
      tx.onabort = () => { db.close(); finish(reject, tx.error || new Error('financial_encryption_probe_failed')); };
    };
  });
}

async function keyExistsInData(includeNative = false) {
  const storage = globalThis.localStorage;
  if (storage.getItem(KEY_SENTINEL)) return true;
  for (let i = 0; i < storage.length; i++) {
    const name = storage.key(i);
    if (ciphertextKey(name) && encryptedStorageValue(name, storage.getItem(name))) return true;
  }
  if (includeNative) {
    const { keys } = await Preferences.keys();
    for (const name of keys) {
      if (!ciphertextKey(name) && name !== KEY_SENTINEL) continue;
      const { value } = await Preferences.get({ key: name });
      if (name === KEY_SENTINEL ? value !== null : encryptedStorageValue(name, value)) return true;
    }
  }
  return await existingDatabaseContainsCiphertext('movo.hybrid.finance.v1', ['records', 'operations', 'metadata']) ||
    await existingDatabaseContainsCiphertext('movo-account-media-v1', ['account-qr']) ||
    await existingDatabaseContainsCiphertext('movo.loan.requests.v1', ['pending']);
}

async function getWebHmacKey(engine) {
  if (typeof indexedDB === 'undefined') throw new Error('financial_encryption_browser_vault_unavailable');
  const db = await new Promise((resolve, reject) => {
    const open = indexedDB.open(VAULT_DB, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(VAULT_STORE);
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
    open.onblocked = () => reject(new Error('financial_encryption_browser_vault_blocked'));
  });
  try {
    const existing = await new Promise((resolve, reject) => {
      const get = db.transaction(VAULT_STORE, 'readonly').objectStore(VAULT_STORE).get(VAULT_ID);
      get.onsuccess = () => resolve(get.result);
      get.onerror = () => reject(get.error);
    });
    if (existing) return existing;
    if (await keyExistsInData()) throw new Error('financial_encryption_key_missing');
    const fresh = await engine.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256', length: 256 }, false, ['sign']);
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(VAULT_STORE, 'readwrite');
      const store = tx.objectStore(VAULT_STORE), current = store.get(VAULT_ID);
      let selected = fresh;
      current.onsuccess = () => {
        if (current.result) selected = current.result;
        else store.put(fresh, VAULT_ID);
      };
      tx.oncomplete = () => resolve(selected);
      tx.onabort = () => reject(tx.error || new Error('financial_encryption_key_write_failed'));
    });
  } finally { db.close(); }
}
async function deriveFinanceKey(engine) {
  if (!isNativeApp()) {
    const root = await getWebHmacKey(engine);
    return new Uint8Array(await engine.subtle.sign('HMAC', root, encode('movo-vault-data-v1')));
  }
  // Reuse the existing native vault entry ONLY as key material for HKDF.
  // Domain-separated data keys prevent cross-protocol key reuse with AES-GCM.
  await initialiseFinanceCacheKey(() => keyExistsInData(true));
  const { value } = await MovoNative.secureGet({ key: CACHE_VAULT_KEY });
  const seed = unbase64(value, 32);
  if (seed.length !== 32) throw new Error('financial_encryption_native_key_invalid');
  let material;
  try { material = await engine.subtle.importKey('raw', seed, 'HKDF', false, ['deriveBits']); }
  finally { seed.fill(0); }
  return new Uint8Array(await engine.subtle.deriveBits({
    name: 'HKDF', hash: 'SHA-256', salt: encode('movo-finance-native-v1'),
    info: encode('synchronous-guest-owner-idb-v1')
  }, material, 256));
}
export async function initialiseFinanceVault() {
  if (inMemoryKey) return;
  if (!initPromise) initPromise = (async () => {
    const engine = cryptoEngine();
    const derived = await deriveFinanceKey(engine);
    if (derived.length !== 32) throw new Error('financial_encryption_key_invalid');
    inMemoryKey = derived;
    // The sentinel detects key loss without deleting existing ciphertext.
    globalThis.localStorage.setItem(KEY_SENTINEL, 'v1');
  })().catch(error => { inMemoryKey = null; initPromise = null; throw error; });
  return initPromise;
}

async function preserveNativeCopy(storage, logicalKey, value) {
  const serialized = JSON.stringify(value);
  const subtle = cryptoEngine().subtle;
  const root = await subtle.importKey('raw', assertKey(), 'HKDF', false, ['deriveKey']);
  const fingerprintKey = await subtle.deriveKey({
    name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: encode('movo-finance-recovery-index-v2')
  }, root, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = new Uint8Array(await subtle.sign('HMAC', fingerprintKey, encode(logicalKey + '|' + serialized)));
  const suffix = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
  const name = RECOVERY_PREFIX + logicalKey + ':' + suffix;
  const scope = 'recovery:' + logicalKey + ':' + suffix;
  const previous = storage.getItem(name);
  const { value: nativePrevious } = await Preferences.get({ key: name });
  const ciphertext = previous ?? nativePrevious ?? verifiedEnvelope(value, scope);
  if (JSON.stringify(parseLocal(ciphertext, scope, true)) !== serialized)
    throw new Error('financial_encryption_recovery_conflict');
  if (previous === null) writeVerified(storage, name, ciphertext);
  await Preferences.set({ key: name, value: ciphertext });
  const { value: saved } = await Preferences.get({ key: name });
  if (saved !== ciphertext) throw new Error('financial_encryption_recovery_write_failed');
}

export async function migrateFinanceLocalStorage() {
  assertKey();
  const storage = globalThis.localStorage;
  const native = isNativeApp();
  const names = new Set();
  const add = name => {
    const logicalKey = name?.startsWith(STORAGE_PREFIX) ? name.slice(STORAGE_PREFIX.length) : name;
    if (isSensitiveLocalKey(logicalKey)) names.add(logicalKey);
  };
  for (let i = 0; i < storage.length; i++) add(storage.key(i));
  if (native) {
    const { keys } = await Preferences.keys();
    keys.forEach(add);
  }
  for (const logicalKey of names) {
    if (!native) { settleLegacyStorage(storage, logicalKey); continue; }
    const destination = sealedFinanceStorageKey(logicalKey);
    const scope = 'local:' + logicalKey;
    const { value: oldLegacy } = await Preferences.get({ key: logicalKey });
    const { value: oldSealed } = await Preferences.get({ key: destination });
    const { current, encrypted, legacy } = readLocalCopies(storage, logicalKey);
    const nativeCurrent = oldSealed == null ? null : parseLocal(oldSealed, scope, true);
    const nativeLegacy = oldLegacy == null ? null : parseLocal(oldLegacy, scope);
    const value = current ?? nativeCurrent ?? nativeLegacy;
    if (value === null) continue;
    for (const old of [nativeCurrent, nativeLegacy]) {
      if (old !== null && JSON.stringify(old) !== JSON.stringify(value)) await preserveNativeCopy(storage, logicalKey, old);
    }
    // Keep native originals until the destination is authenticated and read back.
    if (storage.getItem(destination) !== encrypted || storage.getItem(logicalKey) !== legacy)
      throw new Error('financial_encryption_legacy_writer_conflict');
    const ciphertext = encrypted ?? verifiedEnvelope(value, scope);
    if (encrypted === null) writeVerified(storage, destination, ciphertext);
    await Preferences.set({ key: destination, value: ciphertext });
    const { value: saved } = await Preferences.get({ key: destination });
    if (saved !== ciphertext) throw new Error('financial_encryption_native_write_unverified');
    if (legacy !== null) {
      if (storage.getItem(logicalKey) !== legacy) throw new Error('financial_encryption_legacy_writer_conflict');
      storage.removeItem(logicalKey);
    }
    if (oldLegacy != null) {
      await Preferences.remove({ key: logicalKey });
      const { value: remaining } = await Preferences.get({ key: logicalKey });
      if (remaining != null) throw new Error('financial_encryption_native_scrub_failed');
    }
  }
}
/** Jest-only test bootstrap; no production escape hatch or plaintext fallback. */
export function __initialiseFinanceVaultForTests(bytes) {
  if (process.env.NODE_ENV !== 'test') throw new Error('financial_encryption_test_only');
  if (!(bytes instanceof Uint8Array) || bytes.length !== 32) throw new Error('financial_encryption_test_key_invalid');
  inMemoryKey = new Uint8Array(bytes);
}
