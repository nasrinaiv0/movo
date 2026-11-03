import { ARCHIVE_LIMIT, addToArchive, archiveEntry, daysLeft, isExpired, purgeArchive, removeFromArchive } from './archive';

const DAY = 86400000;
const t0 = new Date('2026-11-03T08:00:00Z');
const at = (days) => new Date(t0.getTime() + days * DAY);

test('archiveEntry keys the entry by kind and item id', () => {
  const e = archiveEntry('transaction', { id: 'tx1', amount: 250 }, t0);
  expect(e).toEqual({ id: 'transaction:tx1', kind: 'transaction', archivedAt: t0.toISOString(), item: { id: 'tx1', amount: 250 } });
  expect(() => archiveEntry('nope', { id: 1 })).toThrow();
  expect(() => archiveEntry('plan', {})).toThrow();
});

test('entries last 90 days', () => {
  const iso = t0.toISOString();
  expect(daysLeft(iso, t0)).toBe(90);
  expect(daysLeft(iso, at(89.5))).toBe(0);
  expect(daysLeft(iso, at(120))).toBe(0);
  expect(isExpired(iso, at(89.9))).toBe(false);
  expect(isExpired(iso, at(90))).toBe(true);
  expect(isExpired('not a date', t0)).toBe(true);
});

test('purgeArchive drops expired and malformed entries, newest first, capped', () => {
  const old = archiveEntry('plan', { id: 'p' }, at(-91));
  const a = archiveEntry('budget', { id: 'b' }, at(-1));
  const b = archiveEntry('subscription', { id: 's' }, t0);
  expect(purgeArchive([old, a, null, { id: 'x', kind: 'plan' }, b], t0).map(e => e.id)).toEqual(['subscription:s', 'budget:b']);
  const many = Array.from({ length: ARCHIVE_LIMIT + 20 }, (_, i) => archiveEntry('transaction', { id: i }, at(-i / 1000)));
  expect(purgeArchive(many, t0)).toHaveLength(ARCHIVE_LIMIT);
  expect(purgeArchive(undefined)).toEqual([]);
});

test('addToArchive replaces an entry with the same id; removeFromArchive drops it', () => {
  const first = archiveEntry('transaction', { id: 't', amount: 1 }, at(-2));
  const again = archiveEntry('transaction', { id: 't', amount: 2 }, t0);
  const list = addToArchive([first], again, t0);
  expect(list).toHaveLength(1);
  expect(list[0].item.amount).toBe(2);
  expect(removeFromArchive(list, 'transaction:t')).toEqual([]);
});
