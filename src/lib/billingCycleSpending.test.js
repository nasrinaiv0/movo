import { shiftBillingCycle, billingCycleSpending, spendingVsPreviousCycle } from './billingCycleSpending';
const expense = (date, amount) => ({ type:'expense', date, amount });
test('monthly chart has 12 calendar periods, preserves cents and excludes income/transfers', () => {
  const txs=[expense('2025-12-31',30.10),expense('2026-01-01',20.23),
    expense('2026-02-15',70.12),expense('2026-02-20',0.11),
    {type:'transfer',date:'2026-02-22',amount:2000},
    {type:'income',date:'2026-02-25',amount:9000},
    {type:'allocation',date:'2026-02-26',amount:1000}];
  expect(shiftBillingCycle('2026-01',-1)).toBe('2025-12');
  expect(shiftBillingCycle('2025-12',2)).toBe('2026-02');
  const rows=billingCycleSpending(txs,'2026-02',4);
  expect(rows).toEqual([{key:'2025-11',amount:0},{key:'2025-12',amount:30.10},
    {key:'2026-01',amount:20.23},{key:'2026-02',amount:70.23}]);
});
test('historical cycle % compares against actual previous month, not daily buckets', () => {
  const t=spendingVsPreviousCycle([expense('2026-10-01',100),expense('2026-11-02',50)],'2026-11');
  expect(t).toEqual(expect.objectContaining({direction:'down',percent:50,tone:'good'}));
  expect(spendingVsPreviousCycle([expense('2026-11-02',50)],'2026-11')).toBeNull();
  expect(spendingVsPreviousCycle([expense('2026-10-02',50)],'all')).toBeNull();
  expect(billingCycleSpending([], 'invalid')).toEqual([]);
});

describe('graph rows that follow the billing-cycle filter', () => {
  const { dailyCycleSpending, allCycleSpending } = require('./billingCycleSpending');
  const tx = (date, amount, type = 'expense') => ({ type, amount, date });

  test('a chosen cycle gives one row for every day of that month, in order, with exact cents', () => {
    const rows = dailyCycleSpending([
      tx('2026-11-01T02:00:00Z', 10.1), tx('2026-11-01T05:00:00Z', 0.2), tx('2026-11-30T03:00:00Z', 47),
      tx('2026-10-31T03:00:00Z', 999), tx('2026-12-01T03:00:00Z', 999), tx('2026-11-10T03:00:00Z', 500, 'income'),
    ], '2026-11');
    expect(rows).toHaveLength(30);
    expect(rows[0]).toEqual({ key: '2026-11-01', amount: 10.3 });
    expect(rows[29]).toEqual({ key: '2026-11-30', amount: 47 });
    expect(rows.slice(1, 29).every(row => row.amount === 0)).toBe(true);
    expect(dailyCycleSpending([], '2028-02')).toHaveLength(29); // leap year
    expect(dailyCycleSpending([], 'all')).toEqual([]);
  });

  test('"All" gives every cycle from the first one with data to the present, empty months included', () => {
    const rows = allCycleSpending([tx('2026-08-12T03:00:00Z', 120), tx('2026-10-02T03:00:00Z', 30.5), tx('2026-10-20T03:00:00Z', 9.5)], '2026-11');
    expect(rows).toEqual([{ key: '2026-08', amount: 120 }, { key: '2026-09', amount: 0 }, { key: '2026-10', amount: 40 }, { key: '2026-11', amount: 0 }]);
    expect(allCycleSpending([], '2026-11')).toEqual([{ key: '2026-11', amount: 0 }]);
    // A long history keeps the most recent cycles.
    const long = allCycleSpending([tx('2020-01-05T03:00:00Z', 1)], '2026-11', 36);
    expect(long).toHaveLength(36);
    expect(long[35].key).toBe('2026-11');
  });
});
