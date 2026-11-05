import { billingDate, nextRenewal, renewalsBetween, monthlyCost, summarize, dayDiff, subscriptionPaymentAccountId, revertSubscriptionPayment, restoreSubscriptionPayment } from './subscriptions';

const sub = (over = {}) => ({ id: 's', name: 'Netflix', category: 'Entertainment', amount: 549, currency: 'PHP', cycle: 'monthly', start: '2026-01-31', status: 'active', ...over });

test('subscription payment account routing accepts active bank, e-wallet and payment cards only', () => {
  const accounts = [
    { id: 'bank-1', account_type: 'bank' },
    { id: 'wallet-1', account_type: 'e_wallet' },
    { id: 'credit-1', account_type: 'card', cardKind: 'credit' },
    { id: 'debit-1', account_type: 'card', cardKind: 'debit' },
    { id: 'member-1', account_type: 'card', cardKind: 'membership' },
    { id: 'archived-1', account_type: 'bank', is_archived: true },
  ];
  expect(subscriptionPaymentAccountId({ accountId: 'bank-1' }, accounts)).toBe('bank-1');
  expect(subscriptionPaymentAccountId({ accountId: 'wallet-1' }, accounts)).toBe('wallet-1');
  expect(subscriptionPaymentAccountId({ account_id: 'credit-1' }, accounts)).toBe('credit-1');
  expect(subscriptionPaymentAccountId({ accountId: 'debit-1' }, accounts)).toBe('debit-1');
  expect(subscriptionPaymentAccountId({ accountId: 'member-1' }, accounts)).toBe('');
  expect(subscriptionPaymentAccountId({ accountId: 'archived-1' }, accounts)).toBe('');
  expect(subscriptionPaymentAccountId({ accountId: 'deleted-1' }, accounts)).toBe('');
  expect(subscriptionPaymentAccountId({}, accounts)).toBe('');
});

test('monthly plans keep their day, clamping to short months', () => {
  expect([0, 1, 2, 3].map(n => billingDate('2026-01-31', 'monthly', n))).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  expect(billingDate('2024-02-29', 'yearly', 1)).toBe('2025-02-28');
  expect(billingDate('2024-02-29', 'yearly', 4)).toBe('2028-02-29');
  expect(billingDate('2026-12-28', 'weekly', 1)).toBe('2027-01-04');
  expect(billingDate('2026-11-15', 'quarterly', 1)).toBe('2027-02-15');
});

test('next renewal is on or after today, and skips paused or cancelled plans', () => {
  expect(nextRenewal(sub(), new Date('2026-10-30T09:00:00'))).toBe('2026-10-31');
  expect(nextRenewal(sub(), new Date('2026-10-31T23:00:00'))).toBe('2026-10-31');
  expect(nextRenewal(sub(), new Date('2026-11-01T00:00:00'))).toBe('2026-11-30');
  expect(nextRenewal(sub({ start: '2027-03-01' }), new Date('2026-10-30'))).toBe('2027-03-01');
  expect(nextRenewal(sub({ status: 'paused' }), new Date('2026-10-30'))).toBe('');
  expect(nextRenewal(sub({ start: 'nope' }), new Date('2026-10-30'))).toBe('');
});

test('renewals within a window', () => {
  expect(renewalsBetween(sub({ cycle: 'weekly', start: '2026-10-01' }), '2026-10-01', '2026-10-31')).toEqual(['2026-10-01', '2026-10-08', '2026-10-15', '2026-10-22', '2026-10-29']);
  expect(renewalsBetween(sub({ cycle: 'yearly', start: '2025-12-25' }), '2026-10-01', '2026-10-31')).toEqual([]);
});

test('monthly cost normalises every cycle and ignores inactive or invalid amounts', () => {
  expect(monthlyCost(sub({ cycle: 'yearly', amount: 1200 }))).toBe(100);
  expect(monthlyCost(sub({ cycle: 'weekly', amount: 12 }))).toBe(52);
  expect(monthlyCost(sub({ cycle: 'quarterly', amount: 300 }))).toBe(100);
  expect(monthlyCost(sub({ status: 'cancelled' }))).toBe(0);
  expect(monthlyCost(sub({ amount: 'abc' }))).toBe(0);
});

test('summary converts to the home currency and lists what renews within 7 days', () => {
  const subs = [sub(), sub({ id: 'u', name: 'Claude', category: 'AI Tools', amount: 20, currency: 'USD', start: '2026-11-07' }), sub({ id: 'x', status: 'cancelled' })];
  const s = summarize(subs, new Date('2026-10-30T10:00:00'), (v, c) => (c === 'USD' ? v * 58 : v));
  expect(s.activeCount).toBe(2);
  expect(s.monthly).toBe(549 + 1160);
  expect(s.annual).toBe((549 + 1160) * 12);
  expect(s.upcoming.map(x => [x.name, x.next])).toEqual([['Netflix', '2026-10-31'], ['Claude', '2026-11-07']]);
  expect(s.dueSoon.map(x => x.name)).toEqual(['Netflix']); // Claude is 8 days away
  expect(s.dueSoonTotal).toBe(549);
  expect(s.byCategory[0]).toEqual({ category: 'AI Tools', amount: 1160 });
  expect(dayDiff('2026-10-30', '2026-11-07')).toBe(8);
});

test('catalog ids are unique, every mark exists and both US and Philippine services are listed', () => {
  const { CATALOG } = require('./subscriptions');
  const { BRAND_MARKS } = require('./brandMarks');
  expect(new Set(CATALOG.map(c => c.id)).size).toBe(CATALOG.length);
  CATALOG.filter(c => c.mark).forEach(c => expect(BRAND_MARKS[c.mark]?.path).toMatch(/^[Mm]/));
  expect(CATALOG.filter(c => c.region === 'PH').length).toBeGreaterThan(15);
  expect(CATALOG.filter(c => c.region === 'US').length).toBeGreaterThan(15);
});


test('reversing a subscription transaction restores its previous billing cycle only when it is still the current cycle', () => {
  const advanced = sub({ start: '2026-02-28', lastPaidAt: '2026-01-31T12:00:00Z', lastPaidAmount: 549, lastPaidCurrency: 'PHP' });
  const reversed = revertSubscriptionPayment([advanced], {
    external_reference: 'movo-subscription:s:2026-01-31:2026-02-28',
  });
  expect(reversed[0]).toEqual(expect.objectContaining({ id: 's', start: '2026-01-31' }));
  expect(reversed[0]).not.toHaveProperty('lastPaidAt');
  expect(reversed[0]).not.toHaveProperty('lastPaidAmount');
  expect(reversed[0]).not.toHaveProperty('lastPaidCurrency');

  const laterCycle = sub({ start: '2026-03-31' });
  expect(revertSubscriptionPayment([laterCycle], {
    external_reference: 'movo-subscription:s:2026-01-31:2026-02-28',
  })).toBeInstanceOf(Array);
  expect(revertSubscriptionPayment([laterCycle], {
    external_reference: 'movo-subscription:s:2026-01-31:2026-02-28',
  })[0].start).toBe('2026-03-31');
  expect(revertSubscriptionPayment([advanced], { external_reference: 'not-a-subscription' })).toBeInstanceOf(Array);
});


test('restoring an archived subscription payment advances its billing cycle again', () => {
  const beforePayment = sub({ start: '2026-01-31' });
  const restored = restoreSubscriptionPayment([beforePayment], {
    external_reference: 'movo-subscription:s:2026-01-31:2026-02-28',
    occurred_at: '2026-01-31T12:00:00Z', amount: 549, currency: 'PHP',
  });
  expect(restored[0]).toEqual(expect.objectContaining({
    start: '2026-02-28', lastPaidAt: '2026-01-31T12:00:00Z', lastPaidAmount: 549, lastPaidCurrency: 'PHP',
  }));
  expect(restoreSubscriptionPayment([sub({ start: '2026-03-31' })], {
    external_reference: 'movo-subscription:s:2026-01-31:2026-02-28',
  })[0].start).toBe('2026-03-31');
});

test('subscription reversal restores the exact prior payment metadata when available', () => {
  const previous = {
    start: '2026-01-31',
    lastPaidAt: '2025-12-31T12:00:00Z',
    lastPaidAmount: 499,
    lastPaidCurrency: 'PHP',
  };
  const advanced = sub({
    start: '2026-02-28',
    lastPaidAt: '2026-01-31T12:00:00Z',
    lastPaidAmount: 549,
    lastPaidCurrency: 'PHP',
  });
  const reversed = revertSubscriptionPayment([advanced], {
    external_reference: 'movo-subscription:s:2026-01-31:2026-02-28',
    subscription_payment_state: { previous },
  });
  expect(reversed[0]).toEqual(expect.objectContaining(previous));
});

test('restoring a local archived renewal reapplies the exact saved next payment state', () => {
  const beforePayment = sub({ start: '2026-01-31' });
  const next = {
    start: '2026-02-28',
    lastPaidAt: '2026-01-31T12:00:00Z',
    lastPaidAmount: 549,
    lastPaidCurrency: 'PHP',
  };
  const restored = restoreSubscriptionPayment([beforePayment], {
    external_reference: 'movo-subscription:s:2026-01-31:2026-02-28',
    subscription_payment_state: { next },
  });
  expect(restored[0]).toEqual(expect.objectContaining(next));
});

