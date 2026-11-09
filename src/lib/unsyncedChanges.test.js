import { unsyncedChangeCount } from './unsyncedChanges';

const account = { id: 'a1', user_id: 'u1', name: 'BPI', account_type: 'bank', currency: 'PHP', opening_balance: 100 };
const tx = (id, amount) => ({ id, user_id: 'u1', account_id: 'a1', transaction_type: 'expense', amount, currency: 'PHP', merchant: 'Grab', occurred_at: '2026-11-09T10:00:00Z' });
const groups = (accounts, transactions) => ({ financial_accounts: accounts, transactions });

test('a clean or missing device copy has nothing waiting', () => {
  expect(unsyncedChangeCount(null)).toBe(0);
  expect(unsyncedChangeCount({ dirty: false, baseline: groups([account], [tx('t1', 50)]), working: groups([account], [tx('t1', 75)]) })).toBe(0);
});

test('counts added, changed and removed records once each, and pending deletions', () => {
  const workspace = {
    dirty: true,
    baseline: groups([account], [tx('t1', 50), tx('t2', 20), tx('t3', 10)]),
    // t1 changed, t2 unchanged, t3 removed, t4 added.
    working: groups([account], [tx('t1', 75), tx('t2', 20), tx('t4', 5)]),
    pendingDeletions: { transactions: ['t3'] },
  };
  expect(unsyncedChangeCount(workspace)).toBe(3);
});

test('an amount written differently is the same record, not a change', () => {
  const workspace = { dirty: true, baseline: groups([account], [tx('t1', 50)]), working: groups([account], [{ ...tx('t1', 50), amount: '50.00' }]) };
  // Still marked dirty, so at least one change is reported.
  expect(unsyncedChangeCount(workspace)).toBe(1);
});

test('reading the count never changes the workspace', () => {
  const workspace = { dirty: true, baseline: groups([], []), working: groups([account], [tx('t1', 50)]) };
  const before = JSON.stringify(workspace);
  expect(unsyncedChangeCount(workspace)).toBe(2);
  expect(JSON.stringify(workspace)).toBe(before);
});
