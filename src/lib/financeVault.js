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
const MAX_PLAINTEXT = 8_000_000;
export const SEALED_TAG = '__movo_finance_sealed_v1';
let inMemoryKey = null;
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
function unbase64(str) {
  if (typeof str !== 'string' || !/^(?:[\w+/]{4})*(?:[\w+/]{2}==|[\w+/]{3}=)?$/.test(str))
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
  const nonce = unbase64(value.n), cipher = unbase64(value.c);
  if (nonce.length !== 24 || cipher.length < 16 || cipher.length > MAX_PLAINTEXT + 16)
    throw new Error('financial_encryption_ciphertext_invalid');
  const bytes = xchacha20poly1305(assertKey(), nonce, verifyAad(scope)).decrypt(cipher);
  return JSON.parse(decode(bytes));
}

export function loadFinanceJson(storageKey) {
  if (!isSensitiveLocalKey(storageKey)) throw new Error('financial_encryption_storage_key_invalid');
  const raw = globalThis.localStorage.getItem(storageKey);
  if (raw === null) return null;
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { throw new Error('financial_encryption_local_data_corrupt'); }
  // Old clients may have written an entry after startup. Migrate it atomically
  // before returning data, never allow unencrypted writes or silent empty lists.
  if (!isSealedFinance(parsed)) {
    if (looksLikeEnvelope(parsed)) throw new Error('financial_encryption_envelope_corrupt');
    saveFinanceJson(storageKey, parsed);
    return parsed;
  }
  return unsealFinance(parsed, 'local:' + storageKey);
}
export function saveFinanceJson(storageKey, value) {
  if (!isSensitiveLocalKey(storageKey)) throw new Error('financial_encryption_storage_key_invalid');
  const ciphertext = JSON.stringify(sealFinance(value, 'local:' + storageKey));
  globalThis.localStorage.setItem(storageKey, ciphertext);
  if (globalThis.localStorage.getItem(storageKey) !== ciphertext)
    throw new Error('financial_encryption_write_unverified');
  // Verify authenticity before reporting success to the synchronous caller.
  unsealFinance(JSON.parse(ciphertext), 'local:' + storageKey);
  return true;
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
    if (looksLikeEnvelope(entry[field]) && !isSealedFinance(entry[field]))
      throw new Error('financial_encryption_envelope_corrupt');
    if (isSealedFinance(entry[field])) next[field] = unsealFinance(entry[field], fieldScope(entry, field));
  }
  return next;
}

async function keyExistsInData() {
  let found = false;
  try {
    const storage = globalThis.localStorage;
    for (let i = 0; i < storage.length; i++) {
      const name = storage.key(i);
      if (!isSensitiveLocalKey(name)) continue;
      const v = storage.getItem(name);
      if (v && v.includes(SEALED_TAG)) return true;
    }
    if (storage.getItem(KEY_SENTINEL)) return true;
  } catch { throw new Error('financial_encryption_storage_unavailable'); }
  if (typeof indexedDB === 'undefined') return false;
  // Detect encrypted orphaned IDB data before attempting fresh key creation.
  const db = await new Promise((resolve, reject) => {
    const open = indexedDB.open('movo.hybrid.finance.v1', 1);
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
    open.onupgradeneeded = () => {
      // A first-time app may not have this IDB database yet. Build the exact
      // schema expected by hybridLocalStore so we never leave an empty v1 DB.
      const d = open.result;
      if (!d.objectStoreNames.contains('records')) {
        const records = d.createObjectStore('records', { keyPath: ['ownerId', 'group', 'recordId'] });
        records.createIndex('owner_group', ['ownerId', 'group']);
      }
      if (!d.objectStoreNames.contains('operations')) {
        const operations = d.createObjectStore('operations', { keyPath: 'id' });
        operations.createIndex('owner', 'ownerId');
      }
      if (!d.objectStoreNames.contains('metadata'))
        d.createObjectStore('metadata', { keyPath: 'ownerId' });
    };
  });
  try {
    for (const name of ['records', 'operations', 'metadata']) {
      if (!db.objectStoreNames.contains(name)) continue;
      const foundStore = await new Promise((resolve, reject) => {
        const tx = db.transaction(name, 'readonly'), cursor = tx.objectStore(name).openCursor();
        cursor.onsuccess = () => {
          const row = cursor.result;
          if (!row) return resolve(false);
          if (FIELDS.some(field => isSealedFinance(row.value?.[field]))) resolve(true);
          else row.continue();
        };
        cursor.onerror = () => reject(cursor.error);
      });
      if (foundStore) return true;
    }
    return found;
  } finally { db.close(); }
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
  await initialiseFinanceCacheKey();
  const { value } = await MovoNative.secureGet({ key: CACHE_VAULT_KEY });
  const seed = unbase64(value);
  if (seed.length !== 32) throw new Error('financial_encryption_native_key_invalid');
  const material = await engine.subtle.importKey('raw', seed, 'HKDF', false, ['deriveBits']);
  seed.fill(0);
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

export async function migrateFinanceLocalStorage() {
  assertKey();
  const store = globalThis.localStorage;
  const names = new Set();
  for (let i = 0; i < store.length; i++) {
    const name = store.key(i);
    if (isSensitiveLocalKey(name)) names.add(name);
  }
  if (isNativeApp()) {
    const { keys = [] } = await Preferences.keys();
    keys.filter(isSensitiveLocalKey).forEach(name => names.add(name));
  }
  for (const name of names) {
    const oldNative = isNativeApp() ? (await Preferences.get({ key: name }))?.value : null;
    let raw = store.getItem(name) ?? oldNative;
    if (!raw) continue;
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch { throw new Error('financial_encryption_legacy_corrupt'); }
    if (looksLikeEnvelope(parsed) && !isSealedFinance(parsed))
      throw new Error('financial_encryption_envelope_corrupt');
    let ciphertext;
    if (isSealedFinance(parsed)) {
      unsealFinance(parsed, 'local:' + name);
      ciphertext = raw;
    } else {
      ciphertext = JSON.stringify(sealFinance(parsed, 'local:' + name));
    }
    // If local and native copies diverged, preserve native contents as an
    // encrypted recovery capsule rather than silently discarding an old edit.
    if (oldNative !== null && oldNative !== undefined && oldNative !== raw) {
      let old;
      try { old = JSON.parse(oldNative); }
      catch { throw new Error('financial_encryption_native_legacy_corrupt'); }
      if (looksLikeEnvelope(old) && !isSealedFinance(old))
        throw new Error('financial_encryption_native_envelope_corrupt');
      const recover = isSealedFinance(old) ? oldNative : JSON.stringify(sealFinance(old, 'local:' + name));
      const recoveryKey = 'movo.finance.recovery.v1:' + name;
      // A recovery capsule is never interpreted as the current record.
      // Do not overwrite an existing recovery copy with different contents.
      const existing = store.getItem(recoveryKey);
      if (existing && existing !== recover) throw new Error('financial_encryption_recovery_conflict');
      if (!existing) store.setItem(recoveryKey, recover);
      if (store.getItem(recoveryKey) !== recover) throw new Error('financial_encryption_recovery_write_failed');
    }
    if (store.getItem(name) !== ciphertext) {
      store.setItem(name, ciphertext);
      if (store.getItem(name) !== ciphertext) throw new Error('financial_encryption_legacy_write_failed');
    }
    // Authenticate and round-trip before any old native Preferences are
    // replaced. A failed native write retains the old copy and blocks boot.
    const decoded = unsealFinance(JSON.parse(ciphertext), 'local:' + name);
    if (!isSealedFinance(parsed) && JSON.stringify(decoded) !== JSON.stringify(parsed))
      throw new Error('financial_encryption_legacy_verify_failed');
    if (isNativeApp()) {
      await Preferences.set({ key: name, value: ciphertext });
      const { value: verified } = await Preferences.get({ key: name });
      if (verified !== ciphertext) throw new Error('financial_encryption_native_write_unverified');
    }
  }
}
/** Jest-only test bootstrap; no production escape hatch or plaintext fallback. */
export function __initialiseFinanceVaultForTests(bytes) {
  if (process.env.NODE_ENV !== 'test') throw new Error('financial_encryption_test_only');
  if (!(bytes instanceof Uint8Array) || bytes.length !== 32) throw new Error('financial_encryption_test_key_invalid');
  inMemoryKey = new Uint8Array(bytes);
}
