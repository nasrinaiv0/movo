import { rawLedgerTimestamp, sharedLedgerDisplayDate, sharedLedgerEditedTimestamp } from './sharedLedgerDate';
import { buildCsv } from './csvExport';
import { parseCsvTransactions } from './csvImport';
test('shared calendar label is invariant, raw ledger stays untouched', () => {
  const row = { id:'synthetic', external_reference:'movo-friend:synthetic', occurred_at:'2026-11-30T12:00:00+00:00', amount:42.25 };
  expect(sharedLedgerDisplayDate(row)).toBe('2026-11-30T12:00:00');
  expect(row.occurred_at).toBe('2026-11-30T12:00:00+00:00');
  expect(sharedLedgerDisplayDate({...row,external_reference:'other'})).toBe(row.occurred_at);
  expect(sharedLedgerDisplayDate({...row,occurred_at:'2026-11-30T13:00:00Z'})).toBe('2026-11-30T13:00:00Z');
});

test('raw CSV round trip keeps the exact canonical timestamp, not the local display label', () => {
  const row = { id:'synthetic', external_reference:'movo-friend:synthetic', occurred_at:'2026-11-30T12:00:00Z', date:'2026-11-30T12:00:00' };
  const csv = buildCsv([['Date','Description','Type','Amount','Currency','Account'],[rawLedgerTimestamp(row),'Synthetic lunch','expense',42.25,'PHP','Bank']]);
  expect(csv).toContain('2026-11-30T12:00:00Z');
  const parsed = parseCsvTransactions(csv);
  expect(parsed.rows[0].occurred_at).toBe('2026-11-30T12:00:00.000Z');
});
test('date-only edits retain canonical UTC noon without affecting ordinary or explicit clock edits', () => {
  const row = { id:'synthetic', external_reference:'movo-friend:synthetic', occurred_at:'2026-11-30T12:00:00Z' };
  const localInstant = '2026-11-29T22:00:00.000Z';
  expect(sharedLedgerEditedTimestamp(row,'2026-11-30','12:00:00',localInstant)).toBe('2026-11-30T12:00:00.000Z');
  expect(sharedLedgerEditedTimestamp(row,'2026-12-01','12:00:00',localInstant)).toBe('2026-12-01T12:00:00.000Z');
  expect(sharedLedgerEditedTimestamp(row,'2026-11-30','13:00:00',localInstant)).toBe(localInstant);
  expect(sharedLedgerEditedTimestamp({...row,external_reference:'other'},'2026-11-30','12:00:00',localInstant)).toBe(localInstant);
});
