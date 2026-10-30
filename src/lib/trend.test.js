import { trend, percentLabel, periodTotals, monthOverMonth, GOOD_WHEN } from './trend';

describe('trend', () => {
  test('expenses going up are red and pointing up; going down are green and pointing down', () => {
    expect(trend(1200, 1000, GOOD_WHEN.expenses)).toEqual({ direction: 'up', percent: 20, tone: 'bad' });
    expect(trend(800, 1000, GOOD_WHEN.expenses)).toEqual({ direction: 'down', percent: 20, tone: 'good' });
  });

  test('income, savings and balance going up are green; going down are red', () => {
    ['income', 'savings', 'balance'].forEach((k) => {
      expect(trend(150, 100, GOOD_WHEN[k])).toMatchObject({ direction: 'up', tone: 'good' });
      expect(trend(50, 100, GOOD_WHEN[k])).toMatchObject({ direction: 'down', tone: 'bad' });
    });
  });

  test('transfers keep their direction but stay neutral', () => {
    expect(trend(300, 100, GOOD_WHEN.transfers)).toMatchObject({ direction: 'up', tone: 'neutral', percent: 200 });
    expect(trend(50, 100, GOOD_WHEN.transfers)).toMatchObject({ direction: 'down', tone: 'neutral', percent: 50 });
  });

  test('measures against the size of a negative baseline so recoveries read as improvements', () => {
    expect(trend(500, -1000, 'up')).toEqual({ direction: 'up', percent: 150, tone: 'good' });
    expect(trend(-1500, -1000, 'up')).toEqual({ direction: 'down', percent: 50, tone: 'bad' });
  });

  test('no change is flat and neutral; no baseline gives no indicator; bad input is ignored', () => {
    expect(trend(100, 100)).toEqual({ direction: 'flat', percent: 0, tone: 'neutral' });
    expect(trend(0.1 + 0.2, 0.3)).toEqual({ direction: 'flat', percent: 0, tone: 'neutral' });
    expect(trend(0, 0)).toEqual({ direction: 'flat', percent: 0, tone: 'neutral' });
    expect(trend(500, 0)).toBeNull();
    expect(trend(NaN, 10)).toBeNull();
    expect(trend(10, undefined)).toBeNull();
  });

  test('percent labels never hide a real change', () => {
    expect(percentLabel(0)).toBe('0%');
    expect(percentLabel(0.4)).toBe('<1%');
    expect(percentLabel(12.5)).toBe('13%');
    expect(percentLabel(4321)).toBe('999+%');
  });
});

const tx = (date, type, amount) => ({ date: `${date}T12:00:00`, type, amount });

describe('month over month', () => {
  const txs = [
    tx('2026-10-28', 'expense', 1200), tx('2026-10-05', 'income', 5000), tx('2026-10-10', 'transfer', 300),
    tx('2026-09-20', 'expense', 1000), tx('2026-09-02', 'income', 5000), tx('2026-09-12', 'transfer', 100),
    tx('2026-09-29', 'expense', 9999), // after day 28, so outside the comparison window
  ];

  test('sums only the same stretch of each month', () => {
    expect(periodTotals(txs, '2026-09', 28)).toEqual({ income: 5000, expenses: 1000, transfers: 100, savings: 4000 });
    expect(periodTotals(txs, '2026-10', 28)).toEqual({ income: 5000, expenses: 1200, transfers: 300, savings: 3800 });
  });

  test('compares month-to-date with the same days last month', () => {
    const r = monthOverMonth(txs, new Date('2026-10-28T18:00:00'), 10000);
    expect(r.expenses).toEqual({ direction: 'up', percent: 20, tone: 'bad' });
    expect(r.spent).toEqual(r.expenses);
    expect(r.income).toEqual({ direction: 'flat', percent: 0, tone: 'neutral' });
    expect(r.savings).toMatchObject({ direction: 'down', percent: 5, tone: 'bad' });
    expect(r.transfers).toMatchObject({ direction: 'up', percent: 200, tone: 'neutral' });
  });

  test('balance is compared with what it was on the same day last month', () => {
    // Since 28 Sep: −9,999 (29 Sep) + 5,000 − 1,200 (October) = −6,199 → balance was 16,199 then.
    const r = monthOverMonth(txs, new Date('2026-10-28T18:00:00'), 10000);
    expect(r.balance.direction).toBe('down');
    expect(r.balance.tone).toBe('bad');
    expect(r.balance.percent).toBeCloseTo((6199 / 16199) * 100, 6);
  });

  test('on the last day of a month the whole previous month is used', () => {
    const r = monthOverMonth([tx('2026-02-28', 'expense', 100), tx('2026-01-30', 'expense', 50), tx('2026-01-31', 'expense', 50)], new Date('2026-02-28T12:00:00'), 0);
    expect(r.expenses).toMatchObject({ direction: 'flat' });
  });

  test('a short previous month is clamped, not overrun', () => {
    const r = monthOverMonth([tx('2026-03-31', 'expense', 300), tx('2026-02-28', 'expense', 100)], new Date('2026-03-31T12:00:00'), 0);
    expect(r.expenses).toMatchObject({ direction: 'up', percent: 200, tone: 'bad' });
  });
});
