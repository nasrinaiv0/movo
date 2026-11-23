import { mergePreferences, mergePreferencesThreeWay, sameValue } from './prefsMerge';

const pay = (id, amount) => ({ id, amount, date: '2026-11-20', month: '2026-11' });

describe('three-way preference sync (audit 2026-11-23: balances differed between devices)', () => {
  test('a device with an older copy cannot erase a card payment recorded on another device', () => {
    const base = { theme: 'light', creditCardPayments: { card: [pay('p1', 1000)] } };
    // Phone A recorded a second payment and saved it.
    const remote = { ...base, creditCardPayments: { card: [pay('p1', 1000), pay('p2', 500)] } };
    // Phone B still has the older copy and only changed its theme.
    const local = { ...base, theme: 'dark' };
    const out = mergePreferencesThreeWay(base, local, remote);
    expect(out.theme).toBe('dark');
    expect(out.creditCardPayments.card.map(p => p.id)).toEqual(['p1', 'p2']);
  });

  test('payments recorded on both devices at the same time are all kept', () => {
    const base = { creditCardPayments: { card: [pay('p1', 1000)] } };
    const remote = { creditCardPayments: { card: [pay('p1', 1000), pay('p2', 500)], other: [pay('q1', 20)] } };
    const local = { creditCardPayments: { card: [pay('p1', 1000), pay('p3', 250)] } };
    const out = mergePreferencesThreeWay(base, local, remote);
    expect(out.creditCardPayments.card.map(p => p.id).sort()).toEqual(['p1', 'p2', 'p3']);
    expect(out.creditCardPayments.other.map(p => p.id)).toEqual(['q1']);
  });

  test("another device's card type, credit limit and bank link survive a stale save", () => {
    const base = { accountStyles: { card: { cardKind: 'debit' }, gcash: { chip: 'gold' } }, cardBankLinks: {} };
    const remote = { accountStyles: { card: { cardKind: 'credit', creditLimit: 50000 }, gcash: { chip: 'gold' } }, cardBankLinks: { card2: 'bank' } };
    const local = { accountStyles: { card: { cardKind: 'debit' }, gcash: { chip: 'silver' } }, cardBankLinks: {} };
    const out = mergePreferencesThreeWay(base, local, remote);
    expect(out.accountStyles.card).toEqual({ cardKind: 'credit', creditLimit: 50000 });
    expect(out.accountStyles.gcash).toEqual({ chip: 'silver' });
    expect(out.cardBankLinks).toEqual({ card2: 'bank' });
  });

  test('list edits, additions and removals on this device apply to the latest list', () => {
    const base = { budgets: [{ id: 'a', limit: 100 }, { id: 'b', limit: 200 }] };
    const remote = { budgets: [{ id: 'a', limit: 100 }, { id: 'b', limit: 200 }, { id: 'c', limit: 300 }] };
    const local = { budgets: [{ id: 'a', limit: 150 }, { id: 'd', limit: 400 }] }; // edited a, removed b, added d
    expect(mergePreferencesThreeWay(base, local, remote).budgets).toEqual([{ id: 'a', limit: 150 }, { id: 'c', limit: 300 }, { id: 'd', limit: 400 }]);
  });

  test('settings this device did not touch follow the account; settings it changed are kept', () => {
    const base = { theme: 'light', currency: 'PHP', fontSize: 'default' };
    const remote = { theme: 'light', currency: 'USD', fontSize: 'large' };
    const local = { theme: 'dark', currency: 'PHP', fontSize: 'default' };
    expect(mergePreferencesThreeWay(base, local, remote)).toMatchObject({ theme: 'dark', currency: 'USD', fontSize: 'large' });
  });

  test('nothing changed anywhere: the result equals the account copy', () => {
    const copy = { theme: 'dark', budgets: [{ id: 'a' }], accountStyles: { x: { cardKind: 'credit' } }, readIds: ['n1'] };
    expect(sameValue(mergePreferencesThreeWay(copy, copy, copy), mergePreferencesThreeWay(copy, copy, copy))).toBe(true);
    expect(mergePreferencesThreeWay(copy, copy, copy)).toMatchObject(copy);
  });

  test('first sign-in merge keeps card payments from this device and the account', () => {
    const out = mergePreferences({}, { creditCardPayments: { card: [pay('local', 10)] } }, { creditCardPayments: { card: [pay('cloud', 20)] } });
    expect(out.creditCardPayments.card.map(p => p.id).sort()).toEqual(['cloud', 'local']);
  });
});
