import { planPreferenceRestore, backupPreferenceSource } from './backupPreferences';

const DEFAULTS = { theme: 'system', currency: 'PHP', layouts: {}, profileName: '', subscriptions: [], cryptoWatchlist: ['btc-bitcoin'] };
const map = { 'old-bank': 'new-bank', 'old-card': 'new-card' };
const backup = prefs => ({ tables: { local_preferences: [prefs] } });

test('reads local or cloud preference rows', () => {
  expect(backupPreferenceSource(backup({ a: 1 }))).toEqual({ a: 1 });
  expect(backupPreferenceSource({ tables: { user_preferences: [{ user_id: 'u', prefs: { b: 2 } }] } })).toEqual({ b: 2 });
  expect(backupPreferenceSource({ tables: {} })).toBeNull();
});

test('lists merge by id without overwriting this device, and account links follow the id map or are cleared', () => {
  const current = { subscriptions: [{ id: 's1', name: 'Mine' }] };
  const { patch, counts } = planPreferenceRestore(backup({
    subscriptions: [{ id: 's1', name: 'Theirs' }, { id: 's2', name: 'New', accountId: 'old-card' }, { id: 's3', name: 'Gone', accountId: 'deleted-account' }],
  }), current, map, DEFAULTS);
  expect(counts.subscriptions).toBe(2);
  expect(patch.subscriptions.map(s => [s.id, s.name])).toEqual([['s1', 'Mine'], ['s2', 'New'], ['s3', 'Gone']]);
  expect(patch.subscriptions[1].accountId).toBe('new-card');
  expect(patch.subscriptions[2].accountId).toBe('');
});

test('per-account settings move to the restored account; this device keeps its own; unmapped accounts are dropped', () => {
  const { patch } = planPreferenceRestore(backup({
    accountStyles: { 'old-card': { cardKind: 'credit', creditLimit: 9000, issuerBankId: 'old-bank' }, 'old-bank': { color: 'blue' }, other: { color: 'x' } },
    cardBankLinks: { 'old-card': 'old-bank', ghost: 'old-bank' },
    creditCardPayments: { 'old-card': [{ id: 'p1', amount: 5 }] },
  }), { accountStyles: { 'new-bank': { color: 'mine' } } }, map, DEFAULTS);
  expect(patch.accountStyles).toEqual({ 'new-bank': { color: 'mine' }, 'new-card': { cardKind: 'credit', creditLimit: 9000, issuerBankId: 'new-bank' } });
  expect(patch.cardBankLinks).toEqual({ 'new-card': 'new-bank' });
  expect(patch.creditCardPayments).toEqual({ 'new-card': [{ id: 'p1', amount: 5 }] });
});

test('personal settings fill in only where this device still has its default; secrets and device state never come back', () => {
  const { patch } = planPreferenceRestore(backup({
    theme: 'dark', currency: 'USD', profileName: 'Ana', layouts: { home: ['balance'] }, autoLogKey: 'secret', devices: [{ id: 'x' }],
    cloudSyncEnabled: false, onboarded: true, readIds: ['n1'], unknownKey: 'x', cryptoWatchlist: ['btc-bitcoin', 'eth-ethereum'],
  }), { theme: 'light', currency: 'PHP', profileName: '', layouts: {}, cryptoWatchlist: ['btc-bitcoin'] }, map, DEFAULTS);
  expect(patch).toEqual({ currency: 'USD', profileName: 'Ana', layouts: { home: ['balance'] }, cryptoWatchlist: ['btc-bitcoin', 'eth-ethereum'] });
});

test('only real image data is restored for photos; the better streak wins', () => {
  const png = 'data:image/png;base64,iVBORw0KGgo=';
  const { patch } = planPreferenceRestore(backup({ profilePhoto: png, mascot: 'javascript:alert(1)', streak: { last: '2026-11-01', count: 3, best: 40 } }),
    { streak: { last: '2026-11-09', count: 5, best: 12 } }, map, DEFAULTS);
  expect(patch.profilePhoto).toBe(png);
  expect(patch.mascot).toBeUndefined();
  expect(patch.streak.best).toBe(40);
});

test('QR codes are listed for restore only for restored accounts this device has no QR for', () => {
  const { qrCodes } = planPreferenceRestore(backup({ accountQrCodes: { 'old-bank': 'localqr:x', 'old-card': 'path', ghost: 'y' } }),
    { accountQrCodes: { 'new-card': 'mine' } }, map, DEFAULTS);
  expect(qrCodes).toEqual([{ from: 'old-bank', to: 'new-bank' }]);
});
