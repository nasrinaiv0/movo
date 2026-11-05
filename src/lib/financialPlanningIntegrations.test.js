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

test('subscription projections reject invalid calendar dates and unsafe amounts without affecting manual bills', () => {
  const result = subscriptionBillData([
    { id: 'bad-date', name: 'Invalid date', amount: 100, start: '2026-02-31', status: 'active' },
    { id: 'bad-amount', name: 'Unsafe amount', amount: 1e30, start: '2026-11-10', status: 'active' },
    { id: 'valid', name: 'Valid', amount: '125.50', start: '2026-11-10', currency: 'PHP', cycle: 'monthly', status: 'active' },
  ], '2026-11-05', '2026-12-31');
  expect(result.bills.map(row => row.id)).toEqual(['subscription-valid']);
  expect(result.occurrences.map(row => row.expected_amount)).toEqual([125.5, 125.5]);
});

test('plans normalize legacy amount and date fields and exclude archived or invalid entries', () => {
  const { planGoalData } = require('./financialPlanningIntegrations');
  expect(planGoalData([
    { id: 'legacy', name: 'Trip', amount: '12000', saved_amount: '2500', target_date: '2027-02-01', currency: 'PHP' },
    { id: 'archived', name: 'Old plan', target: 100, status: 'archived' },
    { id: 'invalid', name: 'Broken', target: -10 },
  ])).toEqual([expect.objectContaining({
    id: 'legacy', name: 'Trip', target: 12000, saved: 2500, due: '2027-02-01', currency: 'PHP',
  })]);
});

test('credit card liability uses the explicit outstanding amount when available', () => {
  const { creditCardOutstanding } = require('./financialPlanningIntegrations');
  expect(creditCardOutstanding({ account_type: 'card', cardKind: 'credit', balance: -4000 })).toBe(4000);
  expect(creditCardOutstanding({ account_type: 'card', cardKind: 'credit', balance: 0, liability_balance: 1750 })).toBe(1750);
  expect(creditCardOutstanding({ account_type: 'card', cardKind: 'credit', balance: -4000, liability_balance: 0 })).toBe(0);
  expect(creditCardOutstanding({ account_type: 'card', cardKind: 'debit', balance: -4000 })).toBe(0);
});


test('plan savings include only active account-backed allocations and convert to home currency', () => {
  const { planGoalData } = require('./financialPlanningIntegrations');
  const result = planGoalData(
    [{ id: 'plan-1', name: 'Emergency fund', target: 20000, saved: 1000, currency: 'PHP' }],
    [
      { id: 'a1', plan_id: 'plan-1', amount: 100, currency: 'USD', status: 'allocated' },
      { id: 'a2', plan_id: 'plan-1', amount: 500, currency: 'PHP', status: 'released' },
      { id: 'a3', plan_id: 'other', amount: 900, currency: 'PHP', status: 'allocated' },
    ],
    (amount, currency) => currency === 'USD' ? amount * 58 : amount,
  );
  expect(result[0].saved).toBe(6800);
});


test('migrated legacy plan allocations are not double-counted and releases reduce saved progress', () => {
  const { planGoalData } = require('./financialPlanningIntegrations');
  const plans = [{
    id: 'legacy-plan', name: 'Trip', target: 10000, saved: 1500, currency: 'PHP',
    fundingAllocations: [{ id: 'old-allocation', account_id: 'bank', amount: 500, currency: 'PHP', status: 'allocated' }],
  }];
  const active = planGoalData(plans, [{
    id: 'new-ledger-id', legacy_id: 'old-allocation', plan_id: 'legacy-plan', amount: 500, currency: 'PHP', status: 'allocated',
  }]);
  const released = planGoalData(plans, [{
    id: 'new-ledger-id', legacy_id: 'old-allocation', plan_id: 'legacy-plan', amount: 500, currency: 'PHP', status: 'released',
  }]);
  expect(active[0].saved).toBe(1500);
  expect(released[0].saved).toBe(1000);
});
