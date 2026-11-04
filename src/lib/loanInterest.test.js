import { buildMonthlyInterestSchedule } from './loanInterest';

test('builds one rate entry for each requested month', () => {
  expect(buildMonthlyInterestSchedule(true, 3, ['1.5', '1.75', '2'])).toEqual([
    { month: 1, rate: 1.5 }, { month: 2, rate: 1.75 }, { month: 3, rate: 2 },
  ]);
});

test('allows zero interest for a promotional month', () => {
  expect(buildMonthlyInterestSchedule(true, 2, ['0', '1.25'])).toEqual([
    { month: 1, rate: 0 }, { month: 2, rate: 1.25 },
  ]);
});

test('does not require a schedule when inconsistent interest is disabled', () => {
  expect(buildMonthlyInterestSchedule(false, '', [])).toEqual([]);
});

test('rejects missing rates, invalid month counts and out-of-range rates', () => {
  expect(() => buildMonthlyInterestSchedule(true, 2, ['1'])).toThrow('every month');
  expect(() => buildMonthlyInterestSchedule(true, 0, [])).toThrow('between 1 and 600');
  expect(() => buildMonthlyInterestSchedule(true, 1, ['101'])).toThrow('month 1');
  expect(() => buildMonthlyInterestSchedule(true, 1, [''])).toThrow('month 1');
});
