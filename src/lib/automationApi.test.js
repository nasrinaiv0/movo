const { _test } = require('../../api/log');

describe('background automation API input helpers', () => {
  test('amounts are positive, bounded and rounded to cents', () => {
    expect(_test.amountValue('109.009')).toBe(109.01);
    expect(_test.amountValue(0)).toBe(0);
    expect(_test.amountValue(-1)).toBe(0);
    expect(_test.amountValue('not a number')).toBe(0);
    expect(_test.amountValue(1000000000)).toBe(0);
  });

  test('text is bounded and strips control and markup characters', () => {
    expect(_test.cleanText('  Ga\u0000dc <test>  ', 10)).toBe('Gadc test');
    expect(_test.cleanText('a'.repeat(200), 160)).toHaveLength(160);
  });

  test('account mapping requires an unambiguous match', () => {
    const accounts = [
      { id: '1', name: 'BPI Visa', institution_name: 'BPI', currency: 'PHP' },
      { id: '2', name: 'Cash', institution_name: null, currency: 'PHP' },
    ];
    expect(_test.accountFor(accounts, 'BPI Visa').id).toBe('1');
    expect(_test.accountFor(accounts, '')).toBeNull();
    expect(_test.accountFor([{ id: 'only', name: 'Cash' }], '') .id).toBe('only');
    expect(_test.accountFor(accounts, 'Unknown Card')).toBeNull();
    const sameBank = [
      { id: 'visa', name: 'BPI Visa', institution_name: 'BPI' },
      { id: 'savings', name: 'BPI Savings', institution_name: 'BPI' },
    ];
    expect(_test.accountFor(sameBank, 'BPI Visa').id).toBe('visa');
    expect(_test.accountFor(sameBank, 'BPI')).toBeNull();
  });

  test('idempotency keys are stable for the same payment and differ across transactions', () => {
    const payment = { source: 'applepay', amount: 109, merchant: 'Gadc', card: 'BPI Visa', occurredAt: '2026-10-31T12:01:00.000Z', reference: '' };
    expect(_test.idempotencyKey(payment)).toBe(_test.idempotencyKey({ ...payment }));
    expect(_test.idempotencyKey(payment)).not.toBe(_test.idempotencyKey({ ...payment, amount: 110 }));
    expect(_test.idempotencyKey({ ...payment, reference: 'REF-1' })).toBe(_test.idempotencyKey({ ...payment, reference: 'REF-1' }));
  });
});
