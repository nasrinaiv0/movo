export const PLAN_LABELS = { free: 'Free', pro: 'Pro', pro_plus: 'Pro+' };
export const PRO_FEATURES = ['premiumStickers', 'portraitCards', 'cardAnimations', 'insights', 'customMoneyFlow', 'styleUploads', 'fullAI', 'receiptScan', 'cloudWrite', 'advancedWidgets'];
export const PLUS_FEATURES = ['automation', 'premiumMascots', 'premiumUI'];

// An expired or unknown entitlement never unlocks a feature. This is a UI mirror;
// database policies and API checks enforce remote access independently.
export function effectivePlan(entitlement, now = Date.now()) {
  if (!entitlement?.active || !(Date.parse(entitlement.expiresAt) > now)) return 'free';
  return Object.hasOwn(PLAN_LABELS, entitlement.tier) ? entitlement.tier : 'free';
}
export function canUseFeature(entitlement, feature, now = Date.now()) {
  const plan = effectivePlan(entitlement, now);
  if (PLUS_FEATURES.includes(feature)) return plan === 'pro_plus';
  if (PRO_FEATURES.includes(feature)) return plan === 'pro' || plan === 'pro_plus';
  return false;
}
