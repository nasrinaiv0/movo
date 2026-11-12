import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import CardArt from './CardArt';

global.IS_REACT_ACT_ENVIRONMENT = true;

const render = (ui) => { const el = document.createElement('div'); const root = createRoot(el); act(() => root.render(ui)); return { el, root }; };

test('an account without a fetchable logo becomes a MOVO card in the picked finish', () => {
  const a = { id: 'c1', name: 'Tiny Rural Bank', institution_name: 'Tiny Rural Bank', account_type: 'card', cardKind: 'debit', mask: '3187', balance: 4915, currency: 'PHP' };
  const { el, root } = render(<CardArt a={a} show styleId="finish:platinum" cardNetwork="mastercard" />);
  const card = el.querySelector('.credit-card');
  expect(card.className).toContain('ccx-movo');
  expect(card.className).toContain('movo-platinum');
  expect(card.getAttribute('aria-label')).toBe('Tiny Rural Bank · MOVO');
  expect(el.querySelector('.ccx-name').textContent).toBe('MOVO');
  expect(el.querySelector('.ccx-sub').textContent).toBe('Tiny Rural Bank');
  expect(el.querySelector('.ccx-type').textContent).toBe('Debit CardPlatinum');
  expect(el.querySelector('.ccx-watermark svg.movo-mark')).not.toBeNull();
  expect(el.querySelector('.ccx-net.net-mastercard')).not.toBeNull();
  expect(el.textContent).toContain('3187');
  act(() => root.unmount());
});

test('cash and unreviewed banks use branded local artwork but retain their own account name', () => {
  const cash = render(<CardArt a={{ id: 'k', name: 'Cash', account_type: 'cash', balance: 500, currency: 'PHP' }} show />);
  expect(cash.el.querySelector('.credit-card').className).toContain('movo-green');
  expect(cash.el.querySelector('.ccx-type').textContent).toBe('Cash');
  act(() => cash.root.unmount());
  const bpi = render(<CardArt a={{ id: 'b', name: 'BPI', institution_name: 'BPI', account_type: 'card', cardKind: 'debit', balance: 1, currency: 'PHP' }} show />);
  expect(bpi.el.querySelector('.credit-card').className).toContain('ccx-movo');
  expect(bpi.el.querySelector('.ccx-logo img')).toBeNull();
  expect(bpi.el.querySelector('.ccx-name').textContent).toBe('MOVO');
  expect(bpi.el.querySelector('.ccx-sub').textContent).toBe('BPI');
  act(() => bpi.root.unmount());
});

test('credit cards show spent, limit and a utilization bar instead of the balance amount', () => {
  const a = { id: 'credit-1', name: 'AUB', institution_name: 'Asia United Bank', account_type: 'card', cardKind: 'credit', mask: '2556', balance: -522300, creditLimit: 800000, currency: 'PHP' };
  const { el, root } = render(<CardArt a={a} show />);
  expect(el.querySelector('.ccx-credit-usage')).not.toBeNull();
  expect(el.querySelector('.ccx-credit-values').textContent).toContain('Spent');
  expect(el.querySelector('.ccx-credit-values').textContent).toContain('Limit');
  expect(el.querySelector('.ccx-credit-values').textContent).toContain('₱522,300.00');
  expect(el.querySelector('.ccx-credit-values').textContent).toContain('₱800,000.00');
  expect(el.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('65');
  expect(el.querySelector('.ccx-credit-fill').style.width).toBe('65%');
  expect(el.querySelector('.ccx-balance')).toBeNull();
  act(() => root.unmount());
});

test('debit cards continue to show their balance without credit utilization', () => {
  const a = { id: 'debit-1', name: 'AUB', institution_name: 'Asia United Bank', account_type: 'card', cardKind: 'debit', balance: 522300, currency: 'PHP' };
  const { el, root } = render(<CardArt a={a} show />);
  expect(el.querySelector('.ccx-credit-usage')).toBeNull();
  expect(el.querySelector('.ccx-balance').textContent).toContain('522,300');
  act(() => root.unmount());
});

test('without a plan, cards are landscape, but the Portrait format sample still shows the portrait layout', () => {
  const a = { id: 'p', name: 'Atome', institution_name: 'Atome', account_type: 'card', cardKind: 'credit', balance: -559, currency: 'PHP' };
  const used = render(<CardArt a={a} show orientation="portrait" />);
  expect(used.el.querySelector('.credit-card').className).toContain('orientation-landscape');
  act(() => used.root.unmount());
  const sample = render(<CardArt a={a} show orientation="portrait" formatSample />);
  expect(sample.el.querySelector('.credit-card').className).toContain('orientation-portrait');
  act(() => sample.root.unmount());
});
