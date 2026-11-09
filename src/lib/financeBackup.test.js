import { parseFinanceBackup, createFinanceBackup } from './financeBackup';
jest.mock('./supabaseClient', () => ({ supabase: null }));
test('round trips local balances and records without automation keys', async () => {
  const backup = await createFinanceBackup({accountsView:[{id:'bank',balance:123.45}],txs:[{id:'tx',amount:1.23}],prefs:{autoLogKey:'secret',budgets:[{id:'budget'}]}});
  const restored = parseFinanceBackup(JSON.stringify(backup));
  expect(restored.accounts[0].balance).toBe(123.45);
  expect(restored.transactions[0].amount).toBe(1.23);
  expect(JSON.stringify(restored)).not.toContain('secret');
});
test.each(['{}','null','{"format":"movo-finance-backup","version":1,"accounts":[],"transactions":[],"tables":{"__proto__":{}}}'])('rejects malformed backup: %s', text => {
  expect(() => parseFinanceBackup(text)).toThrow();
});
test('does not import subscription grants', () => {
  const result = parseFinanceBackup(JSON.stringify({ format:'movo-finance-backup',version:1,accounts:[],transactions:[],tables:{movo_plan_grants:[{tier:'pro_plus'}]} }));
  expect(result.tables).toEqual({});
});

test('exports every preference group the Menu uses, the own rows, and never cloud accounting activity', async () => {
  const prefs = { autoLogKey: 'secret', devices: [{ id: 'd' }], subscriptions: [{ id: 's1' }], plans: [{ id: 'p1' }], spendingLimits: [{ id: 'l1' }],
    accountStyles: { bank: { color: 'red' } }, creditCardPayments: { card: [{ id: 'pay' }] }, archive: [{ id: 'transaction:x' }] };
  const rawTxs = [{ id: 'raw', amount: 10, currency: 'USD', transaction_type: 'expense', category: 'food:restaurants' }];
  const txs = [{ id: 'raw', amount: 560, currency: 'PHP', type: 'expense' }, { id: 'allocation-1', type: 'allocation', amount: 5 }];
  const backup = await createFinanceBackup({ accountsView: [], txs, rawTxs, prefs });
  const local = backup.tables.local_preferences[0];
  ['subscriptions', 'plans', 'spendingLimits', 'accountStyles', 'creditCardPayments', 'archive'].forEach(key => expect(local[key]).toEqual(prefs[key]));
  expect(local.autoLogKey).toBeUndefined();
  expect(local.devices).toBeUndefined();
  expect(backup.transactions).toEqual(rawTxs);
});
test('an unreadable receipt is counted and left out instead of cancelling the whole backup', async () => {
  const backup = await createFinanceBackup({ accountsView: [], rawTxs: [{ id: 't', transaction_type: 'expense', amount: 1, receipt_path: 'cloud/missing.jpg' }], prefs: {} });
  expect(backup.missingAttachments).toBe(1);
  expect(backup.attachments).toEqual([]);
});
