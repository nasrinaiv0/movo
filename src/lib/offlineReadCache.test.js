import { cachedList, readCachedList } from './offlineReadCache';
import { supabase } from './supabaseClient';

jest.mock('./supabaseClient', () => ({ supabase: { auth: { getSession: jest.fn() } } }));
const OWNER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const signedIn = (id) => supabase.auth.getSession.mockResolvedValue({ data: { session: id ? { user: { id } } : null } });
const offline = () => Promise.reject(new TypeError('Failed to fetch'));

beforeEach(() => { window.localStorage.clear(); signedIn(OWNER); });

test('a cloud list is kept on this device and shown offline (owner, 2026-11-12)', async () => {
  const loans = [{ id: 'l1', name: 'Car loan' }];
  await expect(cachedList('loans', async () => loans)).resolves.toEqual(loans);
  expect(readCachedList(OWNER, 'loans').rows).toEqual(loans);
  await expect(cachedList('loans', offline)).resolves.toEqual(loans);
});

test('server answers (permission, plan, validation) are never hidden behind the copy', async () => {
  await cachedList('loans', async () => [{ id: 'l1' }]);
  const denied = Object.assign(new Error('permission denied for table loans'), { code: '42501' });
  await expect(cachedList('loans', () => Promise.reject(denied))).rejects.toBe(denied);
});

test('one account never sees another account’s copy, and nothing is kept or shown while signed out', async () => {
  await cachedList('loans', async () => [{ id: 'mine' }]);
  signedIn(OTHER);
  await expect(cachedList('loans', offline)).rejects.toThrow('Failed to fetch');
  signedIn(null);
  await expect(cachedList('loans', offline)).rejects.toThrow('Failed to fetch');
  await cachedList('receivables', async () => [{ id: 'r1' }]);
  expect(Object.keys(window.localStorage).filter(k => k.includes('receivables'))).toEqual([]);
});

test('date-range lists fall back to the latest copy; one record’s history never shows another record’s', async () => {
  await cachedList('billOccurrences', async () => [{ id: 'o1' }], '2026-12-13,2025-11-12', { latest: true });
  await expect(cachedList('billOccurrences', offline, '2026-12-14,2025-11-13', { latest: true })).resolves.toEqual([{ id: 'o1' }]);
  await cachedList('loanEvents', async () => [{ id: 'e1', loan: 'A' }], 'A');
  await expect(cachedList('loanEvents', offline, 'A')).resolves.toEqual([{ id: 'e1', loan: 'A' }]);
  await expect(cachedList('loanEvents', offline, 'B')).rejects.toThrow('Failed to fetch');
});

test('no saved copy yet: the offline error is shown as before', async () => {
  await expect(cachedList('goals', offline)).rejects.toThrow('Failed to fetch');
});
