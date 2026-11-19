// Shared artwork only. Account photos, receipts and finance records use owner stores.
const DB = 'movo-display-assets-v1';
const STORE = 'images';
const LIMIT = 24;
const MAX_BYTES = 1024 * 1024;

async function database() {
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open(DB, 1);
    opening.onupgradeneeded = () => opening.result.createObjectStore(STORE, { keyPath: 'path' });
    opening.onsuccess = () => resolve(opening.result);
    opening.onerror = () => reject(opening.error);
  });
}

export async function readDisplayAsset(path) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).get(path);
      request.onsuccess = () => resolve(request.result?.image || '');
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}

export async function saveDisplayAsset(path, url) {
  if (!/^[a-zA-Z0-9_/-]+\.webp$/.test(path)) return;
  const response = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!response.ok || Number(response.headers.get('content-length')) > MAX_BYTES) return;
  const blob = await response.blob();
  if (blob.size > MAX_BYTES || blob.type !== 'image/webp') return;
  const signature = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  if (String.fromCharCode(...signature.slice(0, 4)) !== 'RIFF' ||
      String.fromCharCode(...signature.slice(8, 12)) !== 'WEBP') return;
  const image = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  const db = await database();
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      const store = transaction.objectStore(STORE);
      const existing = store.getAll();
      existing.onsuccess = () => {
        const rows = existing.result.filter(row => row.path !== path).sort((a, b) => a.savedAt - b.savedAt);
        for (const row of rows.slice(0, Math.max(0, rows.length - LIMIT + 1))) store.delete(row.path);
        store.put({ path, image, savedAt: Date.now() });
      };
      transaction.oncomplete = resolve;
      transaction.onabort = () => reject(transaction.error);
    });
  } finally { db.close(); }
}
