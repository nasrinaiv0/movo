import { totalBalance, balanceAsOf, netAfter } from './totalBalance';
import { monthOverMonth } from './trend';

const bank = { id: 'b', account_type: 'bank', balance: 10000, currency: 'PHP' };
const debit = { id: 'd', account_type: 'card', cardKind: 'debit', balance: 10000, currency: 'PHP', linkedAccountId: 'b' };
const credit = { id: 'c', account_type: 'card', cardKind: 'credit', balance: -2000, currency: 'PHP', recordedPaymentsApplied: true };
const usd = { id: 'u', account_type: 'e_wallet', balance: 100, currency: 'USD' };
const toBase = (amount, currency) => (currency === 'USD' ? amount * 56 : currency === 'PHP' ? amount : NaN);

test('open accounts count once: linked debit cards through their bank, credit cards as what is owed', () => {
  expect(totalBalance([bank, debit, credit, usd], toBase).total).toBe(10000 - 2000 + 5600);
});

test('archived accounts stay out of the total, like Wallet', () => {
  expect(totalBalance([bank, { ...usd, is_archived: true }], toBase).total).toBe(10000);
});

test('a card payment that moved no money does not raise the total; one paid from an account does not change it twice', () => {
  // The card shows −2,000 after a 3,000 payment noted without a source account (owed was −5,000).
  const payments = { c: [{ id: 'p1', amount: 3000, date: '2026-11-01', month: '2026-11' }] };
  expect(totalBalance([bank, credit], toBase, payments).total).toBe(10000 - 5000);
  // A payment recorded as a transfer (transaction_id) is already in both ledgers.
  const posted = { c: [{ id: 'p2', amount: 3000, date: '2026-11-01', month: '2026-11', transaction_id: 't1' }] };
  expect(totalBalance([bank, credit], toBase, posted).total).toBe(8000);
});

test('an account without an exchange rate is listed, not allowed to turn the total into NaN', () => {
  const result = totalBalance([bank, { id: 'x', account_type: 'bank', balance: 50, currency: 'XYZ' }], toBase);
  expect(result.total).toBe(10000);
  expect(result.excluded).toEqual(['x']);
});

const txs = [
  { type: 'income', amount: 5000, date: '2026-11-03T09:00:00+08:00' },
  { type: 'expense', amount: 1200, date: '2026-10-20T09:00:00+08:00' },
  { type: 'expense', amount: 300, date: '2026-11-05T09:00:00+08:00' },
  { type: 'transfer', amount: 999, date: '2026-11-06T09:00:00+08:00' },
];

test('a past month shows the total at its last day: later income and expenses are undone, transfers are not', () => {
  expect(netAfter(txs, '2026-10-31')).toBe(4700);
  expect(balanceAsOf(20000, txs, '2026-10-31')).toBe(15300);
});

test('month-over-month for a past month only undoes what happened up to that month end', () => {
  // October's end balance 15,300; September's end = 15,300 + 1,200 (October expense) = 16,500.
  const delta = monthOverMonth(txs, new Date(2026, 9, 31, 12), 15300, '2026-10-31');
  expect(delta.balance.direction).toBe('down');
  expect(Math.round(delta.balance.percent * 100) / 100).toBe(Math.round((1200 / 16500) * 10000) / 100);
});
