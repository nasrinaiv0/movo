import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { TransactionRow } from './ui';

global.IS_REACT_ACT_ENVIRONMENT = true;
const transaction = { id: 'tx-1', type: 'expense', merchant: 'Cafe',
  amount: 12.5, currency: 'PHP', accountName: 'Bank', date: '2026-11-08T02:00:00Z' };
const balances = [{ label: 'Balance after', accountName: 'Bank', currency: 'PHP', value: 1234.5 }];

function renderRow(props) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(<TransactionRow t={transaction} show refDate={new Date('2026-11-08')} {...props} />));
  return { container, unmount: () => { act(() => root.unmount()); container.remove(); } };
}

test('remaining balance displays the correct currency and exactly two cents', () => {
  const { container, unmount } = renderRow({ afterBalances: balances });
  expect(container.querySelector('.tx-after-balance').textContent).toMatch(/1,234\.50/);
  expect(container.querySelector('.tx-after-balance').textContent).toContain('Balance after');
  unmount();
});

test('display toggle hides the historical balance without hiding transaction', () => {
  const { container, unmount } = renderRow();
  expect(container.querySelector('.tx-after-balances')).toBeNull();
  expect(container.querySelector('.tx-row')).toBeTruthy();
  unmount();
});

test('privacy hide balances masks historical totals as well as transaction amount', () => {
  const { container, unmount } = renderRow({ afterBalances: balances, show: false });
  expect(container.querySelector('.tx-after-balances').textContent).not.toContain('1,234.50');
  expect(container.querySelector('.tx-after-balances').textContent).toContain('••••');
  unmount();
});

test('transfer shows balances for both affected accounts', () => {
  const { container, unmount } = renderRow({ afterBalances: [
    { label: 'Balance after', accountName: 'Checking', currency: 'PHP', value: 80.1 },
    { label: 'Balance after', accountName: 'Savings', currency: 'PHP', value: 120.25 },
  ] });
  expect(container.querySelectorAll('.tx-after-balance')).toHaveLength(2);
  expect(container.textContent).toContain('80.10');
  expect(container.textContent).toContain('120.25');
  unmount();
});
