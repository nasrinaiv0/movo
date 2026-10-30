import { findDuplicate, sameMerchant } from './duplicates';

const records = [
  { id: '1', merchant: 'Jollibee Katipunan', amount: 250, transaction_type: 'expense', account_id: 'a1', occurred_at: '2026-10-30T04:00:00Z' },
  { id: '2', merchant: 'Salary', amount: 50000, transaction_type: 'income', account_id: 'a2', occurred_at: '2026-10-15T01:00:00Z' },
];

test('spots the same purchase logged again from another source', () => {
  expect(findDuplicate({ merchant: 'JOLLIBEE', amount: 250, type: 'expense', date: '2026-10-30T09:30:00Z' }, records)?.id).toBe('1');
  expect(findDuplicate({ merchant: 'Jollibee', amount: '250.00', type: 'expense', date: '2026-10-29T12:00:00Z', account_id: 'a1' }, records)?.id).toBe('1');
});

test('does not flag different purchases', () => {
  expect(findDuplicate({ merchant: 'Jollibee', amount: 251, type: 'expense', date: '2026-10-30T09:30:00Z' }, records)).toBeNull();
  expect(findDuplicate({ merchant: 'Jollibee', amount: 250, type: 'expense', date: '2026-11-02T09:30:00Z' }, records)).toBeNull();
  expect(findDuplicate({ merchant: 'Grab', amount: 250, type: 'expense', date: '2026-10-30T09:30:00Z' }, records)).toBeNull();
  expect(findDuplicate({ merchant: 'Jollibee', amount: 250, type: 'expense', date: '2026-10-30T09:30:00Z', account_id: 'a9' }, records)).toBeNull();
  expect(findDuplicate({ merchant: 'Salary', amount: 50000, type: 'expense', date: '2026-10-15T01:00:00Z' }, records)).toBeNull();
});

test('merchant matching tolerates case, punctuation and extra words', () => {
  expect(sameMerchant('7-Eleven Store #123', '7 eleven')).toBe(true);
  expect(sameMerchant('Netflix', 'Spotify')).toBe(false);
});
