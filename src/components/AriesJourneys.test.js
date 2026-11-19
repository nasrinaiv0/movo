import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AuthPanel from './AuthPanel';
import PlanOffer, { PlanComparison } from './PlanOffer';
import { sendEmailCode } from '../lib/financeRepository';
import { getStoreProducts, isNativePurchasePlatform, purchaseStoreProduct } from '../lib/nativePurchases';

jest.mock('../lib/supabaseClient', () => ({ supabaseConfigured: true }));
jest.mock('../lib/financeRepository', () => ({
  sendEmailCode: jest.fn(), verifyEmailCode: jest.fn(), signInWithApple: jest.fn(), signInWithGoogle: jest.fn(),
}));
jest.mock('../lib/nativePurchases', () => ({
  getStoreProducts: jest.fn(), isNativePurchasePlatform: jest.fn(), purchaseStoreProduct: jest.fn(),
}));
global.IS_REACT_ACT_ENVIRONMENT = true;

let host; let root;
beforeEach(() => {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  jest.clearAllMocks(); window.localStorage.clear();
  isNativePurchasePlatform.mockReturnValue(false); getStoreProducts.mockResolvedValue([]);
});
afterEach(() => { act(() => root.unmount()); host.remove(); });
const setValue = (input, value) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
});
const submit = () => act(() => { host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
const hasMood = (scope, mood) => !!host.querySelector(`${scope} .aries--${mood}, ${scope}.aries--${mood}`);

test('sign-in Aries walks on welcome and follows pending, code and validation states without bypassing consent', async () => {
  let sent;
  sendEmailCode.mockImplementation(() => new Promise(resolve => { sent = resolve; }));
  act(() => root.render(<AuthPanel />));
  expect(hasMood('.auth-aries', 'welcome')).toBe(true);
  expect(host.querySelector('.auth-head .movo-mark')).not.toBeNull();
  expect(host.querySelector('.auth-aries .aries--walking, .auth-aries.aries--walking')).not.toBeNull();
  submit();
  expect(hasMood('.auth-aries', 'reminder')).toBe(true);
  expect(sendEmailCode).not.toHaveBeenCalled();
  act(() => host.querySelector('input[type="checkbox"]').click());
  setValue(host.querySelector('input[type="email"]'), 'aries@example.com');
  submit();
  expect(hasMood('.auth-aries', 'thinking')).toBe(true);
  expect(host.querySelector('.auth-submit').disabled).toBe(true);
  await act(async () => sent({}));
  expect(hasMood('.auth-aries', 'focused')).toBe(true);
  expect(host.querySelector('input[autocomplete="one-time-code"]')).not.toBeNull();
  submit();
  expect(hasMood('.auth-aries', 'reminder')).toBe(true);
  expect(host.textContent).toContain('Enter the code from your email.');
});

test('plan selection changes Aries for every tier while the website keeps real price availability and current-plan controls', async () => {
  await act(async () => root.render(<PlanOffer entitlement={{ tier: 'free', trialEligible: false }} onClose={jest.fn()} />));
  expect(hasMood('.plan-aries', 'cheering')).toBe(true);
  const tiles = host.querySelectorAll('.plan-tile');
  act(() => tiles[0].click());
  expect(hasMood('.plan-aries', 'welcome')).toBe(true);
  expect(host.querySelector('.plan-cta').disabled).toBe(true);
  act(() => tiles[2].click());
  expect(hasMood('.plan-aries', 'celebrate')).toBe(true);
  expect(tiles[2].getAttribute('aria-checked')).toBe('true');
  expect(tiles[2].textContent).toContain('₱149.00/mo');
  expect(host.querySelector('.plan-price')).not.toBeNull();
  expect(host.querySelectorAll('.plan-tile .movo-mark')).toHaveLength(3);
});

test('a store purchase shows thinking Aries while pending and a reminder on failure without unlocking a plan', async () => {
  isNativePurchasePlatform.mockReturnValue(true);
  getStoreProducts.mockResolvedValue([{ productIdentifier: 'com.nasrinai.movo.proplus.monthly', priceString: '₱349.00', price: 349 }]);
  let fail;
  purchaseStoreProduct.mockImplementation(() => new Promise((resolve, reject) => { fail = reject; }));
  const onRefresh = jest.fn();
  await act(async () => root.render(<PlanOffer session={{ access_token: 'fixture-token' }} entitlement={{ tier: 'free', trialEligible: false }} onClose={jest.fn()} onRefresh={onRefresh} />));
  act(() => host.querySelectorAll('.plan-tile')[2].click());
  act(() => host.querySelector('.plan-cta').click());
  expect(hasMood('.plan-aries', 'thinking')).toBe(true);
  expect(host.querySelector('.plan-cta').disabled).toBe(true);
  await act(async () => fail(new Error('Purchase could not be verified.')));
  expect(hasMood('.plan-aries', 'reminder')).toBe(true);
  expect(host.querySelector('[role="alert"]').textContent).toContain('could not be verified');
  expect(onRefresh).not.toHaveBeenCalled();
  expect(host.querySelector('.plan-cta').disabled).toBe(false);
});

test('the comparison carousel companion also follows the selected plan', () => {
  act(() => root.render(<PlanComparison />));
  expect(hasMood('.plan-comparison-companion', 'welcome')).toBe(true);
  act(() => host.querySelectorAll('.plan-tabs button')[2].click());
  expect(hasMood('.plan-comparison-companion', 'celebrate')).toBe(true);
});
