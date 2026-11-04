const DB_NAME = 'movo-account-media-v1';
const STORE_NAME = 'account-qr';
let databasePromise;

function openDatabase() {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('account_qr_offline_storage_unavailable'));
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => { databasePromise = null; reject(request.error || new Error('account_qr_database_open_failed')); };
      request.onblocked = () => { databasePromise = null; reject(new Error('account_qr_database_blocked')); };
    });
  }
  return databasePromise;
}

export async function saveLocalAccountQr(id, dataUrl) {
  if (typeof id !== 'string' || !id || id.length > 180) throw new Error('invalid_account_qr_cache_key');
  if (typeof dataUrl !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(dataUrl) || dataUrl.length > 1_200_000) throw new Error('invalid_account_qr_image');
  const db = await openDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ id, dataUrl, updatedAt: Date.now() });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error('account_qr_cache_write_failed'));
    tx.onabort = () => reject(tx.error || new Error('account_qr_cache_write_aborted'));
  });
}

export async function getLocalAccountQr(id) {
  if (typeof id !== 'string' || !id || id.length > 180) return null;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(typeof request.result?.dataUrl === 'string' ? request.result.dataUrl : null);
    request.onerror = () => reject(request.error || new Error('account_qr_cache_read_failed'));
  });
}

export async function removeLocalAccountQr(id) {
  if (typeof id !== 'string' || !id || id.length > 180 || typeof indexedDB === 'undefined') return;
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
