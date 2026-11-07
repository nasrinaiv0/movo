import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AccountSheet from './AccountSheet';
import { extractQrImage } from '../lib/qrImageProcessing';

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('./Icon', () => ({ __esModule: true, default: () => null }));
jest.mock('./ui', () => {
  const React = require('react');
  return {
    Sheet: ({ children }) => React.createElement('div', { 'data-testid': 'account-sheet' }, typeof children === 'function' ? children(() => {}) : children),
    Toggle: () => null
  };
});
jest.mock('./CardArt', () => {
  const React = require('react');
  return { __esModule: true, default: () => React.createElement('div', { 'data-testid': 'card-preview' }) };
});
jest.mock('../lib/qrImageProcessing', () => ({ extractQrImage: jest.fn() }));

const baseForm = {
  account_type: 'e_wallet', institution_name: 'GCash', name: 'GCash',
  opening_balance: '0', currency: 'PHP', mask: '', cardKind: 'debit',
  color: '', icon: '', linkedBankId: '', qrCode: ''
};
const setup = async (type, overrides = {}) => {
  const node = document.createElement('div');
  document.body.appendChild(node);
  const root = createRoot(node);
  const setForm = jest.fn();
  await act(async () => {
    root.render(<AccountSheet base="PHP" form={{ ...baseForm, account_type: type, ...overrides }}
      setForm={setForm} accounts={[]} onSave={jest.fn(event => event.preventDefault())}
      onClose={jest.fn()} />);
  });
  return { node, root, setForm, cleanup() { act(() => root.unmount()); node.remove(); } };
};

test('e-wallet account shows QR upload and correct preview while preserving bank UI', async () => {
  const wallet = await setup('e_wallet', { qrCode: 'data:image/png;base64,AAAA' });
  expect(wallet.node.querySelector('#acct-qr-file')).not.toBeNull();
  expect(wallet.node.textContent).toContain('E-wallet QR code');
  expect(wallet.node.textContent).toContain('Replace QR code');
  expect(wallet.node.querySelector('img[alt="E-wallet QR code preview"]')).not.toBeNull();
  wallet.cleanup();

  const bank = await setup('bank');
  expect(bank.node.querySelector('#acct-qr-file')).not.toBeNull();
  expect(bank.node.textContent).toContain('Bank QR code');
  expect(bank.node.textContent).not.toContain('E-wallet QR code');
  bank.cleanup();
});

test('QR uploads never appear for cards or cash', async () => {
  for (const type of ['card', 'cash', 'other']) {
    const result = await setup(type);
    expect(result.node.querySelector('#acct-qr-file')).toBeNull();
    result.cleanup();
  }
});

test('selected e-wallet QR is processed and attached to account form', async () => {
  const dataUrl = 'data:image/png;base64,AAAA';
  extractQrImage.mockReturnValue(dataUrl);
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  const OriginalImage = window.Image;
  URL.createObjectURL = jest.fn(() => 'blob:qr-image');
  URL.revokeObjectURL = jest.fn();
  window.Image = class {
    naturalWidth = 300;
    naturalHeight = 300;
    set src(url) { this.onload?.(); }
  };
  const result = await setup('e_wallet');
  try {
    const file = new File([new Uint8Array([1, 2, 3])], 'gcash.png', { type: 'image/png' });
    await act(async () => {
      const input = result.node.querySelector('#acct-qr-file');
      Object.defineProperty(input, 'files', { configurable: true, value: [file] });
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
    expect(extractQrImage).toHaveBeenCalled();
    expect(result.setForm).toHaveBeenCalledWith(expect.objectContaining({ account_type: 'e_wallet', qrCode: dataUrl }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:qr-image');
  } finally {
    result.cleanup();
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    window.Image = OriginalImage;
  }
});
