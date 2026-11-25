// Shared cards have a calendar date, not an instant. Keep the raw UTC
// timestamp unchanged and project ONLY canonical shared-date records for display.
export function rawLedgerTimestamp(row) {
  return row?.occurred_at || row?.date;
}
export function sharedCalendarDate(row) {
  const value = rawLedgerTimestamp(row);
  if (!row?.id || row.external_reference !== 'movo-friend:' + row.id || typeof value !== 'string') return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  const iso = parsed.toISOString();
  return iso.endsWith('T12:00:00.000Z') ? iso.slice(0, 10) : null;
}
export function sharedLedgerDisplayDate(row) {
  const date = sharedCalendarDate(row);
  return date ? date + 'T12:00:00' : rawLedgerTimestamp(row);
}
// The edit form presents local wall-calendar noon for date-only shared records.
// Preserve that date-only meaning when the clock is unchanged; an explicit
// clock edit uses the normal local instant conversion. Never change the receipt.
export function sharedLedgerEditedTimestamp(row, date, clock, normalTimestamp) {
  if (!sharedCalendarDate(row) || clock !== '12:00:00' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return normalTimestamp;
  const canonical = new Date(date + 'T12:00:00Z');
  return Number.isFinite(canonical.getTime()) && canonical.toISOString().slice(0,10) === date
    ? canonical.toISOString() : normalTimestamp;
}
