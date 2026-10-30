import { isMissingTable } from './financeRepository';

test('a missing optional table counts as nothing to delete, other errors do not', () => {
  expect(isMissingTable({ code: 'PGRST205' })).toBe(true);
  expect(isMissingTable({ code: '42P01' })).toBe(true);
  expect(isMissingTable({ code: '42501' })).toBe(false);
  expect(isMissingTable(null)).toBe(false);
});
