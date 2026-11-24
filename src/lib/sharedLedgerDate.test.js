import { sharedLedgerDisplayDate } from './sharedLedgerDate';
test('shared calendar label is invariant, raw ledger stays untouched', () => {
  const row = { id:'synthetic', external_reference:'movo-friend:synthetic', occurred_at:'2026-11-30T12:00:00+00:00', amount:42.25 };
  expect(sharedLedgerDisplayDate(row)).toBe('2026-11-30T12:00:00');
  expect(row.occurred_at).toBe('2026-11-30T12:00:00+00:00');
  expect(sharedLedgerDisplayDate({...row,external_reference:'other'})).toBe(row.occurred_at);
  expect(sharedLedgerDisplayDate({...row,occurred_at:'2026-11-30T13:00:00Z'})).toBe('2026-11-30T13:00:00Z');
});
