import { mergePreferences, unionById } from './prefsMerge';

const D = { theme: 'system', cardStyles: {}, layouts: {}, budgets: [], subscriptions: [], readIds: [], pushed: [], notifSeenAt: '', onboarded: false };

test('keeps this device’s cached work when the account copy arrives', () => {
  const local = { theme: 'dark', cardStyles: { a: 'mint' }, subscriptions: [{ id: 's1', name: 'Local' }, { id: 's2', name: 'Only here' }], readIds: ['n1'], notifSeenAt: '2026-10-30T10:00:00Z' };
  const cloud = { theme: 'light', cardStyles: { b: 'ink' }, subscriptions: [{ id: 's1', name: 'Account' }], readIds: ['n2'], notifSeenAt: '2026-10-29T10:00:00Z' };
  const m = mergePreferences(D, local, cloud);
  expect(m.theme).toBe('light');
  expect(m.cardStyles).toEqual({ a: 'mint', b: 'ink' });
  expect(m.subscriptions).toEqual([{ id: 's1', name: 'Account' }, { id: 's2', name: 'Only here' }]);
  expect(m.readIds.sort()).toEqual(['n1', 'n2']);
  expect(m.notifSeenAt).toBe('2026-10-30T10:00:00Z');
  expect(m.onboarded).toBe(true);
});

test('ignores malformed values', () => {
  const m = mergePreferences(D, { budgets: 'x', layouts: [] }, { budgets: [null, { id: 3 }, { id: 'b' }], readIds: [1, 'r'] });
  expect(m.budgets).toEqual([{ id: 'b' }]);
  expect(m.layouts).toEqual({});
  expect(m.readIds).toEqual(['r']);
});

test('unionById puts the account copy first and caps the list', () => {
  expect(unionById([{ id: 'a', v: 1 }], [{ id: 'a', v: 2 }, { id: 'b' }], 1)).toEqual([{ id: 'a', v: 1 }]);
});
