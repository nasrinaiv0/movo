import { buildTransactionRunningBalances } from './transactionRunningBalances';

const a = (id, balance = 0, extra = {}) => ({ id, name: id, account_type: 'bank', currency: 'PHP', opening_balance: balance, ...extra });
const tx = (id, type, amount, date, account_id, transfer_to_account_id) =>
  ({ id, type, origAmount: amount, origCurrency: 'PHP', date, account_id, transfer_to_account_id });

test('shows cents-accurate post-transaction balances independently of display sort and updates history after edits', () => {
  const accounts = [a('bank', 1000)];
  const rows = [tx('last', 'expense', 14.45, '2026-11-08T12:00:00Z', 'bank'),
    tx('first', 'expense', 0.1, '2026-11-07T12:00:00Z', 'bank'),
    tx('income', 'income', 5.05, '2026-11-08T09:00:00Z', 'bank')];
  const result = buildTransactionRunningBalances({ transactions: rows, accounts });
  expect(result.get('first')[0].value).toBe(999.9);
  expect(result.get('income')[0].value).toBe(1004.95);
  expect(result.get('last')[0].value).toBe(990.5);
  expect(buildTransactionRunningBalances({ transactions: rows.filter(t => t.id !== 'first'), accounts }).get('last')[0].value).toBe(990.6);
});

test('transfers give each account its own after balance; shared debit cards route to bank', () => {
  const accounts = [a('bank', 50), a('destination', 20), a('debit', 0, { account_type: 'card', cardKind: 'debit' })];
  const result = buildTransactionRunningBalances({ accounts,
    cardBankLinks: { debit: 'bank' },
    transactions: [
      tx('purchase', 'expense', 2.5, '2026-11-07T10:00:00Z', 'debit'),
      tx('transfer', 'transfer', 10, '2026-11-08T10:00:00Z', 'bank', 'destination'),
    ] });
  expect(result.get('purchase')).toEqual([expect.objectContaining({ accountName: 'bank', value: 47.5 })]);
  expect(result.get('transfer')).toEqual([
    expect.objectContaining({ accountName: 'bank', value: 37.5 }),
    expect.objectContaining({ accountName: 'destination', value: 30 }),
  ]);
});

test('credit cards show remaining credit, without mixing bank cash; unposted card payments count once', () => {
  const accounts = [a('credit', 0, { account_type: 'card', cardKind: 'credit' }), a('bank', 200)];
  const result = buildTransactionRunningBalances({ accounts, accountStyles: { credit: { cardKind: 'credit', creditLimit: 500 } },
    creditCardPayments: { credit: [{ id: 'p1', month: '2026-11', date: '2026-11-07', amount: 10 }] },
    transactions: [tx('purchase', 'expense', 80, '2026-11-06T10:00:00Z', 'credit'), tx('later', 'expense', 20, '2026-11-08T10:00:00Z', 'credit')] });
  expect(result.get('purchase')[0]).toEqual(expect.objectContaining({ label: 'Credit left', value: 420 }));
  expect(result.get('later')[0]).toEqual(expect.objectContaining({ value: 410 }));
});

test('excludes reversed and pending entries and never invents unavailable account balances', () => {
  const accounts = [a('bank', 100)];
  const result = buildTransactionRunningBalances({ accounts, transactions: [
    { ...tx('void', 'expense', 50, '2026-11-05', 'bank'), status: 'reversed' },
    { ...tx('pending', 'expense', 50, '2026-11-06', 'bank'), status: 'pending' },
    tx('posted', 'expense', 20, '2026-11-07', 'bank'),
    tx('unknown', 'expense', 20, '2026-11-08', 'not-my-account'),
  ] });
  expect(result.has('void')).toBe(false);
  expect(result.has('pending')).toBe(false);
  expect(result.get('posted')[0].value).toBe(80);
  expect(result.get('unknown')).toEqual([]);
});

test('currency conversion failure hides the balance, never guesses conversion', () => {
  const result = buildTransactionRunningBalances({
    accounts: [a('bank', 100)],
    transactions: [tx('fx', 'expense', 5, '2026-11-07', 'bank'), tx('later', 'expense', 5, '2026-11-08', 'bank')],
    convertAmount: () => NaN,
  });
  expect(result.get('fx')).toEqual([]);
  expect(result.get('later')).toEqual([]);
});
