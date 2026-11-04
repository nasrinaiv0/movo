import { cashbackTotals, estimateCashback } from './cashback';

const accounts = [
  { id: 'wallet', name: 'Wallet', account_type: 'e_wallet', currency: 'PHP' },
  { id: 'bank', name: 'Bank', institution_name: 'Example Bank', account_type: 'bank', currency: 'USD' },
  { id: 'card', name: 'Card', account_type: 'card', currency: 'PHP' },
];

test('estimates cashback from expenses using the selected account rate and currency', () => {
  expect(estimateCashback([{ id: 'tx1', type: 'expense', amount: 1000, account_id: 'wallet', merchant: 'Groceries' }], accounts, { wallet: { enabled: true, rate: 2 } }))
    .toEqual([{ id: 'auto-tx1', transactionId: 'tx1', date: '', source: 'Groceries', account: 'Wallet', accountId: 'wallet', amount: 20, currency: 'PHP', rate: 2, status: 'Estimated' }]);
});

test('applies a per-transaction cap and ignores disabled, invalid, archived, and card rules', () => {
  const txs = [
    { id: 'a', type: 'expense', amount: 1000, account_id: 'wallet' },
    { id: 'b', type: 'expense', amount: 1000, account_id: 'bank' },
    { id: 'c', type: 'expense', amount: 1000, account_id: 'card' },
    { id: 'd', type: 'income', amount: 1000, account_id: 'wallet' },
  ];
  expect(estimateCashback(txs, accounts, {
    wallet: { enabled: true, rate: 5, cap: 10 },
    bank: { enabled: true, rate: 101 },
    card: { enabled: true, rate: 5 },
  })).toHaveLength(1);
  expect(estimateCashback(txs, accounts, { wallet: { enabled: true, rate: 5, cap: 10 } })[0].amount).toBe(10);
});

test('groups totals by currency instead of adding unlike currencies', () => {
  expect(cashbackTotals([{ amount: 10, currency: 'PHP' }, { amount: 2.5, currency: 'PHP' }, { amount: 3, currency: 'USD' }]))
    .toEqual({ PHP: 12.5, USD: 3 });
});
