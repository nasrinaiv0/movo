import { planningAccounts, planningSummary } from './usePlanning';

const today = '2026-11-03';
const accounts = [
  { id: 'bank', account_type: 'bank', currency: 'PHP', balance: 50000 },
  { id: 'debit', account_type: 'card', cardKind: 'debit', linkedAccountId: 'bank', currency: 'PHP', balance: 50000 },
  { id: 'credit', account_type: 'card', cardKind: 'credit', currency: 'PHP', balance: -4000 },
  { id: 'old', account_type: 'cash', currency: 'PHP', balance: 999, is_archived: true },
];

test('a debit card linked to a bank is not counted twice; credit card debt is a liability', () => {
  const kept = planningAccounts(accounts).map(a => a.id);
  expect(kept).toEqual(['bank', 'credit']);
  const s = planningSummary({ accounts: planningAccounts(accounts), today });
  expect(s.position.assets).toBe(50000);
  expect(s.position.liabilities).toBe(4000);
  expect(s.position.netWorth).toBe(46000);
});

test('loans, money owed to you, goals and bills are summarised in the home currency', () => {
  const toBase = (v, cur) => (cur === 'USD' ? v * 50 : v);
  const s = planningSummary({
    accounts: [{ id: 'bank', account_type: 'bank', currency: 'PHP', balance: 10000 }],
    loans: [{ id: 'l1', status: 'active', outstanding_principal: 100, currency: 'USD' }, { id: 'l2', status: 'paid_off', outstanding_principal: 0, currency: 'PHP' }],
    receivables: [{ id: 'r1', status: 'active', outstanding_amount: 1500, currency: 'PHP' }],
    goals: [{ id: 'g1', status: 'active', target_amount: 4000, currency: 'PHP' }],
    allocations: [{ id: 'a1', goal_id: 'g1', status: 'allocated', amount: 1000, currency: 'PHP' }, { id: 'a2', goal_id: 'g1', status: 'released', amount: 900, currency: 'PHP' }],
    occurrences: [{ id: 'o1', bill_id: 'b', due_date: '2026-11-01', expected_amount: 2000, currency: 'PHP', status: 'scheduled' }, { id: 'o2', bill_id: 'b', due_date: '2026-11-20', expected_amount: 500, currency: 'PHP', status: 'scheduled' }],
    payments: [], toBase, today,
  });
  expect(s.loans).toEqual({ count: 1, total: 5000 });
  expect(s.receivables).toEqual({ count: 1, total: 1500 });
  expect(s.goals).toMatchObject({ count: 1, saved: 1000, target: 4000, percent: 25 });
  expect(s.bills.overdueCount).toBe(1);
  expect(s.bills.dueThisMonth).toBe(2500);
  expect(s.bills.next.id).toBe('o1');
  expect(s.position.liabilities).toBe(5000);
  expect(s.position.assets).toBe(11500);
  expect(s.position.availableMoney).toBe(9000);
});


test('credit-card purchases are included in Loans & debts without duplicating card assets', () => {
  const toBase = (value, currency) => currency === 'USD' ? value * 50 : value;
  const s = planningSummary({
    accounts: [
      { id: 'bank', account_type: 'bank', currency: 'PHP', balance: 25000 },
      { id: 'credit', account_type: 'card', cardKind: 'credit', currency: 'PHP', balance: -12500 },
    ],
    toBase,
    today,
  });
  expect(s.loans).toEqual({ count: 1, total: 12500 });
  expect(s.creditCards).toEqual({ count: 1, total: 12500 });
  expect(s.position.assets).toBe(25000);
  expect(s.position.liabilities).toBe(12500);
  expect(s.position.netWorth).toBe(12500);
});

test('plans created in Budgets & Plans are included with savings goals in the planning summary', () => {
  const toBase = (value, currency) => currency === 'USD' ? value * 50 : value;
  const s = planningSummary({
    goals: [{ id: 'g1', status: 'active', target_amount: 4000, currency: 'PHP' }],
    allocations: [{ id: 'a1', goal_id: 'g1', status: 'allocated', amount: 1000, currency: 'PHP' }],
    plans: [{ id: 'p1', name: 'Emergency fund', target: 1000, saved: 200, currency: 'USD' }],
    toBase,
    today,
  });
  expect(s.plans).toEqual({ count: 1, saved: 10000, target: 50000 });
  expect(s.goals).toMatchObject({ count: 2, saved: 11000, target: 54000 });
  expect(s.goals.percent).toBeCloseTo(20.37037, 4);
});


test('active subscription renewals are projected into Bills Due alongside manual bills', () => {
  const { subscriptionBillData } = require('./financialPlanningIntegrations');
  const { billsSummary } = require('./bills');
  const projected = subscriptionBillData([
    { id: 'netflix', name: 'Netflix', amount: 549, currency: 'PHP', cycle: 'monthly', start: '2026-11-10', status: 'active' },
    { id: 'paused', name: 'Paused', amount: 100, currency: 'PHP', cycle: 'monthly', start: '2026-11-10', status: 'paused' },
    { id: 'cancelled', name: 'Cancelled', amount: 100, currency: 'PHP', cycle: 'monthly', start: '2026-11-10', status: 'cancelled' },
  ], '2026-11-05', '2027-01-10');
  expect(projected.bills).toHaveLength(1);
  expect(projected.occurrences.map(row => row.due_date)).toEqual(['2026-11-10', '2026-12-10', '2027-01-10']);
  const manual = { id: 'manual-occurrence', bill_id: 'manual', due_date: '2026-11-12', expected_amount: 1200, currency: 'PHP', status: 'scheduled' };
  const summary = billsSummary([manual, ...projected.occurrences], [], '2026-11-05');
  expect(summary.dueThisMonth).toBe(1749);
  expect(summary.upcoming[0].id).toBe('subscription-netflix-2026-11-10');
});

test('overdue subscription renewals remain visible and recorded renewals count as paid', () => {
  const { subscriptionBillData } = require('./financialPlanningIntegrations');
  const { billsSummary } = require('./bills');
  const overdue = subscriptionBillData([
    { id: 'missed', name: 'Missed renewal', amount: 300, currency: 'PHP', cycle: 'monthly', start: '2026-10-10', status: 'active' },
    { id: 'paused', name: 'Paused', amount: 100, currency: 'PHP', cycle: 'monthly', start: '2026-10-10', status: 'paused' },
  ], '2026-11-05', '2027-01-05');
  expect(overdue.occurrences).toHaveLength(1);
  expect(billsSummary(overdue.occurrences, [], '2026-11-05').overdueCount).toBe(1);
  const paid = subscriptionBillData([
    { id: 'music', name: 'Music', amount: 199, currency: 'PHP', cycle: 'monthly', start: '2026-12-05', status: 'active', lastPaidAt: '2026-11-04T10:00:00.000Z', lastPaidAmount: 199, lastPaidCurrency: 'PHP' },
  ], '2026-11-05', '2027-01-05');
  expect(billsSummary(paid.occurrences, paid.payments, '2026-11-05').paidThisMonth).toBe(199);
});

test('live credit-card ledger balances and normalized plans remain consistent in financial summaries', () => {
  const summary = planningSummary({
    accounts: [{ id: 'credit', account_type: 'card', cardKind: 'credit', currency: 'PHP', balance: -1750, liability_balance: 0 }],
    plans: [
      { id: 'p1', name: 'Trip', amount: 12000, saved_amount: 3000, target_date: '2027-02-01', currency: 'PHP' },
      { id: 'p2', name: 'Archived', target: 5000, saved: 500, status: 'archived', currency: 'PHP' },
    ],
    toBase: value => value,
    today,
  });
  expect(summary.loans).toEqual({ count: 1, total: 1750 });
  expect(summary.position.liabilities).toBe(1750);
  expect(summary.plans).toEqual({ count: 1, saved: 3000, target: 12000 });
  expect(summary.goals).toMatchObject({ count: 1, saved: 3000, target: 12000, percent: 25 });
});


test('plan funding allocations reduce available money without changing account assets', () => {
  const s = planningSummary({
    accounts: [{ id: 'bank', account_type: 'bank', currency: 'PHP', balance: 50000 }],
    plans: [{ id: 'p1', name: 'Japan Trip', target: 5000, saved: 2500, currency: 'PHP' }],
    planAllocations: [
      { id: 'pa1', plan_id: 'p1', account_id: 'bank', amount: 2500, currency: 'PHP', status: 'allocated' },
    ],
    today,
  });
  expect(s.position.assets).toBe(50000);
  expect(s.position.reservedForGoals).toBe(2500);
  expect(s.position.availableMoney).toBe(47500);
});


test('active plan allocations count toward plan savings and reduce available money without reducing bank balance', () => {
  const s = planningSummary({
    accounts: [{ id: 'bank', account_type: 'bank', currency: 'PHP', balance: 10000 }],
    plans: [{ id: 'p1', name: 'Emergency fund', target: 5000, saved: 500, currency: 'PHP' }],
    planAllocations: [
      { id: 'pa1', plan_id: 'p1', account_id: 'bank', amount: 2000, currency: 'PHP', status: 'allocated' },
      { id: 'pa2', plan_id: 'p1', account_id: 'bank', amount: 700, currency: 'PHP', status: 'released' },
    ],
    toBase: amount => amount,
    today,
  });
  expect(s.plans).toEqual({ count: 1, saved: 2500, target: 5000 });
  expect(s.position.liquidAccounts).toBe(10000);
  expect(s.position.reservedForGoals).toBe(2000);
  expect(s.position.availableMoney).toBe(8000);
});
