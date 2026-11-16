/**
 * AES-256-GCM for MOVO's read-only, per-account offline financial list cache.
 * Mobile: a random 256-bit data key is encrypted at rest by native Keychain /
 * Android Keystore through MovoNative.secureGet/secureSet.
 * Web: a non-extractable WebCrypto key stored via structured clone in IndexedDB.
 *
 * Encryption at rest does not resist active same-origin JavaScript/XSS or a
 * fully compromised/unlocked device. No service-role secrets or remote keys.
 */
import { MovoNative } from './native';
import { isNativeApp } from './platform';

export const CACHE_PREFIX = 'movo.readCache.v1:';
export const CACHE_VAULT_KEY = 'movo-finance-cache-key-v1';
const DB_NAME = 'movo-finance-cache-keys-v1';
const DB_STORE = 'keys';
const DB_KEY = 'read-cache';
const MAX_BYTES = 2_500_000;
const encode = value => new TextEncoder().encode(value);
const decode = value => new TextDecoder().decode(value);
let keyPromise;

function cryptoEngine() {
  const engine = globalThis.crypto;
  if (!engine?.subtle || typeof engine.getRandomValues !== 'function') {
    throw new Error('offline_cache_crypto_unavailable');
  }
  return engine;
}

function toBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(value) {
  if (typeof value !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error('offline_cache_invalid_base64');
  }
  return Uint8Array.from(atob(value), c => c.charCodeAt(0));
}

function cacheContainsCiphertext() {
  try {
    const storage = globalThis.localStorage;
    for (let i = 0; i < storage.length; i++) {
      const name = storage.key(i);
      if (name?.startsWith(CACHE_PREFIX) && /"v"\s*:\s*2/.test(storage.getItem(name) || '')) return true;
    }
  } catch { throw new Error('offline_cache_storage_unavailable'); }
  return false;
}

async function getNativeKey(engine) {
  const result = await MovoNative.secureGet({ key: CACHE_VAULT_KEY });
  let encoded = result?.value;
  if (!encoded) {
    // Never replace a lost/invalid vault key while encrypted data exists.
    if (cacheContainsCiphertext()) throw new Error('offline_cache_key_missing');
    const random = engine.getRandomValues(new Uint8Array(32));
    encoded = toBase64(random);
    await MovoNative.secureSet({ key: CACHE_VAULT_KEY, value: encoded });
    const stored = await MovoNative.secureGet({ key: CACHE_VAULT_KEY });
    if (stored?.value !== encoded) throw new Error('offline_cache_key_write_unverified');
  }
  const raw = fromBase64(encoded);
  if (raw.length !== 32) throw new Error('offline_cache_invalid_key');
  return engine.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function getWebKey(engine) {
  if (typeof indexedDB === 'undefined') throw new Error('offline_cache_indexeddb_unavailable');
  return new Promise((resolve, reject) => {
    let database;
    const fail = () => { try { database?.close(); } catch {} reject(new Error('offline_cache_key_storage_failed')); };
    const open = indexedDB.open(DB_NAME, 1);
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains(DB_STORE)) open.result.createObjectStore(DB_STORE);
    };
    open.onerror = fail;
    open.onblocked = fail;
    open.onsuccess = async () => {
      database = open.result;
      try {
        // Fast path: an existing non-exportable key can be used without a write.
        const current = await new Promise((done, error) => {
          const req = database.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(DB_KEY);
          req.onsuccess = () => done(req.result);
          req.onerror = () => error(req.error);
        });
        if (current) { database.close(); resolve(current); return; }
        if (cacheContainsCiphertext()) throw new Error('offline_cache_key_missing');
        const generated = await engine.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
        // The final get-and-put happen in ONE transaction. Another tab may
        // have initialized the key while WebCrypto generated ours.
        const selected = await new Promise((done, error) => {
          const tx = database.transaction(DB_STORE, 'readwrite');
          const store = tx.objectStore(DB_STORE);
          const recheck = store.get(DB_KEY);
          let key = generated;
          recheck.onsuccess = () => {
            if (recheck.result) key = recheck.result;
            else store.put(generated, DB_KEY);
          };
          tx.oncomplete = () => done(key);
          tx.onabort = () => error(tx.error);
          tx.onerror = () => error(tx.error);
        });
        database.close();
        resolve(selected);
      } catch (error) { database.close(); reject(error); }
    };
  });
}

function getKey() {
  if (!keyPromise) {
    keyPromise = (async () => {
      const engine = cryptoEngine();
      return isNativeApp() ? getNativeKey(engine) : getWebKey(engine);
    })().catch(error => { keyPromise = null; throw error; });
  }
  return keyPromise;
}

function aad(ownerId, cacheName) {
  return encode('movo.readCache.v2|' + ownerId + '|' + cacheName);
}

export async function encryptFinancialCache(ownerId, cacheName, payload) {
  const serialized = encode(JSON.stringify(payload));
  if (serialized.byteLength > MAX_BYTES) throw new Error('offline_cache_too_large');
  const engine = cryptoEngine();
  const iv = engine.getRandomValues(new Uint8Array(12));
  const sealed = await engine.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad(ownerId, cacheName), tagLength: 128 },
    await getKey(), serialized
  );
  return JSON.stringify({ v: 2, alg: 'A256GCM', iv: toBase64(iv), ct: toBase64(new Uint8Array(sealed)) });
}

export async function decryptFinancialCache(ownerId, cacheName, envelope) {
  if (!envelope || envelope.v !== 2 || envelope.alg !== 'A256GCM') throw new Error('offline_cache_invalid_format');
  const iv = fromBase64(envelope.iv), ct = fromBase64(envelope.ct);
  if (iv.length !== 12 || ct.length < 16 || ct.length > MAX_BYTES + 16) throw new Error('offline_cache_invalid_ciphertext');
  const raw = await cryptoEngine().subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData: aad(ownerId, cacheName), tagLength: 128 },
    await getKey(), ct
  );
  return JSON.parse(decode(raw));
}
