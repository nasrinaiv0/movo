import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AccountPicker, { accountOptionLabel, accountName } from './AccountPicker';

global.IS_REACT_ACT_ENVIRONMENT = true;
const ACCOUNTS = [
  { id: 'b1', name: 'BPI', institution_name: 'BPI', account_type: 'bank', mask: '1234', currency: 'PHP' },
  { id: 'c1', name: 'BPI', institution_name: 'BPI', account_type: 'card', cardKind: 'debit', mask: '5678', currency: 'PHP' },
  { id: 'c2', name: 'BPI', institution_name: 'BPI', account_type: 'card', cardKind: 'credit', mask: '9012', currency: 'PHP' },
  { id: 'w1', name: 'GCash', institution_name: 'GCash', account_type: 'e_wallet', currency: 'PHP' },
  { id: 'k1', name: 'Cash', institution_name: '', account_type: 'cash', currency: 'PHP' },
  { id: 's1', name: 'Savings', institution_name: 'Metrobank', account_type: 'bank', currency: 'USD' },
];

test('labels show the bank, the card kind and the last 4 digits', () => {
  expect(accountOptionLabel(ACCOUNTS[1])).toBe('BPI · Debit •••• 5678');
  expect(accountOptionLabel(ACCOUNTS[2])).toBe('BPI · Credit •••• 9012');
  expect(accountOptionLabel(ACCOUNTS[0])).toBe('BPI •••• 1234');
  expect(accountOptionLabel(ACCOUNTS[3])).toBe('GCash');
  expect(accountOptionLabel(ACCOUNTS[5], { currency: true })).toBe('Metrobank Savings · USD');
  expect(accountName(ACCOUNTS[4])).toBe('Cash');
});

test('options are grouped by kind and the chosen account is described', () => {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el); const changes = [];
  act(() => root.render(<AccountPicker id="p" label="Paid with" accounts={ACCOUNTS} value="c2" onChange={v => changes.push(v)} />));
  expect([...el.querySelectorAll('optgroup')].map(g => g.label)).toEqual(['Bank accounts', 'Cards', 'E-wallets', 'Cash']);
  expect(el.querySelector('.acct-pick-text strong').textContent).toBe('BPI');
  expect(el.querySelector('.acct-pick-text em').textContent).toBe('Credit card · •••• 9012 · PHP');
  act(() => root.unmount());
});
