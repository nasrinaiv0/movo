/**
 * Offline QR PNGs can encode bank/wallet payment details. Never save a readable
 * data: URL in IndexedDB. XChaCha20-Poly1305 binds each image to the exact
 * cache entry. Finance vault is initialised before customer App rendering.
 */
import { isSealedFinance, sealFinance, unsealFinance } from './financeVault';

const DB_NAME = 'movo-account-media-v1';
const STORE_NAME = 'account-qr';
const DATA_URL = /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/;
let databasePromise;

function validId(id) { return typeof id === 'string' && id.length > 0 && id.length <= 180; }
function validData(value) {
  // Standard PNG signature starts with iVBORw0KGgo in base64; reject MIME-spoofed
  // arbitrary text disguised as a PNG before it is stored or decoded.
  return typeof value === 'string' && value.length <= 1_200_000 &&
    DATA_URL.test(value) && value.startsWith('data:image/png;base64,iVBORw0KGgo');
}
function scope(id) { return 'account-qr:' + id; }

function openDatabase() {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('account_qr_offline_storage_unavailable'));
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); databasePromise = null; };
        resolve(db);
      };
      request.onerror = () => { databasePromise = null; reject(request.error || new Error('account_qr_database_open_failed')); };
      request.onblocked = () => { databasePromise = null; reject(new Error('account_qr_database_blocked')); };
    });
  }
  return databasePromise;
}

/** All-or-nothing in-place migration. A crash or verification failure aborts
 * every row update, leaving legacy images recoverable for a later retry.
 * Never return or draw unverified plaintext from a failed migration.
 */
export async function migrateLocalAccountQrEncryption({ failAfter = -1 } = {}) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    let tx, cause, changed = 0;
    try { tx = db.transaction(STORE_NAME, 'readwrite'); }
    catch (error) { reject(error); return; }
    const store = tx.objectStore(STORE_NAME);
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      try {
        const row = cursor.value;
        if (!validId(row?.id)) throw new Error('account_qr_invalid_legacy_id');
        if (isSealedFinance(row.sealedData)) {
          if (!validData(unsealFinance(row.sealedData, scope(row.id))))
            throw new Error('account_qr_ciphertext_invalid');
          if (row.dataUrl !== undefined) {
            const { dataUrl, ...safe } = row;
            if (process.env.NODE_ENV === 'test' && failAfter >= 0 && changed >= failAfter)
              throw new Error('account_qr_test_migration_interrupt');
            cursor.update(safe);
            changed += 1;
          }
        } else if (row.sealedData !== undefined) {
          throw new Error('account_qr_envelope_corrupt');
        } else if (validData(row.dataUrl)) {
          const encrypted = sealFinance(row.dataUrl, scope(row.id));
          if (unsealFinance(encrypted, scope(row.id)) !== row.dataUrl)
            throw new Error('account_qr_encryption_verify_failed');
          if (process.env.NODE_ENV === 'test' && failAfter >= 0 && changed >= failAfter)
            throw new Error('account_qr_test_migration_interrupt');
          const { dataUrl, ...safe } = row;
          cursor.update({ ...safe, sealedData: encrypted });
          changed += 1;
        } else {
          throw new Error('account_qr_corrupt_legacy_data');
        }
        cursor.continue();
      } catch (error) {
        cause = error;
        try { tx.abort(); } catch {}
      }
    };
    request.onerror = () => { cause = request.error; try { tx.abort(); } catch {} };
    tx.oncomplete = () => resolve({ encrypted: changed });
    tx.onabort = () => reject(cause || tx.error || new Error('account_qr_migration_aborted'));
    tx.onerror = () => { /* transaction abort owns the error */ };
  });
}

export async function saveLocalAccountQr(id, dataUrl) {
  if (!validId(id)) throw new Error('invalid_account_qr_cache_key');
  if (!validData(dataUrl)) throw new Error('invalid_account_qr_image');
  const sealedData = sealFinance(dataUrl, scope(id));
  if (unsealFinance(sealedData, scope(id)) !== dataUrl)
    throw new Error('account_qr_encryption_verify_failed');
  const db = await openDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ id, sealedData, updatedAt: Date.now() });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error('account_qr_cache_write_failed'));
    tx.onabort = () => reject(tx.error || new Error('account_qr_cache_write_aborted'));
  });
}

async function readRaw(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error || new Error('account_qr_cache_read_failed'));
  });
}
export async function getLocalAccountQr(id) {
  if (!validId(id)) return null;
  let row = await readRaw(id);
  if (!row) return null;
  if (!isSealedFinance(row.sealedData)) {
    if (row.sealedData !== undefined) throw new Error('account_qr_envelope_corrupt');
    // Older app versions may write a plaintext entry after the startup sweep.
    await migrateLocalAccountQrEncryption();
    row = await readRaw(id);
  }
  if (!row || !isSealedFinance(row.sealedData))
    throw new Error('account_qr_migration_unverified');
  const decoded = unsealFinance(row.sealedData, scope(id));
  if (!validData(decoded)) throw new Error('account_qr_image_invalid_after_decrypt');
  return decoded;
}
export async function removeLocalAccountQr(id) {
  if (!validId(id) || typeof indexedDB === 'undefined') return;
  const db = await openDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error('account_qr_cache_delete_failed'));
    tx.onabort = () => reject(tx.error || new Error('account_qr_cache_delete_aborted'));
  });
}
export async function clearLocalAccountQr() {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error('account_qr_cache_clear_failed'));
    tx.onabort = () => reject(tx.error || new Error('account_qr_cache_clear_aborted'));
  });
}
