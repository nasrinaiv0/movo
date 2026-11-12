import 'fake-indexeddb/auto';
import {
  saveLocalAccountQr, getLocalAccountQr, clearLocalAccountQr, migrateLocalAccountQrEncryption
} from './accountQrLocalStore';
import { isSealedFinance } from './financeVault';

const QR = 'data:image/png;base64,iVBORw0KGgo=';
const QR2 = 'data:image/png;base64,iVBORw0KGgp=';
const DB_NAME = 'movo-account-media-v1';
const STORE_NAME = 'account-qr';

async function rawRows() {
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  try {
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally { db.close(); }
}
async function putRaw(row) {
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(row);
      tx.oncomplete = resolve;
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}
beforeEach(async () => {
  // The first call creates the database before tests inject old plain records.
  await clearLocalAccountQr();
});
afterEach(async () => { await clearLocalAccountQr(); });

test('saved bank QR is ciphertext at rest and readable to the authorized entry only', async () => {
  await saveLocalAccountQr('local:bank-a', QR);
  const raw = await rawRows();
  expect(raw).toHaveLength(1);
  expect(JSON.stringify(raw)).not.toContain('data:image/png;base64');
  expect(isSealedFinance(raw[0].sealedData)).toBe(true);
  expect(raw[0]).not.toHaveProperty('dataUrl');
  await expect(getLocalAccountQr('local:bank-a')).resolves.toBe(QR);
  await putRaw({ ...raw[0], id: 'local:bank-b' });
  await expect(getLocalAccountQr('local:bank-b')).rejects.toThrow();
  await expect(getLocalAccountQr('local:bank-a')).resolves.toBe(QR);
});

test('upgrades old plaintext QR entries atomically without changing their IDs', async () => {
  await putRaw({ id: 'local:old-a', dataUrl: QR, updatedAt: 1711 });
  await putRaw({ id: 'local:old-b', dataUrl: QR2, updatedAt: 1712 });
  const initial = await rawRows();
  expect(JSON.stringify(initial)).toContain('data:image/png;base64');
  await expect(migrateLocalAccountQrEncryption({ failAfter: 1 })).rejects.toThrow();
  expect(await rawRows()).toEqual(initial); // A crash aborts the complete IDB transaction.
  await expect(migrateLocalAccountQrEncryption()).resolves.toEqual({ encrypted: 2 });
  const after = await rawRows();
  expect(JSON.stringify(after)).not.toContain('data:image/png;base64');
  expect(after.map(x => x.id)).toEqual(initial.map(x => x.id));
  expect(after.map(x => x.updatedAt)).toEqual(initial.map(x => x.updatedAt));
  await expect(getLocalAccountQr('local:old-a')).resolves.toBe(QR);
  await expect(getLocalAccountQr('local:old-b')).resolves.toBe(QR2);
  await expect(migrateLocalAccountQrEncryption()).resolves.toEqual({ encrypted: 0 });
});

test('legacy value encountered after startup is sealed before the caller receives it', async () => {
  await putRaw({ id: 'local:old-device', dataUrl: QR });
  await expect(getLocalAccountQr('local:old-device')).resolves.toBe(QR);
  expect((await rawRows())[0]).not.toHaveProperty('dataUrl');
});

test('corrupted encrypted QR fails closed and the encrypted entry remains for recovery', async () => {
  await saveLocalAccountQr('local:damaged', QR);
  const record = (await rawRows())[0];
  await putRaw({ ...record, sealedData: { ...record.sealedData, c: 'AA' } });
  await expect(getLocalAccountQr('local:damaged')).rejects.toThrow();
  expect((await rawRows())[0].id).toBe('local:damaged');
  await expect(migrateLocalAccountQrEncryption()).rejects.toThrow();
});

test('a claimed PNG with non-PNG content is rejected before encryption', async () => {
  await expect(saveLocalAccountQr('local:spoofed', 'data:image/png;base64,PHNjcmlwdD4='))
    .rejects.toThrow('invalid_account_qr_image');
});

test('invalid plaintext cannot bypass image validation during migration', async () => {
  await putRaw({ id: 'local:wrong-mime', dataUrl: 'data:text/html;base64,PHNjcmlwdD4=' });
  await expect(migrateLocalAccountQrEncryption()).rejects.toThrow('corrupt_legacy_data');
  expect((await rawRows())[0].dataUrl).toContain('data:text/html');
});
