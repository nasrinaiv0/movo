import { loadUserLocalWorkspace, saveUserLocalWorkspace, loadLocalAccounts } from './localFinanceStore';

const a = { id:'a', name:'Cash', account_type:'cash', opening_balance:120, balance:120 };
const data = { accounts:[a], transactions:[{id:'t',account_id:'a',amount:5,type:'expense'}], postings:[],activities:[],budgets:[] };
beforeEach(() => window.localStorage.clear());

test('atomic user-scoped snapshots never leak into guest or another account', () => {
  expect(saveUserLocalWorkspace('user-1', data)).toBe(true);
  expect(loadUserLocalWorkspace('user-1').accounts[0].id).toBe('a');
  expect(loadUserLocalWorkspace('user-2')).toBeNull();
  expect(loadLocalAccounts()).toEqual([]);
});

test('rejects invalid owner keys and incomplete snapshots without writing', () => {
  expect(saveUserLocalWorkspace('../guest', data)).toBe(false);
  expect(saveUserLocalWorkspace('user-2', { accounts:[a], transactions:[] })).toBe(false);
  expect(loadUserLocalWorkspace('../guest')).toBeNull();
});
test('storage write failure does not replace the prior workspace', () => {
  expect(saveUserLocalWorkspace('user-1',data)).toBe(true);
  const current = window.localStorage.getItem('movo.local.workspace.v1.user-1');
  const original = Storage.prototype.setItem;
  Storage.prototype.setItem = jest.fn(() => { throw new Error('quota'); });
  try { expect(saveUserLocalWorkspace('user-1',{...data,transactions:[]})).toBe(false); }
  finally { Storage.prototype.setItem = original; }
  expect(window.localStorage.getItem('movo.local.workspace.v1.user-1')).toBe(current);
});
