/**
 * Staged native-only encrypted snapshot vault. Not yet authoritative for MOVO finance.
 * Never destroy or transparently replace legacy records until all sync/journal paths
 * have been tested in a controlled, lossless production migration.
 *
 * AES-256-GCM using WebCrypto; device-only Keychain / Keystore key wrapping.
 * Every ciphertext is bound to its owner/group in GCM authenticated additionalData.
 * An absent or invalid native key, missing crypto, or ciphertext corruption fails closed.
 */
import { MovoNative } from './native';
import { isNativeApp } from './platform';

const DEVICE_KEY = 'movo-finance-vault-key-v1';
const DB_NAME = 'movo.encrypted.finance.snapshots.v1';
const GROUPS = new Set(['accounts', 'transactions', 'hybrid']);
const OWNER_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_INPUT_BYTES = 8 * 1024 * 1024;
// WebCrypto and text codecs are resolved on use: jsdom can import this module without codecs.
const encode = value => new TextEncoder().encode(value);
const decode = bytes => new TextDecoder('utf-8', { fatal: true }).decode(bytes);
const toHex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
function fromHex(value) {
  if (typeof value !== 'string' || !/^(?:[0-9a-f]{2})+$/i.test(value)) throw new Error('Invalid encrypted finance encoding');
  const out = new Uint8Array(value.length / 2);
  for (let n = 0; n < out.length; n += 1) out[n] = parseInt(value.slice(n * 2, n * 2 + 2), 16);
  return out;
}
function validatedGroup(group) {
  if (!GROUPS.has(group)) throw new Error('Invalid protected finance group');
  return group;
}
function validatedOwner(ownerId) {
  if (ownerId !== 'local' && !OWNER_RE.test(String(ownerId || ''))) throw new Error('Invalid protected finance owner');
  return ownerId;
}
function getCrypto(cryptoProvider) {
  const provider = cryptoProvider || globalThis.crypto;
  if (!provider?.subtle || typeof provider.getRandomValues !== 'function') throw new Error('Secure WebCrypto unavailable');
  return provider;
}
function requireNative() {
  if (!isNativeApp()) throw new Error('Protected finance vault requires native app');
}
async function loadNativeKey(cryptoProvider) {
  requireNative();
  const provider = getCrypto(cryptoProvider);
  const existing = await MovoNative.secureGet({ key: DEVICE_KEY });
  let hex = existing?.value;
  if (hex == null) {
    // Do not derive the key from an auth token or store it in WebView preferences.
    const generated = new Uint8Array(32);
    provider.getRandomValues(generated);
    hex = toHex(generated);
    await MovoNative.secureSet({ key: DEVICE_KEY, value: hex });
    const readBack = await MovoNative.secureGet({ key: DEVICE_KEY });
    if (readBack?.value !== hex) throw new Error('Finance vault key verification failed');
  }
  if (typeof hex !== 'string' || !/^[0-9a-f]{64}$/i.test(hex)) throw new Error('Invalid device finance key');
  return provider.subtle.importKey('raw', fromHex(hex), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
const identity = (ownerId, group) => 'movo-finance-v1:' + validatedOwner(ownerId) + ':' + validatedGroup(group);

/** Ciphertext only. No original balance, transaction or account is written to storage. */
export async function sealNativeFinanceSnapshot({ ownerId = 'local', group, data, cryptoProvider } = {}) {
  const id = identity(ownerId, group);
  const provider = getCrypto(cryptoProvider);
  const plaintext = encode(JSON.stringify(data));
  if (!plaintext.length || plaintext.length > MAX_INPUT_BYTES) throw new Error('Protected finance snapshot exceeds allowed size');
  const key = await loadNativeKey(provider);
  const iv = new Uint8Array(12);
  provider.getRandomValues(iv);
  const encrypted = await provider.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encode(id), tagLength: 128 }, key, plaintext);
  return { id, ownerId, group, version: 1, iv: toHex(iv), ciphertext: toHex(new Uint8Array(encrypted)) };
}

export async function openNativeFinanceSnapshot({ ownerId = 'local', group, envelope, cryptoProvider } = {}) {
  const id = identity(ownerId, group);
  const provider = getCrypto(cryptoProvider);
  if (!envelope || envelope.version !== 1 || envelope.id !== id || envelope.ownerId !== ownerId || envelope.group !== group) {
    throw new Error('Protected finance snapshot identity mismatch');
  }
  const iv = fromHex(envelope.iv);
  if (iv.length !== 12) throw new Error('Invalid protected finance nonce');
  const ciphertext = fromHex(envelope.ciphertext);
  if (ciphertext.length < 16 || ciphertext.length > MAX_INPUT_BYTES + 16) throw new Error('Invalid protected finance ciphertext length');
  const key = await loadNativeKey(provider);
  // GCM authentication rejects tampering, wrong keys and swapped snapshots. Never return partial data.
  const plain = await provider.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: encode(id), tagLength: 128 }, key, ciphertext);
  return JSON.parse(decode(plain));
}

function idbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Encrypted finance IndexedDB request failed'));
  });
}
function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onabort = () => reject(tx.error || new Error('Encrypted finance IndexedDB aborted'));
    tx.onerror = () => {};
  });
}
async function openDatabase() {
  requireNative();
  if (typeof indexedDB === 'undefined') throw new Error('Encrypted finance IndexedDB unavailable');
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('snapshots')) db.createObjectStore('snapshots', { keyPath: 'id' });
    };
    request.onsuccess = () => { const db = request.result; db.onversionchange = () => db.close(); resolve(db); };
    request.onerror = () => reject(request.error || new Error('Cannot open encrypted finance snapshots'));
    request.onblocked = () => reject(new Error('Encrypted finance upgrade blocked'));
  });
}
async function readEnvelope(id) {
  const db = await openDatabase();
  try {
    const tx = db.transaction('snapshots', 'readonly');
    return await idbRequest(tx.objectStore('snapshots').get(id));
  } finally { db.close(); }
}

/**
 * Explicit, non-destructive migration staging only. The caller's legacy data is
 * untouched. Returns only after the durable ciphertext is read back and decrypted.
 */
export async function stageNativeFinanceSnapshot({ ownerId = 'local', group, data, cryptoProvider } = {}) {
  const envelope = await sealNativeFinanceSnapshot({ ownerId, group, data, cryptoProvider });
  const db = await openDatabase();
  try {
    const tx = db.transaction('snapshots', 'readwrite');
    const done = transactionDone(tx);
    done.catch(() => {});
    tx.objectStore('snapshots').put(envelope);
    await done;
  } finally { db.close(); }
  const checked = await readNativeFinanceSnapshot({ ownerId, group, cryptoProvider });
  if (JSON.stringify(checked) !== JSON.stringify(data)) throw new Error('Encrypted finance snapshot verification failed');
  return { staged: true, id: envelope.id };
}

/** Null means not staged; decryption failure is fatal, never an empty-array fallback. */
export async function readNativeFinanceSnapshot({ ownerId = 'local', group, cryptoProvider } = {}) {
  const id = identity(ownerId, group);
  const envelope = await readEnvelope(id);
  if (!envelope) return null;
  return openNativeFinanceSnapshot({ ownerId, group, envelope, cryptoProvider });
}
