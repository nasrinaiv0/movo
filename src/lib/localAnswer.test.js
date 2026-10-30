import { answerLocally, periodOf } from './localAnswer';

const now = new Date('2026-10-30T15:00:00');
const d = (n, h = 10) => { const x = new Date(now); x.setDate(x.getDate() - n); x.setHours(h); return x.toISOString(); };
const txs = [
  { merchant: 'Coffee', amount: 165, type: 'expense', category: 'Food & drinks', date: d(0) },
  { merchant: 'Ride home', amount: 245, type: 'expense', category: 'Transport', date: d(1) },
  { merchant: 'Groceries', amount: 2380, type: 'expense', category: 'Groceries', date: d(2) },
  { merchant: 'Salary', amount: 42000, type: 'income', category: 'Income', date: d(6) },
];
const ctx = { txs, accounts: [{ name: 'Savings', balance: 48250 }], budgets: [{ category: 'Transport', monthly_limit: 3000, spent: 245, left: 2755, percent: 8 }], upcoming: [{ name: 'Streaming', amount: 549, next: '2026-11-02' }], fmt: (n) => `₱${n}`, now };

test('answers spending by period, in English and Filipino', () => {
  expect(answerLocally('How much did I spend today?', ctx)).toContain('₱165');
  expect(answerLocally('Magkano gastos ko kahapon?', ctx)).toContain('₱245');
  expect(answerLocally('how much did I spend this month', ctx)).toContain('₱2790');
});

test('answers income, top categories, balance, budgets, renewals and the latest record', () => {
  expect(answerLocally('How much did I earn this month?', ctx)).toContain('₱42000');
  expect(answerLocally('Which category did I spend the most on?', ctx)).toMatch(/1\. Groceries/);
  expect(answerLocally("What's my balance?", ctx)).toContain('₱48250');
  expect(answerLocally('transport budget', ctx)).toContain('₱2755 left');
  expect(answerLocally('upcoming renewals', ctx)).toContain('Streaming');
  expect(answerLocally('what was my last transaction', ctx)).toContain('Coffee');
});

test('filters by category and leaves unrelated questions to NasrinAI', () => {
  expect(answerLocally('food this week', ctx)).toContain('₱165');
  expect(answerLocally('Should I invest in index funds?', ctx)).toBeNull();
  expect(periodOf('last month', now).label).toBe('Last month');
});
