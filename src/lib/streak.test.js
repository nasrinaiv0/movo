import { updateStreak, earnedBadges, nextBadge, newlyEarned, mergeStreak } from './streak';

test('counts consecutive days and resets after a missed day', () => {
  let s = updateStreak(null, '2026-10-28');
  expect(s).toEqual({ last: '2026-10-28', count: 1, best: 1 });
  s = updateStreak(s, '2026-10-29'); s = updateStreak(s, '2026-10-30');
  expect(s.count).toBe(3);
  expect(updateStreak(s, '2026-10-30')).toBe(s);
  const after = updateStreak(s, '2026-11-02');
  expect(after).toEqual({ last: '2026-11-02', count: 1, best: 3 });
});

test('handles month boundaries', () => {
  expect(updateStreak({ last: '2026-10-31', count: 6, best: 6 }, '2026-11-01').count).toBe(7);
});

test('badges stay earned from the best streak and the next one is shown', () => {
  expect(earnedBadges({ count: 1, best: 8 }).map(b => b.days)).toEqual([3, 7]);
  expect(nextBadge({ count: 5 }).days).toBe(7);
  expect(newlyEarned({ best: 6 }, { best: 7 }).days).toBe(7);
  expect(newlyEarned({ best: 7 }, { best: 8 })).toBeNull();
});

test('merging keeps the latest day and the higher best', () => {
  expect(mergeStreak({ last: '2026-10-30', count: 2, best: 9 }, { last: '2026-10-29', count: 5, best: 5 })).toEqual({ last: '2026-10-30', count: 2, best: 9 });
  expect(mergeStreak(null, { last: '2026-10-29', count: 5, best: 5 })).toEqual({ last: '2026-10-29', count: 5, best: 5 });
  expect(mergeStreak({ last: 'x' }, null)).toBeNull();
});
