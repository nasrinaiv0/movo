const calls = [];
const chain = (result) => {
  const q = {};
  ['select', 'eq', 'upsert'].forEach(m => { q[m] = (...args) => { calls.push([m, ...args]); return q; }; });
  q.maybeSingle = async () => result; q.single = async () => result;
  return q;
};
const mockTables = [];
const mockFrom = (table) => { mockTables.push(table); return chain({ data: { prefs: { theme: 'dark' }, stickers: [], updated_at: 'now' }, error: null }); };
jest.mock('./supabaseClient', () => ({ supabase: { from: (...a) => mockFrom(...a) } }));
const { loadPreferences, savePreferences } = require('./financeRepository');
const { replaceCustomStickers, getCustomStickers } = require('./stickers');

beforeEach(() => { calls.length = 0; mockTables.length = 0; });

test('loads and saves only the signed-in user\'s preferences row', async () => {
  await expect(loadPreferences('')).rejects.toThrow('signed-in user');
  const row = await loadPreferences('user-1');
  expect(row.prefs).toEqual({ theme: 'dark' });
  expect(mockTables).toEqual(['user_preferences']);
  expect(calls).toContainEqual(['eq', 'user_id', 'user-1']);
  await savePreferences('user-1', { theme: 'light' }, [{ id: 's', src: 'data:image/jpeg;base64,AAAA' }]);
  const upsert = calls.find(c => c[0] === 'upsert');
  expect(upsert[1]).toMatchObject({ user_id: 'user-1', prefs: { theme: 'light' }, stickers: [{ id: 's' }] });
  expect(upsert[2]).toEqual({ onConflict: 'user_id' });
});

test('cloud sticker lists are validated before replacing the device list', () => {
  expect(replaceCustomStickers([
    { id: 'ok', src: 'data:image/jpeg;base64,QUJD' },
    { id: 'svg', src: 'data:image/svg+xml;base64,PHN2Zz4=' },
    { id: 'remote', src: 'https://evil.example/x.png' },
    { src: 'data:image/png;base64,QUJD' },
  ])).toBe(true);
  expect(getCustomStickers().map(s => s.id)).toEqual(['ok']);
});
