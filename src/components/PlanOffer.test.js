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
  // Platinum Pro+ is a platinum base with a holographic sheen, not flat lavender.
  expect(tiles[2].querySelector('svg.movo-mark').classList.contains('is-metal')).toBe(true);
  expect(Array.from(tiles[2].querySelectorAll('svg.movo-mark path')).map(p => p.getAttribute('data-tone'))).toContain('#d8dadc');
  const stops = Array.from(tiles[2].querySelectorAll('stop')).map(stop => stop.getAttribute('stop-color'));
  expect(stops).not.toContain('#dcd9ef');
  expect(stops).toEqual(expect.arrayContaining(['#f1d3e2', '#cdeef2', '#f3e7c8'])); // rose, aqua, champagne
  // No "Gold MOVO" / "Platinum MOVO" labels on the tiles: the mark's colour says it (owner, 2026-11-09).
  expect(el.querySelector('.plan-tile-chip')).toBeNull();
  // Every tile shows its amount (owner, 2026-11-12): Free ₱0; paid plans the store price, or "Price in app" without a store.
  expect(tiles.map(t => t.textContent)).toEqual(['CurrentFree₱0', 'ProPrice in app', 'Pro+Price in app']);
  expect(tiles[1].getAttribute('aria-checked')).toBe('true');
  // On the web no price is invented: paid tiles say "Price in app"; the only amount is Free's ₱0.
  expect(el.querySelectorAll('.plan-tile-price.is-note')).toHaveLength(2);
  expect(el.textContent).not.toMatch(/₱\s?[1-9]/);
  expect(el.querySelector('.plan-price')).toBeNull();
  // "Save 20%" sits on the Pro and Pro+ plans once Annual is chosen (owner, 2026-11-12): the owner's annual pricing,
  // since the website has no store prices. Free keeps its "Current" badge; Monthly shows no saving.
  const saves = () => Array.from(el.querySelectorAll('.plan-tile')).map(t => t.querySelector('.plan-tile-badge.is-save')?.textContent || '');
  expect(saves()).toEqual(['', '', '']);
  await act(async () => button(el, 'Annual').click());
  expect(saves()).toEqual(['', 'Save 20%', 'Save 20%']);
  expect(el.querySelectorAll('.plan-tile')[0].querySelector('.plan-tile-badge').textContent).toBe('Current');
  await act(async () => button(el, 'Monthly').click());
  expect(saves()).toEqual(['', '', '']);
  // Restore purchases and Manage subscription are always there (owner, 2026-11-12), also on the website.
  const links = Array.from(el.querySelectorAll('.subscription-links button')).map(b => [b.textContent, b.disabled]);
  expect(links).toEqual([['Restore purchases', false], ['Manage subscription', false]]);
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

test('the referral code field is there as soon as the panel opens, signed in or not (owner, 2026-11-12)', async () => {
  window.localStorage.removeItem('movo.pendingReferral.v1');
  // Signed in: the field shows at once, with no "Have a referral code?" step.
  let view = await render({ session, entitlement: { tier: 'free', trialEligible: true } });
  expect(view.el.querySelector('input.plan-referral-input')).not.toBeNull();
  expect(button(view.el, 'Have a referral code?')).toBeUndefined();
  view.cleanup();
  // Still loading the plan check (no entitlement yet) and signed out: the field is there too, and a code typed now
  // is kept for after sign-in.
  view = await render({ session: null, entitlement: null });
  const input = view.el.querySelector('input.plan-referral-input');
  expect(input).not.toBeNull();
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'm78038');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => view.el.querySelector('.plan-cta').click());
  expect(view.handlers.onSignIn).toHaveBeenCalled();
  view.cleanup();
  view = await render({ session, entitlement: { tier: 'free', trialEligible: true } });
  expect(view.el.querySelector('input.plan-referral-input').value).toBe('M78038');
  view.cleanup();
});

test('in the app, the store price drives the panel and Continue buys the selected plan and period', async () => {
  isNativePurchasePlatform.mockReturnValue(true);
  getStoreProducts.mockResolvedValue([
    { productIdentifier: 'com.nasrinai.movo.proplus.monthly', priceString: '₱349.00', price: 349 },
    { productIdentifier: 'com.nasrinai.movo.proplus.annual', priceString: '₱3,490.00', price: 3490 },
  ]);
  purchaseStoreProduct.mockResolvedValue({});
  const { el, handlers, cleanup } = await render({ session, entitlement: { tier: 'pro', active: true, expiresAt: future, trialEligible: false } });
  await act(async () => el.querySelectorAll('.plan-tile')[2].click());
  expect(el.querySelector('.plan-tile.selected strong').textContent).toBe('Pro+');
  expect(el.querySelector('.plan-price').textContent).toContain('₱349.00');
  expect(el.querySelector('.plan-price').textContent).toContain('or ₱3,490.00 / year');
  expect(el.querySelector('.plan-price').textContent).toContain('(save 17%)');
  // The tiles carry the store amount for the chosen period, and Annual shows the saving.
  expect(el.querySelectorAll('.plan-tile-price')[2].textContent).toBe('₱349.00/mo');
  const annualButton = Array.from(el.querySelectorAll('.plan-period button')).find(b => b.textContent.startsWith('Annual'));
  await act(async () => annualButton.click());
  // With store prices the plan's own saving shows (17% here); the current plan (Pro) keeps "Current" instead.
  expect(el.querySelectorAll('.plan-tile')[2].querySelector('.plan-tile-badge.is-save').textContent).toBe('Save 17%');
  expect(el.querySelectorAll('.plan-tile')[1].querySelector('.plan-tile-badge').textContent).toBe('Current');
  expect(el.querySelector('.plan-price strong').textContent).toBe('₱3,490.00');
  expect(el.querySelectorAll('.plan-tile-price')[2].textContent).toBe('₱3,490.00/yr');
  await act(async () => el.querySelector('.plan-cta').click());
  expect(purchaseStoreProduct).toHaveBeenCalledWith(expect.objectContaining({ productIdentifier: 'com.nasrinai.movo.proplus.annual', priceString: '₱3,490.00' }), session);
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
