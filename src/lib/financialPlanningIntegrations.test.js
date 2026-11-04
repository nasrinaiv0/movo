import { subscriptionBillData } from './financialPlanningIntegrations';
import { planningSummary } from './usePlanning';

test('active subscriptions project into due items, preserve overdue dates, and exclude paused or cancelled entries', () => {
  const result = subscriptionBillData([
    { id: 's1', name: 'Music', amount: 299, currency: 'PHP', cycle: 'monthly', start: '2026-11-05', status: 'active' },
    { id: 's2', name: 'Cloud', amount: 100, currency: 'PHP', cycle: 'monthly', start: '2026-10-01', status: 'active', lastPaidAt: '2026-10-01T12:00:00Z', lastPaidAmount: 90 },
    { id: 's3', name: 'Paused', amount: 500, currency: 'PHP', cycle: 'monthly', start: '2026-11-06', status: 'paused' },
    { id: 's4', name: 'Cancelled', amount: 500, currency: 'PHP', cycle: 'monthly', start: '2026-11-06', status: 'cancelled' },
  ], '2026-11-05', '2026-12-31');
  expect(result.occurrences.map(row => [row.subscription_id, row.due_date])).toEqual([
    ['s1', '2026-11-05'], ['s1', '2026-12-05'], ['s2', '2026-10-01'],
  ]);
  expect(result.occurrences.every(row => row.source === 'subscription')).toBe(true);
  expect(result.payments).toEqual([expect.objectContaining({ amount: 90, currency: 'PHP', paid_at: '2026-10-01T12:00:00Z' })]);
});

test('credit card spending is included in loans and debts without creating a duplicate loan record; plans join goals', () => {
  const summary = planningSummary({
    accounts: [
      { id: 'bank', account_type: 'bank', currency: 'PHP', balance: 50000 },
      { id: 'credit', account_type: 'card', cardKind: 'credit', currency: 'PHP', balance: -3500 },
    ],
    loans: [{ id: 'loan', status: 'active', outstanding_principal: 10000, currency: 'PHP' }],
    goals: [{ id: 'goal', status: 'active', target_amount: 20000, currency: 'PHP' }],
    plans: [{ id: 'plan', name: 'Trip', target: 10000, saved: 2000, currency: 'PHP' }],
    allocations: [{ id: 'allocation', goal_id: 'goal', status: 'allocated', amount: 5000, currency: 'PHP' }],
    toBase: value => value,
    today: '2026-11-05',
  });
  expect(summary.loans).toEqual({ count: 2, total: 13500 });
  expect(summary.creditCards).toEqual({ count: 1, total: 3500 });
  expect(summary.goals).toEqual({ count: 2, saved: 7000, target: 30000, percent: 7000 / 30000 * 100 });
  expect(summary.position.liabilities).toBe(13500);
});
