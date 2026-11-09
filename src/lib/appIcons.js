import { BADGES, badgeEarned } from './streak';

/*
 * Home-screen app icons from MOVO badges (2026-11-09). A subscriber can switch the MOVO app icon to a badge icon
 * once that badge is unlocked: by keeping the streak for its days, or straight away through the plan (Pro unlocks
 * up to Gold, Pro+ every tier including Platinum; see streak.js badgeByPlan). Without a plan only the standard icon
 * is available. The native name is the iOS alternate icon set in ios/App/App/Assets.xcassets.
 */
export const APP_ICONS = [
  { id: 'default', name: 'MOVO', tone: 'color', bg: '#ffffff', native: null, tier: null },
  { id: 'bronze', name: 'Bronze', tone: 'bronze', bg: '#121213', native: 'AppIcon-Bronze', tier: 'standard' },
  { id: 'silver', name: 'Silver', tone: 'silver', bg: '#121213', native: 'AppIcon-Silver', tier: 'pro' },
  { id: 'gold', name: 'Gold', tone: 'gold', bg: '#121213', native: 'AppIcon-Gold', tier: 'max' },
  { id: 'platinum', name: 'Platinum', tone: 'platinum', bg: '#121213', native: 'AppIcon-Platinum', tier: 'ultra' },
];

export const appIconById = id => APP_ICONS.find(icon => icon.id === id) || APP_ICONS[0];
export const appIconsAvailable = plan => plan === 'pro' || plan === 'pro_plus';

/** First streak badge of the icon's tier (the one that unlocks it by days). */
export const appIconBadge = icon => BADGES.filter(badge => badge.tier === icon.tier).sort((a, b) => a.days - b.days)[0] || null;

/** Unlocked when the person has a plan and has earned any badge of that tier (by days or through the plan). */
export function appIconUnlocked(icon, streak, plan) {
  if (!icon?.tier) return true;
  if (!appIconsAvailable(plan)) return false;
  return BADGES.some(badge => badge.tier === icon.tier && badgeEarned(badge, streak, plan));
}

/** Why an icon is still locked, for the picker. */
export function appIconLockReason(icon, streak, plan) {
  if (appIconUnlocked(icon, streak, plan)) return null;
  if (!appIconsAvailable(plan)) return { kind: 'plan' };
  return { kind: 'days', days: appIconBadge(icon)?.days || 0 };
}
