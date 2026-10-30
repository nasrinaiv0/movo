import { buildBriefing } from './insights';

const tx = (date, type, amount, extra = {}) => ({ date: `${date}T12:00:00`, type, amount, category: 'Groceries', merchant: 'Store', ...extra });
const ref = new Date('2026-10-28T18:00:00');

test('summarises spending with the correct direction, top category and savings rate', () => {
  const txs = [tx('2026-10-05', 'income', 10000), tx('2026-10-06', 'expense', 3000), tx('2026-10-07', 'expense', 1000, { category: 'Transport' }), tx('2026-10-08', 'expense', 500, { category: 'Transport', merchant: 'Grab' })];
  const b = buildBriefing({ txs, refDate: ref, deltas: { expenses: { direction: 'up', percent: 20, tone: 'bad' } } });
  expect(b.items[0]).toMatchObject({ key: expect.stringContaining('more than'), money: { amount: 4500 }, vars: { pct: '20%' }, tone: 'red' });
  expect(b.items[1]).toMatchObject({ category: 'Groceries', money: { amount: 3000 }, vars: { pct: '67%' } });
  expect(b.items.find(i => i.key.startsWith('You kept'))).toMatchObject({ vars: { pct: '55%' }, tone: 'green' });
});

test('flags overspending, budgets over limit and renewals, and gives relevant tips', () => {
  const txs = [tx('2026-10-05', 'income', 1000), tx('2026-10-06', 'expense', 1500)];
  const subs = { dueSoon: [{}, {}], dueSoonTotal: 800, monthly: 300, upcoming: [{ category: 'AI Tools' }, { category: 'AI Tools' }] };
  const b = buildBriefing({ txs, refDate: ref, budgets: [{ category: 'Groceries', level: 'over', percent: 120 }], subs });
  expect(b.items.find(i => i.key.startsWith('You spent {amount} more'))).toMatchObject({ money: { amount: 500 }, tone: 'red' });
  expect(b.items.find(i => i.key.includes('renew this week'))).toMatchObject({ money: { amount: 800 }, vars: { n: 2 } });
  expect(b.items.find(i => i.key.includes('budget is over'))).toMatchObject({ category: 'Groceries' });
  expect(b.tips[0].key).toContain('50/30/20');
  expect(b.tips.map(t => t.key).join(' ')).toContain('Subscriptions take');
  expect(b.tips).toHaveLength(3);
});

test('with no records it still offers general tips and no made-up figures', () => {
  const b = buildBriefing({ txs: [], refDate: ref });
  expect(b.items).toEqual([]);
  expect(b.hasData).toBe(false);
  expect(b.tips.length).toBeGreaterThan(0);
  b.tips.forEach(t => expect(t.money).toBeUndefined());
});
