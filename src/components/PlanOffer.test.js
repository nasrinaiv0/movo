import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import PlanOffer from './PlanOffer';
import { getStoreProducts, isNativePurchasePlatform, purchaseStoreProduct } from '../lib/nativePurchases';

jest.mock('../lib/nativePurchases', () => ({ getStoreProducts: jest.fn(), isNativePurchasePlatform: jest.fn(), purchaseStoreProduct: jest.fn() }));
global.IS_REACT_ACT_ENVIRONMENT = true;
const session = { access_token: 'token', user: { id: 'u1' } };
const future = '2099-01-01T00:00:00Z';

async function render(props) {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  const handlers = { onClose: jest.fn(), onSignIn: jest.fn(), onPlans: jest.fn(), onRefresh: jest.fn().mockResolvedValue(undefined), onOpenTerms: jest.fn() };
  await act(async () => root.render(<PlanOffer {...handlers} {...props} />));
  return { el, handlers, cleanup: () => { act(() => root.unmount()); el.remove(); } };
}
const fills = node => Array.from(node.querySelectorAll('svg.movo-mark path')).map(p => p.getAttribute('fill'));
const button = (el, text) => Array.from(el.querySelectorAll('button')).find(b => b.textContent.trim() === text);

beforeEach(() => { isNativePurchasePlatform.mockReturnValue(false); getStoreProducts.mockResolvedValue([]); });

test('one panel: MOVO header, Monthly/Annual, Free · Gold Pro · Platinum Pro+ tiles with their MOVO marks', async () => {
  const { el, cleanup } = await render({ session, entitlement: { tier: 'free', active: false, trialEligible: false } });
  expect(el.textContent).toContain('Upgrade MOVO');
  expect(button(el, 'Monthly').getAttribute('aria-pressed')).toBe('true');
  const tiles = Array.from(el.querySelectorAll('.plan-tile'));
  expect(tiles.map(t => t.querySelector('strong').textContent)).toEqual(['Free', 'Pro', 'Pro+']);
  expect(fills(tiles[0])).toContain('#10a866'); // green Free
  expect(fills(tiles[1])).toContain('#e3b04a'); // gold Pro
  expect(fills(tiles[2])).toContain('#dcd9ef'); // platinum Pro+
  expect(tiles[1].textContent).toContain('Gold MOVO');
  expect(tiles[2].textContent).toContain('Platinum MOVO');
  expect(tiles[1].getAttribute('aria-checked')).toBe('true');
  // On the web no price is invented.
  expect(el.textContent).toContain('Price shown by the App Store or Google Play');
  expect(el.textContent).not.toMatch(/₱\s?\d/);
  cleanup();
});

test('a first-time person gets the free month with the white MOVO mark and no automatic charge', async () => {
  const { el, cleanup } = await render({ session, entitlement: { tier: 'free', trialEligible: true } });
  expect(el.textContent).toContain('1 month free');
  expect(el.textContent).toContain('no automatic charge');
  expect(fills(el.querySelector('.plan-price'))).toContain('#e9e9ec'); // white mark
  expect(el.querySelector('.plan-cta').textContent).toBe('Start my free month');
  // The free month never renews, so the fine print must not say it does.
  expect(el.textContent).toContain('The free month ends on its own; nothing renews.');
  expect(el.textContent).not.toContain('Auto-renews');
  cleanup();
});

test('in the app, the store price drives the panel and Continue buys the selected plan and period', async () => {
  isNativePurchasePlatform.mockReturnValue(true);
  getStoreProducts.mockResolvedValue([
    { productIdentifier: 'com.nasrinai.movo.proplus.monthly', priceString: '₱349.00', price: 349 },
    { productIdentifier: 'com.nasrinai.movo.proplus.annual', priceString: '₱3,490.00', price: 3490 },
  ]);
  purchaseStoreProduct.mockResolvedValue({});
  const { el, handlers, cleanup } = await render({ session, entitlement: { tier: 'pro', active: true, expiresAt: future, trialEligible: false } });
  await act(async () => el.querySelector('.plan-arrow.next').click());
  expect(el.querySelector('.plan-tile.selected strong').textContent).toBe('Pro+');
  expect(el.querySelector('.plan-price').textContent).toContain('₱349.00');
  expect(el.querySelector('.plan-price').textContent).toContain('or ₱3,490.00 / year');
  expect(el.querySelector('.plan-price').textContent).toContain('(save 17%)');
  await act(async () => button(el, 'Annual').click());
  expect(el.querySelector('.plan-price strong').textContent).toBe('₱3,490.00');
  await act(async () => el.querySelector('.plan-cta').click());
  expect(purchaseStoreProduct).toHaveBeenCalledWith('com.nasrinai.movo.proplus.annual', session);
  expect(handlers.onRefresh).toHaveBeenCalled();
  cleanup();
});

test('the current plan cannot be bought again and Terms open from the fine print', async () => {
  const { el, handlers, cleanup } = await render({ session, entitlement: { tier: 'pro', active: true, expiresAt: future } });
  expect(el.querySelector('.plan-tile.selected').textContent).toContain('Current');
  expect(el.querySelector('.plan-cta').disabled).toBe(true);
  await act(async () => button(el, 'Terms apply.').click());
  expect(handlers.onOpenTerms).toHaveBeenCalled();
  cleanup();
});
