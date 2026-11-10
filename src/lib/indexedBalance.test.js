import { buildIndexedBalances } from './indexedBalance';
import { accountBalance, accountAvailableBalance } from './financeCalculations';

const accounts = [
  { id: 'bank', account_type: 'bank', currency: 'PHP', opening_balance: 1000 },
  { id: 'debit', account_type: 'card', currency: 'PHP', opening_balance: 0 },
  { id: 'card', account_type: 'card', currency: 'PHP', opening_balance: -200 },
  { id: 'wallet', account_type: 'e_wallet', currency: 'USD', opening_balance: 15 },
];
const rows = [
  { id: '1', type: 'expense', account_id: 'debit', amount: 30.15, currency: 'PHP' },
  { id: '2', type: 'transfer', account_id: 'bank', transfer_to_account_id: 'debit', amount: 12.25, currency: 'PHP' },
  { id: '3', type: 'income', account_id: 'bank', amount: 45.5, currency: 'PHP' },
  { id: '4', type: 'transfer', account_id: 'bank', transfer_to_account_id: 'wallet', amount: 100, currency: 'PHP' },
  { id: '5', type: 'expense', account_id: 'wallet', amount: 2, currency: 'USD' },
  { id: '6', type: 'accounting_posting', account_id: 'card', signed_amount: -2.75, currency: 'PHP' },
  { id: '7', type: 'expense', account_id: 'card', amount: 22.2, currency: 'PHP', is_pending: true },
  { id: '8', type: 'income', account_id: 'wallet', amount: 8.4, currency: 'USD', status: 'reversed' },
  { id: '9', type: 'transfer', account_id: 'debit', transfer_to_account_id: 'wallet', amount: 8, currency: 'PHP', is_pending: true },
];
const links = { debit: 'bank' };
const styles = { debit: { cardKind: 'debit' }, card: { cardKind: 'credit' } };
const fx = (amount, from, to) => from === to ? amount :
  from === 'PHP' && to === 'USD' ? amount / 50 : from === 'USD' && to === 'PHP' ? amount * 50 : NaN;

test('single-pass balances exactly match canonical account balance and pending holds', () => {
  const indexed = buildIndexedBalances(accounts, rows, links, styles, fx, true);
  for (const account of accounts) {
    const target = account.id === 'debit' ? accounts[0] : account;
    const prepared = target.id === 'bank' ? rows.map(t => ({
      ...t,
      account_id: t.account_id === 'debit' ? 'bank' : t.account_id,
      transfer_to_account_id: t.transfer_to_account_id === 'debit' ? 'bank' : t.transfer_to_account_id,
    })) : rows;
    const settled = accountBalance(target, prepared, fx, target.opening_balance);
    const available = accountAvailableBalance(target, prepared, fx, target.opening_balance);
    expect(indexed.get(account.id === 'debit' ? 'bank' : account.id).settled).toBe(settled);
    expect(indexed.get(account.id === 'debit' ? 'bank' : account.id).available).toBe(available);
  }
});

test('posted duplicate UUID is counted once and pending outgoing holds are preserved', () => {
  const indexed = buildIndexedBalances(accounts, [...rows, rows[0], rows[6]], links, styles, fx, true);
  expect(indexed.get('bank').settled).toBe(buildIndexedBalances(accounts, rows, links, styles, fx, true).get('bank').settled);
  expect(indexed.get('card').available).toBeCloseTo(buildIndexedBalances(accounts, rows, links, styles, fx, true).get('card').available - 22.2);
});

test('missing exchange rate reports NaN rather than displaying a fabricated balance', () => {
  const indexed = buildIndexedBalances(accounts, rows, links, styles, () => NaN, true);
  expect(Number.isNaN(indexed.get('bank').settled)).toBe(true);
});
