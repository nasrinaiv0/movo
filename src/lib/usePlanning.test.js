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
