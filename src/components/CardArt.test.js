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
  expect(el.querySelector('.ccx-sub').textContent).toBe('Financial Tracker');
  expect(el.querySelector('.ccx-type').textContent).toBe('Debit CardPlatinum');
  expect(el.querySelector('.ccx-watermark svg.movo-mark')).not.toBeNull();
  expect(el.querySelector('.ccx-net.net-mastercard')).not.toBeNull();
  expect(el.textContent).toContain('3187');
  act(() => root.unmount());
});

test('cash with no finish is a green MOVO card; a known bank keeps its own face and logo', () => {
  const cash = render(<CardArt a={{ id: 'k', name: 'Cash', account_type: 'cash', balance: 500, currency: 'PHP' }} show />);
  expect(cash.el.querySelector('.credit-card').className).toContain('movo-green');
  expect(cash.el.querySelector('.ccx-type').textContent).toBe('Cash');
  act(() => cash.root.unmount());
  const bpi = render(<CardArt a={{ id: 'b', name: 'BPI', institution_name: 'BPI', account_type: 'card', cardKind: 'debit', balance: 1, currency: 'PHP' }} show />);
  expect(bpi.el.querySelector('.credit-card').className).not.toContain('ccx-movo');
  expect(bpi.el.querySelector('.ccx-logo img')).not.toBeNull();
  expect(bpi.el.querySelector('.ccx-name').textContent).toBe('BPI');
  act(() => bpi.root.unmount());
});
