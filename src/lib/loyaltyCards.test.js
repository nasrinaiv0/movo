import { LOYALTY_PROVIDERS, normalizeLoyaltyCard, visibleLoyaltyCards, maskedMembershipNumber, estimateLoyaltyRewards, estimatedLoyaltyTotals } from './loyaltyCards';

test('known membership providers include user requested fuel and coffee businesses', () => {
  ['Petron', 'Seaoil', 'Starbucks', 'Tim Hortons'].forEach(provider => expect(LOYALTY_PROVIDERS).toContain(provider));
});

test('normalizes a points membership without creating a cash account', () => {
  const card = normalizeLoyaltyCard({ type: 'membership', name: ' Petron ', memberNumber: '1234567890', points: '120.50', pointsUnit: 'points', noExpiry: true });
  expect(card).toEqual(expect.objectContaining({ type: 'membership', name: 'Petron', points: '120.50', noExpiry: true }));
  expect(card.opening_balance).toBeUndefined();
  expect(card.account_type).toBeUndefined();
  expect(maskedMembershipNumber(card.memberNumber)).toBe('•••• 7890');
  expect(() => normalizeLoyaltyCard({ type: 'card', name: 'Bad' })).toThrow('invalid_loyalty_type');
  expect(() => normalizeLoyaltyCard({ type: 'tokens', name: 'Bad', points: '-1' })).toThrow('invalid_loyalty_points');
  expect(() => normalizeLoyaltyCard({ type: 'tokens', name: 'Bad', points: '2.333' })).toThrow('invalid_loyalty_points');
});

test('recognizes old membership cards as memberships and retains token cards', () => {
  expect(visibleLoyaltyCards({ membershipCards: [{ id: 'legacy', name: 'Watsons', points: 8 }, { id: 'token', name: 'Starbucks', type: 'tokens' }] }).map(row => row.type)).toEqual(['membership', 'tokens']);
});

const accounts = [
  { id: 'bank', account_type: 'bank', currency: 'PHP' },
  { id: 'credit', account_type: 'card', currency: 'PHP' },
  { id: 'archive', account_type: 'bank', is_archived: true, currency: 'PHP' },
];
const cards = [{ id: 'petron-card', type: 'membership', name: 'Petron', points: '50', pointsUnit: 'points' }];
const rules = { 'petron-card': { enabled: true, accountId: 'bank', currency: 'PHP', merchantContains: 'Petron', pointsPer100: '2.5' } };
const transactions = [
  { id: 'one', type: 'expense', amount: 200, account_id: 'bank', merchant: 'Petron Roxas', currency: 'PHP' },
  { id: 'two', type: 'expense', amount: 100, account_id: 'bank', merchant: 'Starbucks', currency: 'PHP' },
  { id: 'three', type: 'income', amount: 900, account_id: 'bank', merchant: 'Petron', currency: 'PHP' },
  { id: 'four', type: 'expense', amount: 100, account_id: 'credit', merchant: 'Petron', currency: 'PHP' },
  { id: 'five', type: 'expense', amount: 200, account_id: 'bank', merchant: 'Petron', currency: 'USD' },
];

test('estimates points for matched merchant, account, currency and expense only', () => {
  const result = estimateLoyaltyRewards(transactions, accounts, cards, rules);
  expect(result).toHaveLength(1);
  expect(result[0]).toEqual(expect.objectContaining({ id: 'reward-petron-card-one', points: 5, cardId: 'petron-card', transactionId: 'one', status: 'Estimated' }));
  expect(estimatedLoyaltyTotals(result)).toEqual({ 'petron-card': 5 });
});

test('deleting a transaction reverses estimated rewards automatically without modifying recorded points', () => {
  const before = estimatedLoyaltyTotals(estimateLoyaltyRewards(transactions, accounts, cards, rules));
  const after = estimatedLoyaltyTotals(estimateLoyaltyRewards(transactions.filter(tx => tx.id !== 'one'), accounts, cards, rules));
  expect(before['petron-card']).toBe(5);
  expect(after['petron-card']).toBeUndefined();
  expect(cards[0].points).toBe('50');
});

test('rejects disabled rules, unsupported accounts, empty merchant match and invalid rates', () => {
  expect(estimateLoyaltyRewards(transactions, accounts, cards, { 'petron-card': { ...rules['petron-card'], enabled: false } })).toHaveLength(0);
  expect(estimateLoyaltyRewards(transactions, accounts, cards, { 'petron-card': { ...rules['petron-card'], accountId: 'archive' } })).toHaveLength(0);
  expect(estimateLoyaltyRewards(transactions, accounts, cards, { 'petron-card': { ...rules['petron-card'], merchantContains: '' } })).toHaveLength(0);
  expect(estimateLoyaltyRewards(transactions, accounts, cards, { 'petron-card': { ...rules['petron-card'], pointsPer100: '100001' } })).toHaveLength(0);
});
