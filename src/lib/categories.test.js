import { PRIMARY, GROUPS, NEEDS_REVIEW, categoryId, categoryOf, categoryFullLabel, subcategoriesFor, guessCategory, RULES } from './categories';

test('the quick picker has the 12 compact categories and every detailed group belongs to one', () => {
  expect(PRIMARY.map(p => p.label)).toEqual(['Food & Dining', 'Transportation', 'Housing & Home', 'Bills & Utilities', 'Shopping', 'Health & Medical', 'Personal Care', 'Entertainment', 'Travel', 'Education', 'Financial & Debt', 'Other']);
  expect(GROUPS).toHaveLength(22);
  const ids = new Set(PRIMARY.map(p => p.id));
  GROUPS.forEach(g => expect(ids.has(g.primary)).toBe(true));
  expect(subcategoriesFor('other').map(g => g.group)).toEqual(['family', 'pets', 'work', 'business', 'gifts', 'government', 'misc']);
});

test('older labels and any label resolve to stable ids; custom text is kept', () => {
  expect(categoryId('Food & drinks')).toBe('food');
  expect(categoryId('Groceries')).toBe('food:groceries');
  expect(categoryId('Transport')).toBe('transport');
  expect(categoryId('ride-hailing')).toBe('transport:ride_hailing');
  expect(categoryId('transport:ride_hailing')).toBe('transport:ride_hailing');
  expect(categoryId('transport:not_a_sub')).toBe('');
  const custom = categoryOf('Bad debt');
  expect(custom).toMatchObject({ custom: true, primary: 'other', label: 'Bad debt' });
  expect(categoryOf('digital:ai_subscriptions')).toMatchObject({ primary: 'bills', label: 'Bills & Utilities', subLabel: 'AI Subscriptions' });
  expect(categoryOf('income')).toMatchObject({ primary: 'income', label: 'Income' });
  expect(categoryFullLabel('food:coffee_and_tea')).toBe('Food & Dining · Coffee & Tea');
});

test('auto-categorization is specific when clear and asks for review when not', () => {
  RULES.forEach(([id]) => expect(categoryId(id)).toBe(id));
  expect(guessCategory('Grab ride to Makati')).toBe('transport:ride_hailing');
  expect(guessCategory('GrabFood order')).toBe('food:food_delivery');
  expect(guessCategory('Meralco October')).toBe('bills:electricity');
  expect(guessCategory('Netflix')).toBe('entertainment:streaming_entertainment');
  expect(guessCategory('PhilHealth contribution')).toBe('government:government_contributions');
  expect(guessCategory('Jollibee and Shell')).toBe(NEEDS_REVIEW); // two categories: review, not a guess
  expect(guessCategory('Something new')).toBe(NEEDS_REVIEW);
});
