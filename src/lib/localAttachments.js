const DATABASE = 'movo-local-attachments-v1';
function open() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Device storage is unavailable.'));
  });
}
export async function putLocalAttachment(file, key = 'localreceipt:' + crypto.randomUUID()) {
  if (!['image/jpeg','image/png','image/webp','application/pdf','application/json'].includes(file.type) || file.size > 50 * 1024 * 1024) throw new Error('Unsupported attachment or file is too large.');
  const db = await open();
  try { await new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite'); tx.objectStore('files').put(file, key);
    tx.oncomplete = resolve; tx.onerror = tx.onabort = () => reject(new Error('Could not save on this device.'));
  }); } finally { db.close(); }
  return key;
}
export async function getLocalAttachment(key) {
  const db = await open();
  try { return await new Promise((resolve, reject) => {
    const request = db.transaction('files').objectStore('files').get(key);
    request.onsuccess = () => resolve(request.result || null); request.onerror = () => reject(request.error);
  }); } finally { db.close(); }
}
export async function clearLocalAttachments() {
  const db = await open();
  try { await new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite'); tx.objectStore('files').clear();
    tx.oncomplete = resolve; tx.onerror = tx.onabort = () => reject(tx.error);
  }); } finally { db.close(); }
}
