import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AccountDetailsSheet from './AccountDetailsSheet';

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('./Icon', () => ({ __esModule: true, default: () => null }));
jest.mock('./ui', () => {
  const React = require('react');
  return {
    Sheet: ({ children }) => React.createElement('section', { 'data-testid': 'account-sheet' }, children),
    TransactionRow: ({ t, onOpen }) => React.createElement('button', {
      type: 'button', 'data-testid': 'activity-row', 'data-id': t.id, onClick: onOpen,
    }, t.merchant || t.id),
  };
});
jest.mock('./CardArt', () => {
  const React = require('react');
  return { __esModule: true, default: ({ a }) => React.createElement('div', { 'data-testid': 'account-art' }, a.name) };
});
jest.mock('./MoneyFlow', () => {
  const React = require('react');
  return { __esModule: true, default: ({ txs }) => React.createElement('div', { 'data-testid': 'account-flow', 'data-ids': txs.map(t => t.id).join(',') }) };
});
jest.mock('../lib/cashback', () => ({ estimateCashback: () => [] }));
jest.mock('../lib/scheduledTransactions', () => ({ listScheduledTransactions: () => Promise.resolve([]) }));
jest.mock('../lib/obligationsRepository', () => ({ listGoals: () => Promise.resolve([]), listGoalAllocations: () => Promise.resolve([]) }));

const bank = { id: 'bank-a', name: 'Bank A', account_type: 'bank', currency: 'PHP', balance: 1000 };
const cards = [
  { id: 'card-1', name: 'Bank A', account_type: 'card', cardKind: 'debit', mask: '1111', currency: 'PHP', linkedAccountId: 'bank-a' },
  { id: 'card-2', name: 'Bank A', account_type: 'card', cardKind: 'debit', mask: '2222', currency: 'PHP' },
  { id: 'card-3', name: 'Bank A', account_type: 'card', cardKind: 'credit', mask: '3333', currency: 'PHP' },
  { id: 'other-card', name: 'Bank B', account_type: 'card', cardKind: 'credit', mask: '4444', currency: 'PHP', issuerBankId: 'bank-b' },
];
const prefs = { cardBankLinks: { 'card-2': 'bank-a' }, accountStyles: { 'card-3': { cardKind: 'credit', issuerBankId: 'bank-a' } } };
const rows = [
  { id: 'bank-expense', account_id: 'bank-a', date: '2026-11-08', type: 'expense', amount: 20 },
  { id: 'card-one', account_id: 'card-1', date: '2026-11-09', type: 'expense', amount: 15 },
  { id: 'card-two', account_id: 'card-2', date: '2026-11-10', type: 'expense', amount: 35 },
  { id: 'card-three', account_id: 'card-3', date: '2026-11-11', type: 'expense', amount: 45 },
  { id: 'move', account_id: 'bank-a', transfer_to_account_id: 'card-1', date: '2026-11-07', type: 'transfer', amount: 10 },
  { id: 'move', account_id: 'bank-a', transfer_to_account_id: 'card-1', date: '2026-11-07', type: 'transfer', amount: 10 },
  { id: 'other', account_id: 'other-card', date: '2026-11-11', type: 'expense', amount: 999 },
];
const clickTab = async (el, label) => {
  const tab = [...el.querySelectorAll('[role="tab"]')].find(item => item.textContent.includes(label));
  expect(tab).toBeTruthy();
  await act(async () => tab.click());
};
const visibleIds = el => [...el.querySelectorAll('[data-testid="activity-row"]')].map(item => item.getAttribute('data-id'));

test('bank activity shows all linked debit and issuer cards, with per-card filters and no duplicate transfer', async () => {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  const onOpenTransaction = jest.fn();
  await act(async () => {
    root.render(<AccountDetailsSheet account={bank} accounts={[bank, ...cards]} transactions={rows}
      prefs={prefs} show onClose={jest.fn()} onOpenTransaction={onOpenTransaction} />);
    await Promise.resolve();
  });
  expect(el.querySelector('[data-testid="account-flow"]').getAttribute('data-ids')).toContain('card-three');
  expect(el.querySelector('[data-testid="account-flow"]').getAttribute('data-ids')).not.toContain('other');
  await clickTab(el, 'Transactions');
  const sources = el.querySelector('[aria-label="Transaction source"]');
  expect(sources).toBeTruthy();
  expect(sources.textContent).toContain('Bank + 3 linked cards');
  expect(visibleIds(el)).toEqual(['card-three', 'card-two', 'card-one', 'bank-expense', 'move']);
  const clickSource = async label => {
    const button = [...sources.querySelectorAll('button')].find(item => item.textContent.includes(label));
    expect(button).toBeTruthy();
    await act(async () => button.click());
  };
  await clickSource('Card 1');
  expect(visibleIds(el)).toEqual(['card-one', 'move']);
  await clickSource('Card 2');
  expect(visibleIds(el)).toEqual(['card-two']);
  await clickSource('Card 3');
  expect(visibleIds(el)).toEqual(['card-three']);
  await clickSource('Bank account');
  expect(visibleIds(el)).toEqual(['bank-expense', 'move']);
  await clickSource('All activity');
  expect(visibleIds(el)).toHaveLength(5);
  await act(async () => el.querySelector('[data-id="card-three"]').click());
  expect(onOpenTransaction).toHaveBeenCalledWith(expect.objectContaining({ id: 'card-three' }));
  act(() => root.unmount()); el.remove();
});

test('card detail transaction history remains isolated from bank and sibling card histories', async () => {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => {
    root.render(<AccountDetailsSheet account={cards[2]} accounts={[bank, ...cards]} transactions={rows}
      prefs={prefs} show onClose={jest.fn()} />);
    await Promise.resolve();
  });
  await clickTab(el, 'Transactions');
  expect(visibleIds(el)).toEqual(['card-three']);
  expect(el.querySelector('[aria-label="Transaction source"]')).toBeNull();
  act(() => root.unmount()); el.remove();
});

test('bank activity pages through all transactions instead of truncating to thirty', async () => {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  const longHistory = Array.from({ length: 65 }, (_, index) => ({
    id: 'history-' + index, account_id: index % 2 ? 'card-1' : 'bank-a',
    date: new Date(Date.UTC(2026, 10, 11, 0, 0, index)).toISOString(), amount: 1, type: 'expense',
  }));
  await act(async () => {
    root.render(<AccountDetailsSheet account={bank} accounts={[bank, ...cards]} transactions={longHistory}
      prefs={prefs} show onClose={jest.fn()} />);
    await Promise.resolve();
  });
  await clickTab(el, 'Transactions');
  expect(visibleIds(el)).toHaveLength(50);
  const more = el.querySelector('.account-hub-more');
  expect(more).toBeTruthy();
  await act(async () => more.click());
  expect(visibleIds(el)).toHaveLength(65);
  expect(el.querySelector('.account-hub-more')).toBeNull();
  act(() => root.unmount()); el.remove();
});
