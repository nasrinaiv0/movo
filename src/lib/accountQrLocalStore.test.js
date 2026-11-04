import { saveLocalAccountQr, getLocalAccountQr, removeLocalAccountQr, clearLocalAccountQr } from './accountQrLocalStore';

const valid = 'data:image/png;base64,iVBORw0KGgo=';

test('rejects malformed QR cache payloads and oversized data URLs', async () => {
  await expect(saveLocalAccountQr('local:account-1', 'data:image/jpeg;base64,/9j/')).rejects.toThrow('invalid_account_qr_image');
  await expect(saveLocalAccountQr('local:account-1', `data:image/png;base64,${'A'.repeat(1_200_001)}`)).rejects.toThrow('invalid_account_qr_image');
});

test('rejects invalid cache keys without opening IndexedDB', async () => {
  await expect(saveLocalAccountQr('', valid)).rejects.toThrow('invalid_account_qr_cache_key');
  await expect(getLocalAccountQr('')).resolves.toBeNull();
  await expect(removeLocalAccountQr('')).resolves.toBeUndefined();
});

test('persists, reads, removes, and clears offline QR images in IndexedDB', async () => {
  const records = new Map();
  const store = {
    put: record => { records.set(record.id, record); },
    get: id => { const request = {}; Promise.resolve().then(() => { request.result = records.get(id); request.onsuccess?.(); }); return request; },
    delete: id => { records.delete(id); },
    clear: () => { records.clear(); },
  };
  const db = {
    objectStoreNames: { contains: () => true },
    transaction: () => {
      const tx = { objectStore: () => store };
      const complete = () => Promise.resolve().then(() => tx.oncomplete?.());
      const originalPut = store.put; const originalDelete = store.delete; const originalClear = store.clear;
      store.put = value => { originalPut(value); complete(); };
      store.delete = value => { originalDelete(value); complete(); };
      store.clear = () => { originalClear(); complete(); };
      return tx;
    },
  };
  const originalIndexedDB = global.indexedDB;
  Object.defineProperty(global, 'indexedDB', { configurable: true, value: { open: () => {
    const request = {};
    Promise.resolve().then(() => { request.result = db; request.onsuccess?.(); });
    return request;
  } } });
  jest.resetModules();
  try {
    const cache = require('./accountQrLocalStore');
    await cache.saveLocalAccountQr('local:bank-1', valid);
    await expect(cache.getLocalAccountQr('local:bank-1')).resolves.toBe(valid);
    await cache.removeLocalAccountQr('local:bank-1');
    await expect(cache.getLocalAccountQr('local:bank-1')).resolves.toBeNull();
    await cache.saveLocalAccountQr('local:bank-2', valid);
    await cache.clearLocalAccountQr();
    await expect(cache.getLocalAccountQr('local:bank-2')).resolves.toBeNull();
  } finally {
    if (originalIndexedDB === undefined) delete global.indexedDB;
    else Object.defineProperty(global, 'indexedDB', { configurable: true, value: originalIndexedDB });
    jest.resetModules();
  }
});
