import { can, normalizePlan, requiredPlan, FEATURES, FEATURE_LABEL, planErrorMessage, planAwareError, REFERRAL_CODE } from './plans';

test('Free, Pro and Pro+ unlock the owner-listed features; anything unknown stays free', () => {
  const free = ['cloud', 'portraitCards', 'cardAnimations', 'insights', 'customRange', 'uploads', 'premiumStyles', 'nasrinaiFull', 'receiptScan', 'automation', 'premiumLook'];
  free.forEach(f => expect(can('free', f)).toBe(false));
  ['cloud', 'portraitCards', 'cardAnimations', 'insights', 'customRange', 'uploads', 'premiumStyles', 'nasrinaiFull', 'receiptScan'].forEach(f => expect(can('pro', f)).toBe(true));
  // Pro+ only: automation and the premium look.
  expect(can('pro', 'automation')).toBe(false);
  expect(can('pro', 'premiumLook')).toBe(false);
  free.forEach(f => expect(can('pro_plus', f)).toBe(true));
  expect(can('free', 'exportData')).toBe(true);
  expect(requiredPlan('automation')).toBe('pro_plus');
  Object.keys(FEATURES).forEach(f => expect(FEATURE_LABEL[f]).toBeTruthy());
});

test('unknown plan values are Free; before the plans migration a signed-in person keeps everything', () => {
  expect(normalizePlan('enterprise')).toBe('free');
  expect(normalizePlan(undefined)).toBe('free');
  expect(can('legacy', 'automation')).toBe(true);
  expect(can('admin', 'cloud')).toBe(false);
});

test('server errors become readable messages; a refused cloud write keeps its code', () => {
  expect(planErrorMessage({ message: 'trial_device_used' })).toBe('The free month was already claimed on this device.');
  expect(planErrorMessage({ message: 'referral_self' })).toBe('You cannot use your own referral code.');
  expect(planErrorMessage(new Error('boom'))).toBe('Something went wrong. Please try again.');
  const e = planAwareError({ code: '42501', message: 'plan_required' });
  expect(e.code).toBe('plan_required');
  expect(e.message).toMatch(/view, export and delete/);
  const other = { code: '23505', message: 'duplicate' };
  expect(planAwareError(other)).toBe(other);
});

test('referral codes match the server alphabet (no 0, O, 1 or I)', () => {
  expect(REFERRAL_CODE.test('ABCD2345')).toBe(true);
  expect(REFERRAL_CODE.test('ABCD0123')).toBe(false);
  expect(REFERRAL_CODE.test('abcd2345')).toBe(false);
});
