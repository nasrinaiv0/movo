import { APP_ICONS, appIconById, appIconUnlocked, appIconLockReason } from './appIcons';

const icon = id => appIconById(id);
const noStreak = { count: 0, best: 0 };

test('every badge tier has an icon backed by a compiled iOS alternate icon', () => {
  expect(APP_ICONS.map(i => i.id)).toEqual(['default', 'bronze', 'silver', 'gold', 'platinum']);
  expect(APP_ICONS.filter(i => i.native).map(i => i.native)).toEqual(['AppIcon-Bronze', 'AppIcon-Silver', 'AppIcon-Gold', 'AppIcon-Platinum']);
  expect(appIconById('nope').id).toBe('default');
});

test('without a plan only the standard icon is available, even with a long streak', () => {
  expect(appIconUnlocked(icon('default'), noStreak, 'free')).toBe(true);
  expect(appIconUnlocked(icon('bronze'), { count: 400, best: 400 }, 'free')).toBe(false);
  expect(appIconLockReason(icon('gold'), noStreak, 'free')).toEqual({ kind: 'plan' });
});

test('Pro unlocks Bronze to Gold right after payment; Platinum needs Pro+ or the 365-day badge', () => {
  ['bronze', 'silver', 'gold'].forEach(id => expect(appIconUnlocked(icon(id), noStreak, 'pro')).toBe(true));
  expect(appIconUnlocked(icon('platinum'), noStreak, 'pro')).toBe(false);
  expect(appIconLockReason(icon('platinum'), noStreak, 'pro')).toEqual({ kind: 'days', days: 365 });
  expect(appIconUnlocked(icon('platinum'), { count: 1, best: 365 }, 'pro')).toBe(true);
  ['bronze', 'silver', 'gold', 'platinum'].forEach(id => expect(appIconUnlocked(icon(id), noStreak, 'pro_plus')).toBe(true));
});
