import { IDBFactory } from 'fake-indexeddb';

jest.mock('./platform', () => ({ isNativeApp: () => true }));
jest.mock('./native', () => ({ MovoNative: { secureGet: jest.fn(), secureSet: jest.fn() } }));
jest.mock('@capacitor/preferences', () => ({
  Preferences: { keys: jest.fn(), get: jest.fn(), set: jest.fn(), remove: jest.fn() }
}));

const logicalKey = 'movo.local.transactions.v1';
const native = new Map();

function setup({ keyMissing = false } = {}) {
  jest.resetModules();
  const seed = globalThis.__MOVO_TEST_FINANCE_KEY__;
  if (keyMissing) delete globalThis.__MOVO_TEST_FINANCE_KEY__;
  const vault = require('./financeVault');
  globalThis.__MOVO_TEST_FINANCE_KEY__ = seed;
  const { Preferences } = require('@capacitor/preferences');
  const { MovoNative } = require('./native');
  Preferences.keys.mockImplementation(async () => ({ keys: [...native.keys()] }));
  Preferences.get.mockImplementation(async ({ key }) => ({ value: native.get(key) ?? null }));
  Preferences.set.mockImplementation(async ({ key, value }) => { native.set(key, value); });
  Preferences.remove.mockImplementation(async ({ key }) => { native.delete(key); });
  MovoNative.secureGet.mockResolvedValue({ value: null });
  return { vault, Preferences, MovoNative };
}

beforeEach(() => {
  localStorage.clear();
  native.clear();
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: new IDBFactory() });
});

test('a missing native seed cannot be replaced when only encrypted QR data survives', async () => {
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open('movo-account-media-v1', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('account-qr', { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction('account-qr', 'readwrite');
      tx.objectStore('account-qr').put({ id: 'qr-1', sealedData: { __movo_finance_sealed_v1: 1 } });
      tx.oncomplete = resolve;
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
  const { vault, MovoNative } = setup({ keyMissing: true });
  await expect(vault.initialiseFinanceVault()).rejects.toThrow('offline_cache_key_missing');
  expect(MovoNative.secureSet).not.toHaveBeenCalled();
});

test('interrupted native cleanup keeps different device copies and retries idempotently', async () => {
  const { vault, Preferences } = setup();
  localStorage.setItem(logicalKey, JSON.stringify([{ id: 'working' }]));
  native.set(logicalKey, JSON.stringify([{ id: 'unsynced-native' }]));
  Preferences.remove.mockRejectedValueOnce(new Error('interrupted'));
  await expect(vault.migrateFinanceLocalStorage()).rejects.toThrow('interrupted');
  const recovered = [...native.keys()].find(key => key.startsWith('movo.finance.recovery.v2:'));
  expect(native.get(recovered)).toBeTruthy();
  expect(native.get(recovered)).not.toContain('unsynced-native');
  expect(native.has(logicalKey)).toBe(true);
  const capsule = native.get(recovered);
  await expect(vault.migrateFinanceLocalStorage()).resolves.toBeUndefined();
  expect(native.get(recovered)).toBe(capsule);
  expect(native.has(logicalKey)).toBe(false);
  expect(vault.loadFinanceJson(logicalKey)).toEqual([{ id: 'working' }]);
});
