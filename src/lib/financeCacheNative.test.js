import { webcrypto } from 'crypto';
import { Preferences } from '@capacitor/preferences';
import { MovoNative } from './native';
import { CACHE_PREFIX, CACHE_VAULT_KEY, encryptFinancialCache } from './financeCacheCrypto';
import { readCachedList, writeCachedList, migrateLegacyOfflineReadCache } from './offlineReadCache';

jest.mock('./supabaseClient', () => ({ supabase: { auth: { getSession: jest.fn(async () => ({ data: { session: null } })) } } }));
jest.mock('./platform', () => ({ isNativeApp: () => true }));
jest.mock('./native', () => ({ MovoNative: { secureGet: jest.fn(), secureSet: jest.fn() } }));
jest.mock('@capacitor/preferences', () => ({
  Preferences: { keys: jest.fn(), get: jest.fn(), remove: jest.fn() }
}));
const OWNER = '11111111-1111-4111-8111-111111111111';
const key = name => CACHE_PREFIX + OWNER + ':' + name;
let sealedKey = null;
const legacyPreferences = new Map();

beforeAll(() => {
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: webcrypto });
});
beforeEach(() => {
  // react-scripts Jest resets mocks between tests; restore behavior per test.
  MovoNative.secureGet.mockImplementation(async ({ key }) => ({ value: key === CACHE_VAULT_KEY ? sealedKey : null }));
  MovoNative.secureSet.mockImplementation(async ({ key, value }) => { if (key !== CACHE_VAULT_KEY) throw new Error('wrong_key'); sealedKey = value; });
  Preferences.keys.mockImplementation(async () => ({ keys: Array.from(legacyPreferences.keys()) }));
  Preferences.get.mockImplementation(async ({ key }) => ({ value: legacyPreferences.get(key) ?? null }));
  Preferences.remove.mockImplementation(async ({ key }) => { legacyPreferences.delete(key); });
  localStorage.clear();
  legacyPreferences.clear();
});

test('native app keeps only ciphertext in web storage; vault key lives in Keychain / Keystore', async () => {
  await expect(encryptFinancialCache(OWNER, 'loans', { owner: OWNER, savedAt: '2026-11-12', rows: [] })).resolves.toContain('"ct"');
  expect(await writeCachedList(OWNER, 'loans', [{ name: 'Private student loan', balance: 8400 }])).toBe(true);
  expect(MovoNative.secureSet).toHaveBeenCalledWith({ key: CACHE_VAULT_KEY, value: expect.any(String) });
  const raw = localStorage.getItem(key('loans'));
  expect(raw).not.toContain('Private student loan');
  expect(JSON.parse(raw)).toMatchObject({ v: 2, alg: 'A256GCM' });
  expect((await readCachedList(OWNER, 'loans')).rows[0].name).toBe('Private student loan');
  expect(legacyPreferences.has(key('loans'))).toBe(false);
});

test('native legacy Preferences are migrated only after encrypted write, then deleted', async () => {
  legacyPreferences.set(key('bills'), JSON.stringify({ owner: OWNER, savedAt: '2026-11-12', rows: [{ label: 'Private rent bill' }] }));
  expect((await readCachedList(OWNER, 'bills')).rows[0].label).toBe('Private rent bill');
  expect(localStorage.getItem(key('bills'))).not.toContain('Private rent bill');
  expect(legacyPreferences.has(key('bills'))).toBe(false);
});

test('failed legacy cleanup preserves encrypted data and permits a later scrub', async () => {
  legacyPreferences.set(key('budgets'), JSON.stringify({ owner: OWNER, savedAt: '2026-11-12', rows: [{ label: 'Private school budget' }] }));
  Preferences.remove.mockRejectedValueOnce(new Error('locked'));
  expect(await readCachedList(OWNER, 'budgets')).toBeNull();
  expect(legacyPreferences.has(key('budgets'))).toBe(true);
  expect(localStorage.getItem(key('budgets'))).not.toContain('Private school budget');
  expect((await readCachedList(OWNER, 'budgets')).rows[0].label).toBe('Private school budget');
  expect(legacyPreferences.has(key('budgets'))).toBe(false);
});

test('background migration touches only the read-cache keys, not offline sync or account data', async () => {
  legacyPreferences.set(key('goals'), JSON.stringify({ owner: OWNER, savedAt: '2026-11-12', rows: [{ label: 'Private goal' }] }));
  legacyPreferences.set('movo.offline.workspace.v2.' + OWNER, '{"dirty":true}');
  expect(await migrateLegacyOfflineReadCache()).toBe(true);
  expect(localStorage.getItem(key('goals'))).not.toContain('Private goal');
  expect(legacyPreferences.has(key('goals'))).toBe(false);
  expect(legacyPreferences.has('movo.offline.workspace.v2.' + OWNER)).toBe(true);
});
