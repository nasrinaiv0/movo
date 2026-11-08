import { canUseFeature, effectivePlan, PRO_FEATURES, PLUS_FEATURES, effectiveAccessPlan, canUseFeatureInMode } from './planAccess';

const now = Date.parse('2026-11-07T00:00:00Z');
const entitlement = tier => ({ tier, active:true, expiresAt:'2026-12-07T00:00:00Z' });
test.each([null, {}, { tier:'pro_plus', active:true }, { ...entitlement('pro'), active:false }, { ...entitlement('pro_plus'), expiresAt:'2026-11-06' }, entitlement('ultra')])('unknown or expired entitlement fails closed: %p', value => {
  expect(effectivePlan(value,now)).toBe('free');
  for(const feature of [...PRO_FEATURES,...PLUS_FEATURES]) expect(canUseFeature(value,feature,now)).toBe(false);
});
test.each(PRO_FEATURES)('Pro and Pro+ unlock %s', feature => {
  expect(canUseFeature(entitlement('pro'),feature,now)).toBe(true);
  expect(canUseFeature(entitlement('pro_plus'),feature,now)).toBe(true);
});
test.each(PLUS_FEATURES)('%s requires Pro+', feature => {
  expect(canUseFeature(entitlement('pro'),feature,now)).toBe(false);
  expect(canUseFeature(entitlement('pro_plus'),feature,now)).toBe(true);
});
test('unknown features and exact expiry fail closed', () => {
  expect(canUseFeature(entitlement('pro_plus'),'admin',now)).toBe(false);
  expect(effectivePlan(entitlement('pro'),Date.parse('2026-12-07T00:00:00Z'))).toBe('free');
});


describe('local-mode paid access suspension without subscription cancellation', () => {
  const paid = entitlement('pro_plus');
  test('a verified plan remains on record but has no active paid access while local-only', () => {
    expect(effectivePlan(paid, now)).toBe('pro_plus');
    expect(effectiveAccessPlan(paid, false, now)).toBe('free');
    for (const feature of [...PRO_FEATURES, ...PLUS_FEATURES]) {
      expect(canUseFeatureInMode(paid, feature, false, now)).toBe(false);
    }
    expect(paid.active).toBe(true);
    expect(paid.tier).toBe('pro_plus');
  });
  test('turning cloud back on restores only verified unexpired access', () => {
    expect(effectiveAccessPlan(paid, true, now)).toBe('pro_plus');
    expect(canUseFeatureInMode(paid, 'automation', true, now)).toBe(true);
    expect(canUseFeatureInMode(paid, 'cloudWrite', true, now)).toBe(true);
    expect(effectiveAccessPlan(paid, true, Date.parse('2026-12-07T00:00:00Z'))).toBe('free');
    expect(canUseFeatureInMode(null, 'cloudWrite', true, now)).toBe(false);
  });
  test('unknown and omitted mode never unlock paid access', () => {
    expect(effectiveAccessPlan(paid, undefined, now)).toBe('free');
    expect(canUseFeatureInMode(paid, 'automation', 'local', now)).toBe(false);
  });
});
