import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { UsageSheet } from './Settings';

jest.mock('../lib/nativePurchases', () => ({
  isNativePurchasePlatform: () => false,
  getStoreEntitlements: () => new Promise(() => {}), // the background re-check never finishes during the test
  syncStorePurchases: () => new Promise(() => {}),
  getStoreProducts: () => Promise.resolve([]),
  purchaseStoreProduct: jest.fn(), restoreStorePurchases: jest.fn(), manageStoreSubscriptions: jest.fn(),
}));

global.IS_REACT_ACT_ENVIRONMENT = true;
let host, root;
beforeEach(() => { host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });

const base = { cloudMode: true, txs: new Array(76).fill({}), accountsView: new Array(10).fill({}), subscriptions: new Array(5).fill({}), openPlans: jest.fn() };
const open = (c) => act(() => root.render(<UsageSheet c={{ ...base, ...c }} onClose={() => {}} />));
const text = () => document.body.textContent;

test('a Pro+ customer sees Pro+ at once, while the background re-check is still running', () => {
  open({ session: { access_token: 't' }, entitlementReady: true, entitlement: { active: true, tier: 'pro_plus', expiresAt: '2027-11-09T00:00:00Z', source: 'store' } });
  expect(document.querySelector('.plan-usage-current').className).toContain('tier-pro_plus');
  expect(text()).toContain('Pro+');
  expect(text()).not.toMatch(/\bFree\b/);
  expect(text()).toContain('View plans');
  expect(text()).not.toContain('Upgrade MOVO');
  expect([...document.querySelectorAll('.plan-usage-stats strong')].map(n => n.textContent).slice(0, 3)).toEqual(['76', '10', '5']);
});

test('a plan not yet checked is never shown as Free', () => {
  open({ session: { access_token: 't' }, entitlementReady: false, entitlement: null });
  expect(document.querySelector('.plan-usage-current').className).toContain('tier-checking');
  expect(text()).toContain('Checking…');
  expect(text()).not.toMatch(/\bFree\b/);
  expect(text()).not.toContain('Upgrade MOVO');
});

test('signed out: Free with Upgrade', () => {
  open({ session: null, entitlementReady: false, entitlement: null });
  expect(text()).toContain('Free');
  expect(text()).toContain('Upgrade MOVO');
});

test('Restore purchases and Manage subscription are always there, on the website and signed out (owner, 2026-11-12)', () => {
  const startAccount = jest.fn();
  open({ session: null, entitlementReady: false, entitlement: null, startAccount });
  const buttons = [...document.querySelectorAll('.subscription-links button')];
  expect(buttons.map(b => [b.textContent, b.disabled])).toEqual([['Restore purchases', false], ['Manage subscription', false]]);
  act(() => buttons[0].click());
  expect(startAccount).toHaveBeenCalledWith('signin');
});

test('a Pro+ customer from the store also has both buttons', () => {
  open({ session: { access_token: 't' }, entitlementReady: true, entitlement: { active: true, tier: 'pro_plus', expiresAt: '2027-11-09T00:00:00Z', source: 'store' } });
  expect([...document.querySelectorAll('.subscription-links button')].map(b => b.textContent)).toEqual(['Restore purchases', 'Manage subscription']);
});
