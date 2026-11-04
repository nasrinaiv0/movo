import { creditInfo, isCreditCard, creditCardPaymentSummary, creditCardPlanningMetrics } from './creditCard';

const card = (balance, creditLimit) => ({ account_type: 'card', cardKind: 'credit', balance, creditLimit });

test('available credit is the limit minus what is owed', () => {
  expect(creditInfo(card(0, 50000))).toEqual({ limit: 50000, owed: 0, available: 50000, usedPercent: 0 });
  expect(creditInfo(card(-12500.5, 50000))).toEqual({ limit: 50000, owed: 12500.5, available: 37499.5, usedPercent: 25 });
  expect(creditInfo(card(-60000, 50000))).toMatchObject({ owed: 60000, available: -10000, usedPercent: 100 }); // over the limit
  expect(creditInfo(card(300, 50000))).toMatchObject({ owed: 0, available: 50300 }); // overpaid
});

test('only credit cards with a limit have credit info', () => {
  expect(creditInfo(card(-100, 0))).toBeNull();
  expect(creditInfo({ account_type: 'card', cardKind: 'debit', balance: 100, creditLimit: 5000 })).toBeNull();
  expect(creditInfo({ account_type: 'bank', balance: 100 })).toBeNull();
  expect(isCreditCard(card(0, 1))).toBe(true);
});

test('summarizes credit-card payments by distinct months', () => {
  const result = creditCardPaymentSummary([{ amount: 100, month: '2026-10', date: '2026-10-05' }, { amount: 50, month: '2026-10', date: '2026-10-20' }, { amount: 200, month: '2026-11', date: '2026-11-02' }, { amount: -5, month: '2026-11', date: '2026-11-03' }]);
  expect(result).toMatchObject({ totalPaid: 350, monthsPaid: 2 });
});


test('ignores malformed payment month and date values', () => {
  const result = creditCardPaymentSummary([{ amount: 25, month: '2026-11', date: '2026-11-04' }, { amount: 90, month: '2026-13', date: '2026-11-05' }, { amount: 40, month: '2026-11', date: 'not-a-date' }]);
  expect(result).toMatchObject({ totalPaid: 25, monthsPaid: 1, payments: [{ amount: 25 }] });
});

describe('creditCardPlanningMetrics', () => {
  const card = { id: 'cc-1', account_type: 'card', cardKind: 'credit', currency: 'PHP', balance: -10000, creditLimit: 50000 };
  test('calculates spend, monthly APR estimate, utilization and outstanding after payments', () => {
    const metrics = creditCardPlanningMetrics({ card, annualInterestRate: 24, transactions: [
      { account_id: 'cc-1', transaction_type: 'expense', amount: 4000, origAmount: 4000, origCurrency: 'PHP' },
      { account_id: 'cc-1', type: 'expense', amount: 2000, origAmount: 2000, origCurrency: 'PHP' },
      { account_id: 'bank-1', type: 'expense', amount: 9000, origCurrency: 'PHP' },
      { account_id: 'cc-1', type: 'income', amount: 1000, origCurrency: 'PHP' },
    ], payments: [{ amount: 2000, month: '2026-11', date: '2026-11-05' }] });
    expect(metrics).toMatchObject({ amountSpent: 6000, estimatedMonthlyInterest: 200, amountAfterInterest: 10200, outstandingAfterPayments: 8200, totalPayments: 2000, limit: 50000, spentLimitPercent: 12 });
  });
  test('converts card expenses to card currency and safely handles invalid APR or missing limit', () => {
    const metrics = creditCardPlanningMetrics({ card: { ...card, currency: 'USD', creditLimit: 0 }, annualInterestRate: 'bad', transactions: [{ account_id: 'cc-1', type: 'expense', origAmount: 100, origCurrency: 'PHP' }], convertAmount: (amount, from, to) => from === 'PHP' && to === 'USD' ? amount / 50 : amount });
    expect(metrics).toMatchObject({ amountSpent: 2, estimatedMonthlyInterest: 0, spentLimitPercent: null, annualInterestRate: 0 });
  });
  test('clamps outstanding after payments at zero', () => {
    const metrics = creditCardPlanningMetrics({ card: { ...card, balance: -100 }, payments: [{ amount: 500, month: '2026-11', date: '2026-11-05' }] });
    expect(metrics.outstandingAfterPayments).toBe(0);
  });
});


test('excludes deleted, reversed and duplicate card transactions and applies each logged payment once', () => {
  const metrics = creditCardPlanningMetrics({
    card: { id: 'cc-1', account_type: 'card', cardKind: 'credit', currency: 'PHP', balance: -10000, creditLimit: 50000 },
    annualInterestRate: 24,
    statementBalance: 12000,
    transactions: [
      { id: 'purchase-1', account_id: 'cc-1', type: 'expense', amount: 4000, currency: 'PHP' },
      { id: 'purchase-1', account_id: 'cc-1', type: 'expense', amount: 4000, currency: 'PHP' },
      { id: 'reversed-1', account_id: 'cc-1', type: 'expense', status: 'reversed', amount: 3000, currency: 'PHP' },
      { id: 'deleted-1', account_id: 'cc-1', type: 'expense', deleted_at: '2026-11-05T00:00:00Z', amount: 2000, currency: 'PHP' },
      { id: 'bank-1', account_id: 'bank-1', type: 'expense', amount: 5000, currency: 'PHP' },
    ],
    payments: [
      { id: 'payment-1', amount: 2000, month: '2026-11', date: '2026-11-05' },
      { id: 'payment-1', amount: 2000, month: '2026-11', date: '2026-11-05' },
    ],
  });
  expect(metrics).toMatchObject({
    amountSpent: 4000,
    estimatedMonthlyInterest: 240,
    amountAfterInterest: 10240,
    totalPayments: 2000,
    paymentCount: 1,
    outstandingAfterPayments: 8240,
    spentLimitPercent: 8,
  });
});
