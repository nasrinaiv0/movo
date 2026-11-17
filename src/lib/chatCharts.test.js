import { buildChatChart, chartKind, chartSummary } from './chatCharts';

const now = new Date('2026-11-19T15:00:00'); // a Thursday
const at = (days, h = 10) => { const x = new Date(now); x.setDate(x.getDate() - days); x.setHours(h); return x.toISOString(); };
const txs = [
  { amount: 165, type: 'expense', category: 'Food & drinks', date: at(0) },
  { amount: 245, type: 'expense', category: 'Transport', date: at(1) },
  { amount: 2380, type: 'expense', category: 'Groceries', date: at(2) },
  { amount: 900, type: 'expense', category: 'bills:electricity', date: at(40) },
  { amount: 42000, type: 'income', category: 'Income', date: at(6) },
  { amount: 500, type: 'transfer', category: 'Transfer', date: at(3) },
];
const fmt = (n) => `₱${n}`;

test('only chart-style requests get a chart', () => {
  expect(chartKind('Show my spending chart')).toBe('categories');
  expect(chartKind('Where did my money go this month?')).toBe('categories');
  expect(chartKind('Ipakita ang tsart ng gastos ko')).toBe('categories');
  expect(chartKind('income vs expenses')).toBe('flow');
  expect(chartKind('graph my income and expenses')).toBe('flow');
  expect(chartKind('spending trend this week')).toBe('trend');
  expect(chartKind('monthly spending')).toBe('trend');
  expect(chartKind('budget chart')).toBe('budgets');
  expect(chartKind('How much did I spend today?')).toBe('');
  expect(chartKind('Spent 250 on Grab')).toBe('');
  expect(chartKind('')).toBe('');
});

test('spending by category: largest first with shares of the total, transfers and income left out', () => {
  const chart = buildChatChart('spending by category chart', { txs, now });
  expect(chart.kind).toBe('categories');
  expect(chart.period).toBe('This month');
  expect(chart.total).toBe(2790);
  expect(chart.rows.map(r => [r.label, r.value, r.percent])).toEqual([['Food & Dining', 2545, 91], ['Transportation', 245, 9]]);
  expect(chartSummary(chart, fmt)).toBe('This month: spent ₱2790. Food & Dining is the largest at 91%.');
  expect(buildChatChart('chart of spending last week', { txs: [], now }).empty).toBe(true);
});

test('a week trend has one bar per day; a monthly trend one per month', () => {
  const week = buildChatChart('spending trend this week', { txs, now, locale: 'en-US' });
  expect(week.rows).toHaveLength(7);
  expect(week.total).toBe(2790);
  expect(week.peak.value).toBe(2380);
  const months = buildChatChart('monthly spending graph', { txs, now, locale: 'en-US' });
  expect(months.rows).toHaveLength(6);
  expect(months.rows.at(-1).value).toBe(2790);
  expect(months.rows.at(-2).value).toBe(900);
  expect(months.period).toBe('Last 6 months');
});

test('income vs expenses covers six months with a net total', () => {
  const chart = buildChatChart('income vs expenses', { txs, now, locale: 'en-US' });
  expect(chart.kind).toBe('flow');
  expect(chart.rows).toHaveLength(6);
  expect(chart.rows.at(-1)).toMatchObject({ income: 42000, expenses: 2790 });
  expect(chart.net).toBe(42000 - 2790 - 900);
  expect(chartSummary(chart, fmt)).toBe(`Last 6 months: earned ₱42000, spent ₱3690, net ₱${42000 - 3690}.`);
});

test('budget charts show how much of each limit is used, fullest first', () => {
  const budgets = [{ category: 'Transport', monthly_limit: 3000, spent: 245, percent: 8 }, { category: 'Food & drinks', monthly_limit: 2000, spent: 2545, percent: 127 }];
  const chart = buildChatChart('budget chart', { budgets, now });
  expect(chart.rows.map(r => [r.label, r.percent])).toEqual([['Food & Dining', 127], ['Transportation', 8]]);
  expect(chartSummary(chart, fmt)).toBe('1 of your limits are over this month.');
  expect(chartSummary(buildChatChart('budget graph', { now }), fmt)).toBe('You have no monthly limits yet. Add one in Menu → Limits.');
});
