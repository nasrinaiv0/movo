import { accountSpendingHistory, spendingAccountIds } from './accountSpending';

const date = daysAgo => { const value = new Date(); value.setDate(value.getDate() - daysAgo); return value.toISOString(); };
const accounts = [
  { id: 'bank-1', account_type: 'bank', currency: 'PHP' },
  { id: 'debit-1', account_type: 'card', cardKind: 'debit', linkedAccountId: 'bank-1' },
  { id: 'debit-2', account_type: 'card', cardKind: 'debit' },
  { id: 'credit-1', account_type: 'card', cardKind: 'credit' },
  { id: 'cash-1', account_type: 'cash' },
];
const prefs = { cardBankLinks: { 'debit-1': 'bank-1', 'debit-2': 'bank-1' } };

test('a bank and all linked debit cards resolve to one shared spending source', () => {
  expect(spendingAccountIds(accounts[0], accounts, prefs).sort()).toEqual(['bank-1', 'debit-1', 'debit-2']);
  expect(spendingAccountIds(accounts[1], accounts, prefs).sort()).toEqual(['bank-1', 'debit-1', 'debit-2']);
  expect(spendingAccountIds(accounts[2], accounts, prefs).sort()).toEqual(['bank-1', 'debit-1', 'debit-2']);
});

test('credit cards remain independent from their issuing bank balance and spend', () => {
  const linkedCredit = { ...accounts[3], id: 'credit-1', issuerBankId: 'bank-1' };
  expect(spendingAccountIds(linkedCredit, [...accounts, linkedCredit], prefs)).toEqual(['credit-1']);
});

test('cash and unrelated accounts remain independent', () => {
  expect(spendingAccountIds(accounts[4], accounts, prefs)).toEqual(['cash-1']);
});

test('ten-day chart combines bank and linked debit-card expenses, excluding income, transfers and old rows', () => {
  const history = accountSpendingHistory({ account: accounts[1], accounts, prefs, transactions: [
    { id: 'bank-expense', account_id: 'bank-1', type: 'expense', amount: 100, date: date(0) },
    { id: 'card-expense', account_id: 'debit-1', type: 'expense', amount: 50, date: date(1) },
    { id: 'sibling-card-expense', account_id: 'debit-2', type: 'expense', amount: 25, date: date(0) },
    { id: 'income', account_id: 'bank-1', type: 'income', amount: 500, date: date(0) },
    { id: 'credit-expense', account_id: 'credit-1', type: 'expense', amount: 900, date: date(0) },
    { id: 'old-expense', account_id: 'bank-1', type: 'expense', amount: 800, date: date(12) },
    { id: 'transfer-to-bank', account_id: 'cash-1', transfer_to_account_id: 'bank-1', type: 'transfer', amount: 400, date: date(0) },
  ] });
  expect(history).toHaveLength(10);
  expect(history.reduce((sum, day) => sum + day.total, 0)).toBe(175);
});

test('credit-card chart only includes purchases posted to that card', () => {
  const history = accountSpendingHistory({ account: accounts[3], accounts, prefs, transactions: [
    { account_id: 'credit-1', type: 'expense', amount: 200, date: date(0) },
    { account_id: 'bank-1', type: 'expense', amount: 300, date: date(0) },
  ] });
  expect(history.reduce((sum, day) => sum + day.total, 0)).toBe(200);
});
