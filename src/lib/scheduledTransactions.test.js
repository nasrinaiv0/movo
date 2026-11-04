import { nextScheduledDate } from './scheduledTransactions';

test('advances weekly and yearly schedules', () => {
  expect(nextScheduledDate('2026-11-04','weekly')).toBe('2026-11-11');
  expect(nextScheduledDate('2026-11-04','yearly')).toBe('2027-11-04');
});

test('clamps monthly dates to the last day of shorter months', () => {
  expect(nextScheduledDate('2027-01-31','monthly')).toBe('2027-02-28');
  expect(nextScheduledDate('2028-01-31','monthly')).toBe('2028-02-29');
  expect(nextScheduledDate('2027-03-31','monthly')).toBe('2027-04-30');
});

test('one-time schedules do not advance', () => {
  expect(nextScheduledDate('2026-11-04','once')).toBe('2026-11-04');
});
