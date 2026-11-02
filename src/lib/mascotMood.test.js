import { mascotMood, moodMessage } from './mascotMood';

const b = (category, percent, limit = 1000) => ({ category, percent, monthly_limit: limit });

test('budgets drive the mood: over is angry, near is disappointed, well under smiles', () => {
  expect(mascotMood({ budgets: [b('Food', 40), b('Transport', 120)] })).toMatchObject({ mood: 'angry', reason: 'budget-over', category: 'Transport' });
  expect(mascotMood({ budgets: [b('Food', 85), b('Bills', 20)] })).toMatchObject({ mood: 'sad', reason: 'budget-near', category: 'Food' });
  expect(mascotMood({ budgets: [b('Food', 30), b('Bills', 10)] })).toMatchObject({ mood: 'smile', reason: 'budget-ok' });
  expect(mascotMood({ budgets: [b('Food', 65)] })).toMatchObject({ mood: 'cute', reason: 'budget-fine' });
  expect(mascotMood({ budgets: [b('Food', 100)] }).mood).toBe('angry');
  expect(mascotMood({ budgets: [b('Food', 80)] }).mood).toBe('sad');
});

test('budgets win over income, and budgets without a limit are ignored', () => {
  expect(mascotMood({ budgets: [b('Food', 10)], income: 100, expenses: 500 }).mood).toBe('smile');
  expect(mascotMood({ budgets: [b('Food', 0, 0)], income: 1000, expenses: 900 }).mood).toBe('sad');
});

test('without budgets, the month’s income stands in as the limit', () => {
  expect(mascotMood({ income: 15000, expenses: 25089 })).toMatchObject({ mood: 'angry', reason: 'income-over' });
  expect(mascotMood({ income: 1000, expenses: 850 }).mood).toBe('sad');
  expect(mascotMood({ income: 1000, expenses: 600 }).mood).toBe('cute');
  expect(mascotMood({ income: 1000, expenses: 100 }).mood).toBe('smile');
});

test('with no limit and no income the ram stays cute and invites a limit', () => {
  expect(mascotMood({})).toMatchObject({ mood: 'cute', reason: 'empty' });
  expect(mascotMood({ expenses: 300 })).toMatchObject({ mood: 'cute', reason: 'no-limit' });
  expect(moodMessage({ reason: 'budget-over', category: 'Food' })).toEqual(['Grr! {category} is over its limit.', { category: 'Food' }]);
  expect(moodMessage({ reason: 'no-limit' })[0]).toMatch(/limit/);
});
