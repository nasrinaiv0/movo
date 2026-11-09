import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import LoyaltyDetailsSheet from './LoyaltyDetailsSheet';

global.IS_REACT_ACT_ENVIRONMENT = true;
const card = { id: 'tim', type: 'membership', name: 'Tim Hortons', program: 'Tims Rewards', memberNumber: '1234567890', barcode: '', points: '320', pointsUnit: 'points', noExpiry: false, expiryDate: '2027-06-30', pointsExpiry: '2026-12-31', note: 'Gold tier' };
const bank = { id: 'bpi', name: 'BPI', institution_name: 'BPI', account_type: 'bank', currency: 'PHP' };
const recent = new Date(Date.now() - 2 * 86400000).toISOString();
const transactions = [
  { id: 't1', merchant: 'Tim Hortons BGC', amount: 500, type: 'expense', transaction_type: 'expense', account_id: 'bpi', currency: 'PHP', date: recent, category: 'Food' },
  { id: 't2', merchant: 'Grocery', amount: 900, type: 'expense', transaction_type: 'expense', account_id: 'bpi', currency: 'PHP', date: recent, category: 'Food' },
];
const rules = { tim: { enabled: true, accountId: 'bpi', merchantContains: 'tim hortons', pointsPer100: 10, currency: 'PHP' } };

function render(props = {}) {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  const handlers = { onClose: jest.fn(), onEdit: jest.fn(), onRemove: jest.fn(), onOpenAccount: jest.fn(), onOpenTransaction: jest.fn(), onOpenRewards: jest.fn() };
  act(() => root.render(<LoyaltyDetailsSheet card={card} transactions={transactions} accounts={[bank]} rules={rules} show {...handlers} {...props} />));
  return { el: document.body, root, handlers, cleanup: () => { act(() => root.unmount()); el.remove(); } };
}
const tab = (el, name) => act(() => Array.from(el.querySelectorAll('[role="tab"]')).find(b => b.textContent === name).click());

test('opens the same Account details layout as other cards: card on top, four tabs and the action row', () => {
  const { el, cleanup } = render();
  expect(el.querySelector('[role="dialog"]').getAttribute('aria-label')).toBe('Account details');
  expect(el.querySelector('.account-hub-hero .loyalty-card-face')).not.toBeNull();
  expect(Array.from(el.querySelectorAll('[role="tab"]')).map(b => b.textContent)).toEqual(['Account overview', 'Transactions', 'Connected items', 'More']);
  expect(el.querySelector('.account-hub-actions').textContent).toContain('Edit card');
  expect(el.querySelector('.loyalty-card-expiry').textContent).toContain('06/27');
  cleanup();
});

test('overview shows rewards, never money: balance in points, estimated earnings from matching purchases, expiry and member code', () => {
  const { el, cleanup } = render();
  const metrics = el.querySelector('.account-hub-metrics').textContent;
  expect(metrics).toContain('Rewards balance320 points');
  expect(metrics).toContain('Earned · Last 30 days+50 points'); // 10 points per 100 on the ₱500 Tim Hortons purchase
  expect(metrics).not.toContain('₱');
  expect(el.querySelector('.loyalty-code-value').textContent).toBe('•••• 7890');
  act(() => el.querySelector('.loyalty-code-actions button').click());
  expect(el.querySelector('.loyalty-code-value').textContent).toBe('1234567890');
  // Only the matching purchase earned points.
  expect(el.querySelectorAll('.loyalty-earned-row')).toHaveLength(1);
  expect(el.textContent).toContain('Tim Hortons BGC');
  expect(el.textContent).not.toContain('Grocery');
  cleanup();
});

test('connected items and more show the earning account and every card detail; actions edit and remove', () => {
  const confirm = window.confirm; window.confirm = () => true;
  const { el, handlers, cleanup } = render();
  tab(el, 'Connected items');
  act(() => el.querySelector('.account-hub-linked').click());
  expect(handlers.onOpenAccount).toHaveBeenCalledWith('bpi');
  tab(el, 'More');
  const more = el.querySelector('.detail-list').textContent;
  ['Tim Hortons', 'Membership', 'Tims Rewards', '•••• 7890', 'Gold tier'].forEach(text => expect(more).toContain(text));
  act(() => Array.from(el.querySelectorAll('.account-hub-actions button')).find(b => b.textContent === 'Edit card').click());
  expect(handlers.onEdit).toHaveBeenCalled();
  act(() => Array.from(el.querySelectorAll('.account-hub-actions button')).find(b => b.textContent === 'Remove card').click());
  expect(handlers.onRemove).toHaveBeenCalledWith('tim');
  window.confirm = confirm;
  cleanup();
});

test('hidden balances hide reward figures, and a card without an earning rule explains how to set one up', () => {
  const { el, cleanup } = render({ show: false, rules: {} });
  expect(el.querySelector('.account-hub-metrics').textContent).toContain('••••');
  expect(el.textContent).toContain('Set up how this card earns rewards');
  cleanup();
});
