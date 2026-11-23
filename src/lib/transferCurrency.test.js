import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { sameTransferCurrency, transferTargets } from './transferCurrency';
import TransactionSheet from '../components/TransactionSheet';

global.IS_REACT_ACT_ENVIRONMENT = true;

const accounts = [
  { id: 'php1', name: 'BPI', account_type: 'bank', currency: 'PHP', balance: 100 },
  { id: 'php2', name: 'GCash', account_type: 'e_wallet', currency: 'PHP', balance: 50 },
  { id: 'usd', name: 'Wise USD', account_type: 'bank', currency: 'USD', balance: 10 },
  { id: 'nocur', name: 'Cash', account_type: 'cash', balance: 5 }, // no currency: treated as PHP
];

test('transfers stay within one currency (audit 2026-11-23: foreign balances drifted with the daily rate)', () => {
  expect(sameTransferCurrency(accounts, 'php1', 'php2')).toBe(true);
  expect(sameTransferCurrency(accounts, 'php1', 'nocur')).toBe(true);
  expect(sameTransferCurrency(accounts, 'php1', 'usd')).toBe(false);
  expect(sameTransferCurrency(accounts, 'php1', '')).toBe(true);
  expect(transferTargets(accounts, 'php1').map(a => a.id)).toEqual(['php2', 'nocur']);
  expect(transferTargets(accounts, 'usd').map(a => a.id)).toEqual([]);
});

test('the transfer sheet offers only same-currency destinations and explains why', async () => {
  const form = { transaction_type: 'transfer', merchant: '', amount: '', account_id: 'php1', transfer_to_account_id: '', category: 'Transfer', occurred_at: '2026-11-23', time: '', note: '' };
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  await act(async () => { root.render(<TransactionSheet form={form} setForm={() => {}} accounts={accounts} cloudMode onSave={() => {}} onClose={() => {}} currency="PHP" />); });
  const pickers = [...container.querySelectorAll('.tx-accounts > *')];
  expect(pickers).toHaveLength(2);
  expect(pickers[1].textContent).not.toMatch(/Wise USD/);
  expect(container.textContent).toMatch(/Only accounts in the same currency are shown/);
  await act(async () => root.unmount());
});
