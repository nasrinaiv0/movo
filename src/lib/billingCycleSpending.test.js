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
