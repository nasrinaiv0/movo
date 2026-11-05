import { normalizeMerchant, spendingLimitProgress } from './spendingLimits';

test('tracks account limits only against expenses from that account', () => {
  const result = spendingLimitProgress(
    [{ id: 'a', scope: 'account', account_id: 'bank-1', monthly_limit: 1000, alert_percent: 80 }],
    [
      { type: 'expense', account_id: 'bank-1', amount: 500 },
      { type: 'expense', account_id: 'bank-2', amount: 800 },
      { type: 'income', account_id: 'bank-1', amount: 400 },
    ],
    [{ id: 'bank-1', name: 'Main Bank' }],
  );
  expect(result[0]).toMatchObject({ account_name: 'Main Bank', spent: 500, left: 500, percent: 50, level: 'ok' });
});

test('matches merchant limits by normalized exact merchant name, not substrings', () => {
  const result = spendingLimitProgress(
    [{ id: 'm', scope: 'merchant', merchant: 'Coffee & Co.', monthly_limit: 1000, alert_percent: 80 }],
    [
      { type: 'expense', merchant: 'Coffee and Co', amount: 850 },
      { type: 'expense', merchant: 'Coffee Company', amount: 900 },
      { type: 'expense', merchant: 'Coffee & Co.', amount: 50 },
    ],
  );
  expect(result[0]).toMatchObject({ spent: 900, percent: 90, level: 'warn' });
  expect(normalizeMerchant('Coffee & Co.')).toBe(normalizeMerchant('Coffee and Co'));
});

test('marks limits over budget and ignores malformed or non-expense amounts', () => {
  const result = spendingLimitProgress(
    [{ id: 'm', scope: 'merchant', merchant: 'Store', monthly_limit: 100, alert_percent: 80 }],
    [{ type: 'expense', merchant: 'Store', amount: 125 }, { type: 'expense', merchant: 'Store', amount: -10 }],
  );
  expect(result[0]).toMatchObject({ spent: 125, left: -25, percent: 125, level: 'over' });
});
