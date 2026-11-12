import 'fake-indexeddb/auto';
import { webcrypto } from 'crypto';
import { cachedList, readCachedList, writeCachedList } from './offlineReadCache';
import { supabase } from './supabaseClient';
import { CACHE_PREFIX, encryptFinancialCache } from './financeCacheCrypto';

jest.mock('./supabaseClient', () => ({ supabase: { auth: { getSession: jest.fn() } } }));
jest.mock('./platform', () => ({ isNativeApp: () => false }));
const OWNER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const signedIn = id => supabase.auth.getSession.mockResolvedValue({ data: { session: id ? { user: { id } } : null } });
const offline = () => Promise.reject(new TypeError('Failed to fetch'));

beforeAll(() => {
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: webcrypto });
});
beforeEach(() => { window.localStorage.clear(); signedIn(OWNER); });

test('cloud lists are encrypted with AES-256-GCM and available offline after restart', async () => {
  const rows = [{ id: 'l1', name: 'Private car loan', amount: 1234.56 }];
  await expect(encryptFinancialCache(OWNER, 'loans', { owner: OWNER, savedAt: '2026-11-12', rows })).resolves.toContain('"ct"');
  await expect(cachedList('loans', async () => rows)).resolves.toEqual(rows);
  const raw = localStorage.getItem(CACHE_PREFIX + OWNER + ':loans');
  expect(raw).not.toContain('Private car loan');
  expect(JSON.parse(raw)).toMatchObject({ v: 2, alg: 'A256GCM' });
  expect((await readCachedList(OWNER, 'loans')).rows).toEqual(rows);
  await expect(cachedList('loans', offline)).resolves.toEqual(rows);
});

test('a settings object (reminder preferences) is encrypted and available offline too', async () => {
  const prefs = { enabled: true, reminder_days: [1, 3], quiet_start: '22:00', quiet_end: '07:00', timezone: 'Asia/Manila' };
  await expect(cachedList('reminderPreferences', async () => prefs, OWNER)).resolves.toEqual(prefs);
  const raw = localStorage.getItem(CACHE_PREFIX + OWNER + ':reminderPreferences|' + OWNER);
  expect(raw).not.toContain('Asia/Manila');
  await expect(cachedList('reminderPreferences', offline, OWNER)).resolves.toEqual(prefs);
});

test('owner/name authenticated encryption prevents swapping, tampering and cross-account reads', async () => {
  const rows = [{ id: 'private-row', name: 'Sensitive information' }];
  await writeCachedList(OWNER, 'loans', rows);
  const raw = localStorage.getItem(CACHE_PREFIX + OWNER + ':loans');
  localStorage.setItem(CACHE_PREFIX + OWNER + ':goals', raw);
  expect(await readCachedList(OWNER, 'goals')).toBeNull();
  localStorage.setItem(CACHE_PREFIX + OTHER + ':loans', raw);
  expect(await readCachedList(OTHER, 'loans')).toBeNull();
  const ciphertext = JSON.parse(raw);
  ciphertext.ct = ciphertext.ct.slice(0, -4) + 'AAAA';
  localStorage.setItem(CACHE_PREFIX + OWNER + ':loans', JSON.stringify(ciphertext));
  expect(await readCachedList(OWNER, 'loans')).toBeNull();
  expect(localStorage.getItem(CACHE_PREFIX + OWNER + ':loans')).toContain('"ct"');
});

test('legacy plaintext is migrated without losing data, then scrubbed', async () => {
  const key = CACHE_PREFIX + OWNER + ':billPayments';
  localStorage.setItem(key, JSON.stringify({ owner: OWNER, savedAt: '2026-11-12T00:00:00Z', rows: [{ description: 'PRIVATE payment' }] }));
  const restored = await readCachedList(OWNER, 'billPayments');
  expect(restored.rows[0].description).toBe('PRIVATE payment');
  const stored = localStorage.getItem(key);
  expect(stored).not.toContain('PRIVATE payment');
  expect(JSON.parse(stored).v).toBe(2);
});

test('a failed encryption migration never destroys the original recoverable plaintext', async () => {
  const key = CACHE_PREFIX + OWNER + ':budgets';
  const legacy = JSON.stringify({ owner: OWNER, savedAt: '2026-11-12', rows: [{ name: 'PRIVATE budget' }] });
  localStorage.setItem(key, legacy);
  const savedCrypto = globalThis.crypto;
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: {} });
  try { expect(await readCachedList(OWNER, 'budgets')).toBeNull(); }
  finally { Object.defineProperty(globalThis, 'crypto', { configurable: true, value: savedCrypto }); }
  expect(localStorage.getItem(key)).toBe(legacy);
  await expect(readCachedList(OWNER, 'budgets')).resolves.toMatchObject({ owner: OWNER });
  expect(localStorage.getItem(key)).not.toContain('PRIVATE budget');
});

test('permission/plan denials never fall back to old cache', async () => {
  await cachedList('loans', async () => [{ id: 'l1' }]);
  const denied = Object.assign(new Error('permission denied'), { code: '42501' });
  await expect(cachedList('loans', () => Promise.reject(denied))).rejects.toBe(denied);
});

test('signed-out and different owner sessions never read another account\'s cache', async () => {
  await cachedList('loans', async () => [{ id: 'mine' }]);
  signedIn(OTHER);
  await expect(cachedList('loans', offline)).rejects.toThrow('Failed to fetch');
  signedIn(null);
  await expect(cachedList('loans', offline)).rejects.toThrow('Failed to fetch');
  await cachedList('receivables', async () => [{ id: 'secret' }]);
  expect(Object.keys(localStorage).filter(k => k.includes('receivables'))).toEqual([]);
});

test('latest date-range fallback never substitutes another record\'s history', async () => {
  await cachedList('billOccurrences', async () => [{ id: 'o1' }], '2026-12-13,2025-11-12', { latest: true });
  await expect(cachedList('billOccurrences', offline, '2026-12-14,2025-11-13', { latest: true })).resolves.toEqual([{ id: 'o1' }]);
  await cachedList('loanEvents', async () => [{ id: 'e1', loan: 'A' }], 'A');
  await expect(cachedList('loanEvents', offline, 'A')).resolves.toEqual([{ id: 'e1', loan: 'A' }]);
  await expect(cachedList('loanEvents', offline, 'B')).rejects.toThrow('Failed to fetch');
});

test('no saved copy fails visibly; storage failure cannot downgrade to plaintext', async () => {
  await expect(cachedList('goals', offline)).rejects.toThrow('Failed to fetch');
  const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
  try { expect(await writeCachedList(OWNER, 'goals', [{ sensitive: 'never persisted' }])).toBe(false); }
  finally { setItem.mockRestore(); }
  expect(localStorage.getItem(CACHE_PREFIX + OWNER + ':goals')).toBeNull();
});
