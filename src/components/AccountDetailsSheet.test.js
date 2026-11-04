import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AccountDetailsSheet from './AccountDetailsSheet';

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('./Icon', () => ({ __esModule: true, default: () => null }));
jest.mock('./ui', () => {
  const React = require('react');
  return {
    Sheet: ({ children }) => React.createElement('div', { 'data-testid': 'sheet' }, children),
    TransactionRow: () => null,
    Money: () => null,

  };
});
jest.mock('./MoneyFlow', () => {
  const React = require('react');
  return { __esModule: true, default: ({ txs, variant }) => React.createElement('div', { 'data-testid': 'account-money-flow', 'data-transaction-ids': txs.map(item => item.id).join(','), 'data-variant': variant }) };
});
jest.mock('./CardArt', () => {
  const React = require('react');
  return { __esModule: true, default: ({ a, qrCode, onQrClick }) => React.createElement('div', { 'data-testid': 'card-art', 'data-qr': qrCode, 'data-account-type': a?.account_type, 'data-account-name': a?.institution_name || a?.name }, qrCode && React.createElement('button', { type: 'button', 'aria-label': 'Enlarge QR code', onClick: onQrClick }, 'QR')) };
});
jest.mock('./AccountTile', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ qrCode, onQrClick }) => React.createElement('div', { 'data-testid': 'account-tile', 'data-qr': qrCode }, qrCode && React.createElement('button', { type: 'button', 'aria-label': 'Enlarge QR code', onClick: onQrClick }, 'QR')),
    styleFor: () => ({}),
  };
});
jest.mock('../lib/cashback', () => ({ estimateCashback: () => [] }));
jest.mock('../lib/scheduledTransactions', () => ({ listScheduledTransactions: () => Promise.resolve([]) }));

test('read-only account hub shows resolved QR artwork, supports Escape to close zoom, and hides edit/archive actions', async () => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  const qr = 'https://storage.example/signed-account-qr';
  const onEdit = jest.fn();
  const onArchive = jest.fn();
  const onAddTransaction = jest.fn();

  await act(async () => {
    root.render(<AccountDetailsSheet
      account={{ id: 'bank-1', name: 'BPI Savings', account_type: 'bank', currency: 'PHP', balance: 1200 }}
      accounts={[]}
      transactions={[]}
      prefs={{}}
      subscriptions={[]}
      show
      qrCodeDisplay={qr}
      canEdit={false}
      onClose={jest.fn()}
      onEdit={onEdit}
      onArchive={onArchive}
      onAddTransaction={onAddTransaction}
      onOpenTransaction={jest.fn()}
      onOpenAccount={jest.fn()}
    />);
    await Promise.resolve();
  });

  expect(el.querySelector('[data-testid="card-art"]')?.getAttribute('data-qr')).toBe(qr);
  expect(el.querySelector('[data-testid="card-art"]')?.getAttribute('data-account-type')).toBe('bank');
  expect(el.querySelector('[data-testid="card-art"]')?.getAttribute('data-account-name')).toBe('BPI Savings');
  expect(el.querySelector('[data-testid="account-tile"]')).toBeNull();
  expect(el.textContent).toContain('Add transaction');
  expect(el.textContent).not.toContain('Edit account');
  expect(el.textContent).not.toContain('Archive account');

  await act(async () => el.querySelector('button[aria-label="Enlarge QR code"]').click());
  expect(el.querySelector('[role="dialog"][aria-modal="true"]')).not.toBeNull();

  await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
  expect(el.querySelector('[role="dialog"][aria-modal="true"]')).toBeNull();
  expect(onEdit).not.toHaveBeenCalled();
  expect(onArchive).not.toHaveBeenCalled();

  act(() => root.unmount());
  el.remove();
});


test('account overview shows Money Flow scoped to the selected account', async () => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  const transactions = [
    { id: 'cash-expense', account_id: 'cash-1', type: 'expense', amount: 125, date: new Date().toISOString() },
    { id: 'cash-income', account_id: 'cash-1', type: 'income', amount: 500, date: new Date().toISOString() },
    { id: 'transfer-to-cash', account_id: 'other-account', transfer_to_account_id: 'cash-1', type: 'transfer', amount: 300, date: new Date().toISOString() },
    { id: 'other-account-expense', account_id: 'other-account', type: 'expense', amount: 800, date: new Date().toISOString() },
  ];
  await act(async () => {
    root.render(<AccountDetailsSheet
      account={{ id: 'cash-1', name: 'Cash', account_type: 'cash', currency: 'PHP', balance: 1000 }}
      accounts={[]}
      transactions={transactions}
      prefs={{}}
      subscriptions={[]}
      show
      onClose={jest.fn()}
    />);
    await Promise.resolve();
  });
  expect(el.querySelector('[aria-label="Last 10 Days Spending"]')).toBeNull();
  const flow = el.querySelector('[data-testid="account-money-flow"]');
  expect(flow).not.toBeNull();
  expect(flow.getAttribute('data-variant')).toBe('bars');
  expect(flow.getAttribute('data-transaction-ids').split(',')).toEqual(['cash-expense', 'cash-income', 'transfer-to-cash']);
  act(() => root.unmount());
  el.remove();
});
