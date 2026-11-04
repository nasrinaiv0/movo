import { creditInfo, isCreditCard, creditCardPaymentSummary } from './creditCard';

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
