import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AccountDetailsSheet from './AccountDetailsSheet';

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('./Icon', () => ({ __esModule: true, default: () => null }));
jest.mock('./ui', () => ({
  Sheet: ({ children }) => <div data-testid="sheet">{children}</div>,
  TransactionRow: () => null,
}));
jest.mock('./CardArt', () => ({
  __esModule: true,
  default: ({ qrCode, onQrClick }) => <div data-testid="card-art" data-qr={qrCode}>
    {qrCode && <button type="button" aria-label="Enlarge QR code" onClick={onQrClick}>QR</button>}
  </div>,
}));
jest.mock('./AccountTile', () => ({
  __esModule: true,
  default: ({ qrCode, onQrClick }) => <div data-testid="account-tile" data-qr={qrCode}>
    {qrCode && <button type="button" aria-label="Enlarge QR code" onClick={onQrClick}>QR</button>}
  </div>,
  styleFor: () => ({}),
}));
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

  expect(el.querySelector('[data-testid="account-tile"]')?.getAttribute('data-qr')).toBe(qr);
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
