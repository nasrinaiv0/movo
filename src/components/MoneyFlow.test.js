import { buildFlow } from './MoneyFlow';
import { budgetProgress } from './Budgets';

const tx = (date, type, amount, category = 'Groceries') => ({ date, type, amount, category });
const txs = [tx('2026-10-28T10:00:00+08:00', 'expense', 100), tx('2026-10-28T12:00:00+08:00', 'income', 500, 'Income'), tx('2026-09-02T10:00:00+08:00', 'expense', 40), tx('2026-10-27T10:00:00+08:00', 'transfer', 900, 'Transfer')];
const ref = new Date('2026-10-28T15:00:00+08:00');

test('daily flow ends today and ignores transfers', () => {
  const days = buildFlow(txs, 'day', ref);
  expect(days).toHaveLength(14);
  expect(days[13]).toMatchObject({ income: 500, expense: 100 });
  expect(days[12]).toMatchObject({ income: 0, expense: 0 });
});

test('monthly and yearly flows group correctly', () => {
  const months = buildFlow(txs, 'month', ref);
  expect(months).toHaveLength(12);
  expect(months[11]).toMatchObject({ income: 500, expense: 100 });
  expect(months[10]).toMatchObject({ expense: 40 });
  const years = buildFlow(txs, 'year', ref);
  expect(years[years.length - 1]).toMatchObject({ key: '2026', income: 500, expense: 140 });
});

test('custom ranges use days for a month or less', () => {
  const custom = buildFlow(txs, 'custom', ref, { from: '2026-10-27', to: '2026-10-28' });
  expect(custom.map(b => b.expense)).toEqual([0, 100]);
});

test('budget progress flags categories near or over their limit', () => {
  const list = [tx('2026-10-01', 'expense', 900), tx('2026-10-02', 'expense', 50, 'Transport')];
  const [groceries, transport] = budgetProgress([{ id: 'a', category: 'Groceries', monthly_limit: 800 }, { id: 'b', category: 'Transport', monthly_limit: 100 }], list);
  expect(groceries).toMatchObject({ spent: 900, percent: 113, level: 'over', left: -100 });
  expect(transport).toMatchObject({ spent: 50, percent: 50, level: 'ok' });
});
