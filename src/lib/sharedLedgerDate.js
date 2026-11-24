// Shared cards have a calendar date, not an instant. Keep the raw UTC
// timestamp unchanged and project ONLY canonical shared-date records for display.
export function sharedLedgerDisplayDate(row) {
  const value = row?.occurred_at || row?.date;
  if (!row?.id || row.external_reference !== 'movo-friend:' + row.id || typeof value !== 'string') return value;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return value;
  const iso = parsed.toISOString();
  if (!iso.endsWith('T12:00:00.000Z')) return value;
  return iso.slice(0, 10) + 'T12:00:00';
}
