import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import SubscriptionLinks, { STORE_MANAGE_URLS } from './SubscriptionLinks';
import { getStoreEntitlements, isNativePurchasePlatform, manageStoreSubscriptions, restoreStorePurchases } from '../lib/nativePurchases';

jest.mock('../lib/nativePurchases', () => ({ getStoreEntitlements: jest.fn(), isNativePurchasePlatform: jest.fn(), manageStoreSubscriptions: jest.fn(), restoreStorePurchases: jest.fn() }));
global.IS_REACT_ACT_ENVIRONMENT = true;

const session = { access_token: 'token' };
const future = new Date(Date.now() + 86400000).toISOString();
const render = async (props) => {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => root.render(<div className="movo-app"><SubscriptionLinks {...props} /></div>));
  return { el, cleanup: () => { act(() => root.unmount()); el.remove(); } };
};
const button = (el, text) => Array.from(el.querySelectorAll('button')).find(b => b.textContent === text);

beforeEach(() => {
  isNativePurchasePlatform.mockReturnValue(false);
  getStoreEntitlements.mockResolvedValue({ entitlements: [] });
  manageStoreSubscriptions.mockResolvedValue(undefined);
  restoreStorePurchases.mockResolvedValue({ restoredCount: 1, entitlement: { entitlements: [{ status: 'active', expiresAt: future }] } });
});

test('both buttons are always there and enabled, even signed out on the website; Restore asks to sign in', async () => {
  const onSignIn = jest.fn();
  const { el, cleanup } = await render({ session: null, onSignIn });
  const restore = button(el, 'Restore purchases'); const manage = button(el, 'Manage subscription');
  expect(restore.disabled).toBe(false);
  expect(manage.disabled).toBe(false);
  await act(async () => restore.click());
  expect(onSignIn).toHaveBeenCalled();
  expect(getStoreEntitlements).not.toHaveBeenCalled();
  cleanup();
});

test('website: Restore re-checks the verified plan; Manage offers the App Store and Google Play pages', async () => {
  const onRefresh = jest.fn();
  const { el, cleanup } = await render({ session, onRefresh });
  await act(async () => button(el, 'Restore purchases').click());
  expect(getStoreEntitlements).toHaveBeenCalledWith(session);
  expect(onRefresh).toHaveBeenCalledWith({ entitlements: [] });
  expect(el.querySelector('[role="status"]').textContent).toContain('No active MOVO subscription was found for this account.');
  await act(async () => button(el, 'Manage subscription').click());
  const links = Array.from(el.querySelectorAll('.subscription-links-stores a'));
  expect(links.map(a => a.getAttribute('href'))).toEqual([STORE_MANAGE_URLS.apple, STORE_MANAGE_URLS.google]);
  links.forEach(a => { expect(a.getAttribute('target')).toBe('_blank'); expect(a.getAttribute('rel')).toBe('noopener noreferrer'); });
  expect(STORE_MANAGE_URLS.apple).toBe('https://apps.apple.com/account/subscriptions');
  expect(STORE_MANAGE_URLS.google).toBe('https://play.google.com/store/account/subscriptions?package=com.nasrinai.movo');
  expect(manageStoreSubscriptions).not.toHaveBeenCalled();
  cleanup();
});

test('in the app: Restore uses the store restore and Manage opens the store subscription page', async () => {
  isNativePurchasePlatform.mockReturnValue(true);
  const onRefresh = jest.fn();
  const { el, cleanup } = await render({ session, onRefresh });
  await act(async () => button(el, 'Restore purchases').click());
  expect(restoreStorePurchases).toHaveBeenCalledWith(session);
  expect(onRefresh).toHaveBeenCalled();
  expect(el.querySelector('[role="status"]').textContent).toBe('Your purchases were restored and verified.');
  await act(async () => button(el, 'Manage subscription').click());
  expect(manageStoreSubscriptions).toHaveBeenCalledTimes(1);
  expect(el.querySelector('.subscription-links-stores')).toBeNull();
  cleanup();
});

test('a failed restore says so and leaves both buttons usable', async () => {
  isNativePurchasePlatform.mockReturnValue(true);
  restoreStorePurchases.mockRejectedValueOnce(new Error('Store unavailable.'));
  const { el, cleanup } = await render({ session });
  await act(async () => button(el, 'Restore purchases').click());
  expect(el.querySelector('[role="status"]').textContent).toBe('Store unavailable.');
  expect(button(el, 'Restore purchases').disabled).toBe(false);
  cleanup();
});
