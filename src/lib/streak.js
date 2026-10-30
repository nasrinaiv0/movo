/*
 * Usage streak: consecutive days on which the person opened Movo. Badges unlock at milestones and stay earned
 * (best streak), even after a streak resets. Stored in preferences, so it follows a signed-in person across devices.
 */
export const BADGES = [
  { days: 3, id: 'b3', name: 'Getting started', icon: 'spark', color: '#c98a4b' },
  { days: 7, id: 'b7', name: 'One-week streak', icon: 'star', color: '#8e99a8' },
  { days: 14, id: 'b14', name: 'Two-week habit', icon: 'target', color: '#d9a21b' },
  { days: 30, id: 'b30', name: 'Monthly regular', icon: 'coin', color: '#10a866' },
  { days: 60, id: 'b60', name: 'Steady tracker', icon: 'shield', color: '#2f6bff' },
  { days: 100, id: 'b100', name: '100-day streak', icon: 'diamond', color: '#8b5cf6' },
  { days: 365, id: 'b365', name: 'A year with Movo', icon: 'gift', color: '#e5484d' },
];

const prevDay = (key) => { const d = new Date(`${key}T12:00:00`); d.setDate(d.getDate() - 1); return d.toLocaleDateString('en-CA'); };
const valid = (s) => s && typeof s === 'object' && /^\d{4}-\d{2}-\d{2}$/.test(s.last || '') && Number.isFinite(s.count) && s.count > 0;

/** Counts today; returns the same object when today was already counted. */
export function updateStreak(streak, todayKey) {
  if (valid(streak) && streak.last === todayKey) return streak;
  const count = valid(streak) && streak.last === prevDay(todayKey) ? streak.count + 1 : 1;
  return { last: todayKey, count, best: Math.max(count, Number(streak?.best) || 0) };
}

export const earnedBadges = (streak) => BADGES.filter(b => (Number(streak?.best) || 0) >= b.days);
export const nextBadge = (streak) => BADGES.find(b => (Number(streak?.count) || 0) < b.days) || null;
/** The badge unlocked by moving from `before` to `after`, if any. */
export const newlyEarned = (before, after) => BADGES.filter(b => (Number(before?.best) || 0) < b.days && (Number(after?.best) || 0) >= b.days).pop() || null;

/** Two devices' streaks: the more recent day wins; the best streak is the higher of the two. */
export function mergeStreak(local, cloud) {
  const a = valid(local) ? local : null; const b = valid(cloud) ? cloud : null;
  if (!a || !b) return a || b || null;
  const pick = a.last > b.last ? a : b.last > a.last ? b : (a.count >= b.count ? a : b);
  return { ...pick, best: Math.max(Number(a.best) || 0, Number(b.best) || 0, pick.count) };
}
