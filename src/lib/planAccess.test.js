import { canUseFeature, effectivePlan, PRO_FEATURES, PLUS_FEATURES } from './planAccess';

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
