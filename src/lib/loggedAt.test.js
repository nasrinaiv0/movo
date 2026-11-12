import { deviceDay, loggedAt } from './loggedAt';

const now = new Date(2026, 10, 10, 12, 41, 7); // Nov 10, 2026, 12:41:07 PM on this device

test('logging today records the exact device time', () => {
  expect(loggedAt(undefined, now)).toBe(now.toISOString());
  expect(loggedAt('', now)).toBe(now.toISOString());
  expect(loggedAt(deviceDay(now), now)).toBe(now.toISOString());
});

test('a chosen past day keeps that local day at noon, never the previous or next day', () => {
  const at = new Date(loggedAt('2026-11-03', now));
  expect(at.toLocaleDateString('en-CA')).toBe('2026-11-03');
  expect(at.getHours()).toBe(12);
});

test('an invalid day falls back to now', () => {
  expect(loggedAt('11/03/2026', now)).toBe(now.toISOString());
});
