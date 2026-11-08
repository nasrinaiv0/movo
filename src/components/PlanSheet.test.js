import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import PlanSheet from './PlanSheet';

global.IS_REACT_ACT_ENVIRONMENT = true;
const mount = (props) => {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  act(() => root.render(<PlanSheet onClose={() => {}} {...props} />));
  return { el, root };
};
const button = (el, label) => [...el.querySelectorAll('button')].find(b => b.textContent.includes(label));

test('signed out: the free month asks to sign in first; no referral section', () => {
  const onSignIn = jest.fn();
  const { el, root } = mount({ membership: { plan: 'free' }, signedIn: false, onSignIn, welcome: true });
  expect(el.textContent).toContain('Claim your free month of Pro');
  act(() => button(el, 'Sign in to claim').click());
  expect(onSignIn).toHaveBeenCalled();
  expect(el.textContent).not.toContain('Invite friends');
  expect(el.textContent).toContain('Maybe later');
  act(() => root.unmount());
});

test('signed in on Free: claiming calls the server; a refusal shows its reason', async () => {
  const onClaim = jest.fn().mockRejectedValueOnce({ message: 'trial_device_used' });
  const { el, root } = mount({ membership: { plan: 'free', trial_available: true, referral_code: 'ABCD2345', referrals_subscribed: 3, referral_goal: 10 }, signedIn: true, onClaim, feature: 'automation' });
  expect(el.textContent).toContain('Automatic logging from Apple Pay, bank notifications and Siri is part of Pro+.');
  await act(async () => { button(el, 'Claim free month').click(); });
  expect(onClaim).toHaveBeenCalledTimes(1);
  expect(el.querySelector('[role="alert"]').textContent).toBe('The free month was already claimed on this device.');
  expect(el.textContent).toContain('ABCD2345');
  expect(el.textContent).toContain('3 of 10 subscribed');
  expect(el.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('3');
  act(() => root.unmount());
});

test('a referral code is checked before it is sent; Pro shows its end date and no trial', async () => {
  const onApplyReferral = jest.fn().mockResolvedValue({});
  const { el, root } = mount({ membership: { plan: 'pro', ends_at: '2026-12-03T00:00:00Z', trial_available: false, referral_code: 'ZZZZ2222', referred_by: false }, signedIn: true, onApplyReferral });
  expect(el.textContent).not.toContain('Claim your free month of Pro');
  expect(el.querySelector('.plan-pro').className).toContain('is-current');
  const input = el.querySelector('#plan-referral-code');
  const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  act(() => { setValue.call(input, 'abcd0000'); input.dispatchEvent(new Event('input', { bubbles: true })); });
  await act(async () => { el.querySelector('form.plan-redeem').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  expect(onApplyReferral).not.toHaveBeenCalled();
  expect(el.querySelector('[role="alert"]').textContent).toMatch(/not found/);
  act(() => { setValue.call(input, 'abcd2345'); input.dispatchEvent(new Event('input', { bubbles: true })); });
  await act(async () => { el.querySelector('form.plan-redeem').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  expect(onApplyReferral).toHaveBeenCalledWith('ABCD2345');
  act(() => root.unmount());
});
