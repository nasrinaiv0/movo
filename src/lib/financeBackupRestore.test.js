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


test('rejects source accounts sharing the same name before any transaction can be assigned', () => {
  const bad = { ...backup,
    accounts: [backup.accounts[0], { ...backup.accounts[0], id:'another', currency:'USD' }],
    transactions: [
      backup.transactions[0],
      { ...backup.transactions[0], id:'second', account_id:'another', amount:30 },
    ],
  };
  expect(() => prepareFinanceBackupRestore(bad,{ accounts:[],transactions:[] },options)).toThrow(/duplicate account names/);
});

test('fails safely when an existing account with a matching name has an incompatible currency', () => {
  expect(() => prepareFinanceBackupRestore(backup,{
    accounts:[{id:'existing',name:'Savings',account_type:'bank',currency:'USD'}],transactions:[],
  },options)).toThrow(/different type or currency/);
});

test('does not silently book a transaction referencing a missing source account as cash', () => {
  const bad = { ...backup, transactions:[{ ...backup.transactions[0], account_id:'missing-account' }] };
  expect(() => prepareFinanceBackupRestore(bad,{ accounts:[],transactions:[] },options)).toThrow(/not included in the backup/);
});

test('rejects invalid transaction rows instead of silently dropping them from a financial backup', () => {
  const bad = { ...backup, transactions:[...backup.transactions,{id:'bad',amount:null,merchant:'Broken'}] };
  expect(() => prepareFinanceBackupRestore(bad,{ accounts:[],transactions:[] },options)).toThrow(/missing amounts/);
});

test('rejects ambiguous destination account names in the live wallet', () => {
  expect(() => prepareFinanceBackupRestore(backup,{
    accounts:[
      {id:'a',name:'Savings',account_type:'bank',currency:'PHP'},
      {id:'b',name:'savings',account_type:'bank',currency:'PHP'},
    ],transactions:[],
  },options)).toThrow(/Multiple existing accounts share a name/);
});


test('rejects differently spaced duplicate account names before assigning imported payments', () => {
  const bad = { ...backup,
    accounts: [backup.accounts[0], { ...backup.accounts[0], id:'a-second', name:'  Savings  ' }],
  };
  expect(() => prepareFinanceBackupRestore(bad,{accounts:[],transactions:[]},options)).toThrow(/duplicate account names/);
});
