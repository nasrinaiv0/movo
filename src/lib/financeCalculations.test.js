import { accountBalance, accountTransactionDelta, activityNetAmount, savingsBalance, transactionEffect } from './financeCalculations';

describe('MOVO transaction routing', () => {
  const accounts = [
    { id: 'bank-a', account_type: 'bank', currency: 'PHP', opening_balance: 10000 },
    { id: 'bank-b', account_type: 'bank', currency: 'PHP', opening_balance: 2000 },
    { id: 'cash', account_type: 'cash', currency: 'PHP', opening_balance: 500 },
  ];
  const transactions = [
    { id: 'i1', transaction_type: 'income', amount: 3000, currency: 'PHP', account_id: 'bank-a' },
    { id: 'e1', transaction_type: 'expense', amount: 500, currency: 'PHP', account_id: 'bank-a' },
    { id: 't1', transaction_type: 'transfer', amount: 1200, currency: 'PHP', account_id: 'bank-a', transfer_to_account_id: 'bank-b' },
  ];

  test('routes income and expenses only to their selected account', () => {
    expect(transactionEffect(transactions[0], 'bank-a')).toBe(3000);
    expect(transactionEffect(transactions[0], 'bank-b')).toBe(0);
    expect(transactionEffect(transactions[1], 'bank-a')).toBe(-500);
    expect(transactionEffect(transactions[1], 'bank-b')).toBe(0);
  });

  test('routes a transfer out of source and into destination exactly once', () => {
    expect(transactionEffect(transactions[2], 'bank-a')).toBe(-1200);
    expect(transactionEffect(transactions[2], 'bank-b')).toBe(1200);
    expect(accountTransactionDelta(accounts[0], transactions)).toBe(1300);
    expect(accountTransactionDelta(accounts[1], transactions)).toBe(1200);
    expect(accountBalance(accounts[0], transactions)).toBe(11300);
    expect(accountBalance(accounts[1], transactions)).toBe(3200);
    expect(accountBalance(accounts[0], transactions) + accountBalance(accounts[1], transactions)).toBe(14500);
  });

  test('converts routed amounts into the account currency', () => {
    const eur = { id: 'eur', currency: 'EUR', opening_balance: 10 };
    const tx = [{ transaction_type: 'income', amount: 5, currency: 'USD', account_id: 'eur' }];
    expect(accountTransactionDelta(eur, tx, (amount, from, to) => amount * (from === 'USD' && to === 'EUR' ? 0.9 : 1))).toBeCloseTo(4.5);
  });

  test('transfers do not affect income/expense activity net', () => {
    expect(activityNetAmount({ type: 'income', amount: 100 })).toBe(100);
    expect(activityNetAmount({ type: 'expense', amount: 30 })).toBe(-30);
    expect(activityNetAmount({ type: 'transfer', amount: 70 })).toBe(0);
  });

  test('savings includes bank accounts but excludes physical cash, archived accounts and credit cards', () => {
    expect(savingsBalance([
      { id: 'bank', account_type: 'bank', balance: 1200, currency: 'PHP' },
      { id: 'cash', account_type: 'cash', balance: 300, currency: 'PHP' },
      { id: 'archived', account_type: 'bank', balance: 900, currency: 'PHP', is_archived: true },
      { id: 'credit', account_type: 'card', balance: 50000, currency: 'PHP' },
      { id: 'unknown-card', account_type: 'card', balance: 700, currency: 'PHP' },
    ], amount => amount, { credit: { cardKind: 'credit' } })).toBe(1200);
  });
});
