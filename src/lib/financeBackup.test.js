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
