import { prepareFinanceBackupRestore } from './financeBackupRestore';
const fp = item => [item.merchant, item.amount, item.account_id, item.occurred_at].join('|');
const options = { base: 'PHP', newId: (() => { let index = 0; return () => 'new-' + ++index; })(), fingerprint: fp };
const backup = {
  format:'movo-finance-backup',version:1,
  accounts:[{ id:'old', name:'Savings', account_type:'bank', currency:'PHP', opening_balance:200, balance:175 }],
  transactions:[{ id:'old-tx', merchant:'Food', amount:25, type:'expense', account_id:'old', date:'2026-11-01' }],
  tables:{},
};
test('restores account and transaction through new IDs without carrying foreign owner', () => {
  const value = prepareFinanceBackupRestore(backup, { accounts:[], transactions:[] }, options);
  expect(value.accounts).toHaveLength(1);
  expect(value.accounts[0].id).not.toBe('old');
  expect(value.transactions).toHaveLength(1);
  expect(value.transactions[0].account_id).toBe(value.accounts[0].id);
  expect(value.accounts[0].opening_balance).toBe(200);
  expect(value.transactions[0].user_id).toBeUndefined();
});
test('never double counts historical transactions when opening amount absent', () => {
  const value = prepareFinanceBackupRestore({ ...backup, accounts: [{ ...backup.accounts[0], opening_balance: undefined }] }, { accounts:[],transactions:[] }, options);
  expect(value.accounts[0].opening_balance).toBe(200);
});
test('preserves existing accounts by name and never duplicates transaction fingerprints', () => {
  const old = { id:'existing', name:'Savings', account_type:'bank' };
  const planned = prepareFinanceBackupRestore(backup,{ accounts:[old], transactions:[] }, options);
  expect(planned.accounts).toHaveLength(0);
  expect(planned.transactions[0].account_id).toBe('existing');
});
test('ignores foreign owner, subscriptions, and authenticated grants', () => {
  const planned = prepareFinanceBackupRestore({ ...backup, tables: {movo_plan_grants:[{tier:'pro_plus'}]} },{accounts:[],transactions:[]},options);
  expect(planned.unsupported).toContain('movo_plan_grants');
  expect(planned.accounts[0].user_id).toBeUndefined();
});
