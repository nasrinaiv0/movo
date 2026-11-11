/*
 * The moment a payment is logged, in the device's own region (owner, 2026-11-11).
 *
 * Logging something "now" records the device's current date and time; JavaScript Dates already follow the phone's
 * time zone, and the ISO string carries that instant exactly, so it shows as the same local time everywhere in MOVO.
 * A different day chosen on purpose (a back-dated card payment) keeps that day, at noon local time, so it can never
 * slip to the day before or after in another time zone.
 */
export function deviceDay(now = new Date()) {
  return now.toLocaleDateString('en-CA');
}

export function loggedAt(day, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(day || '')) || day === deviceDay(now)) return now.toISOString();
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0).toISOString();
}
