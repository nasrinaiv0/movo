import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RecentLogsSheet, { kindOf } from './RecentLogsSheet';

global.IS_REACT_ACT_ENVIRONMENT = true;
const now = new Date('2026-11-02T09:00:00Z');
const logs = [
  { id: 't1', merchant: 'Jollibee', amount: 250, currency: 'PHP', type: 'expense', date: now.toISOString(), source: 'applepay', accountName: 'BPI' },
  { id: 't2', merchant: 'Grab', amount: 180, currency: 'PHP', type: 'expense', date: now.toISOString(), source: 'googlepay', accountName: 'GCash' },
  { id: 't3', merchant: 'Salary', amount: 50000, currency: 'PHP', type: 'income', date: now.toISOString(), source: 'manual', accountName: 'BDO' },
];
const failed = [{ id: 'f1', source: 'applepay', reason: 'account_match_required', transaction_type: 'expense', amount: 420, currency: 'PHP', merchant: 'Starbucks', occurred_at: now.toISOString(), created_at: now.toISOString() }];
const accounts = [{ id: '11111111-1111-1111-1111-111111111111', name: 'BPI', institution_name: 'BPI', account_type: 'card', mask: '3187', currency: 'PHP' }];

function setValue(el, value) {
  act(() => {
    const proto = el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

test('groups sources the way people talk about them', () => {
  expect(['applepay', 'googlepay', 'bank', 'siri_shortcut', 'manual', 'csv_import'].map(kindOf)).toEqual(['applepay', 'googlepay', 'auto', 'auto', 'manual', 'manual']);
});

test('lists new logs by source, opens on what needs attention, and logs a failed payment to a chosen account', async () => {
  const onLog = jest.fn().mockResolvedValue(undefined); const onDismiss = jest.fn().mockResolvedValue(undefined);
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  act(() => root.render(<RecentLogsSheet logs={logs} failed={failed} accounts={accounts} refDate={now} onLog={onLog} onDismiss={onDismiss} onOpen={() => {}} onClose={() => {}} />));
  expect(el.textContent).toContain('While you were away');
  expect(el.textContent).toContain('3 new · 1 not logged');
  const tabs = [...el.querySelectorAll('[role="tab"]')].map(b => b.textContent);
  expect(tabs).toEqual(['All4', 'Apple Pay1', 'Google Pay1', 'Manual1', 'Not logged1']); // empty groups are hidden
  expect(el.querySelector('[role="tab"][aria-selected="true"]').textContent).toBe('Not logged1');
  expect(el.textContent).toContain('Starbucks');
  expect(el.textContent).toContain('Could not tell which account');

  act(() => [...el.querySelectorAll('button')].find(b => b.textContent === 'Log').click());
  const save = () => [...el.querySelectorAll('button[type="submit"]')][0];
  expect(save().disabled).toBe(true); // an account must be chosen first
  setValue(el.querySelector('select'), accounts[0].id);
  setValue(el.querySelector('input[aria-label="Amount"]'), '425.5');
  expect(save().disabled).toBe(false);
  await act(async () => { save().click(); });
  expect(onLog).toHaveBeenCalledWith(failed[0], { account_id: accounts[0].id, amount: 425.5, merchant: 'Starbucks' });

  await act(async () => { [...el.querySelectorAll('button')].find(b => b.textContent === 'Dismiss').click(); });
  expect(onDismiss).toHaveBeenCalledWith(failed[0]);

  act(() => [...el.querySelectorAll('[role="tab"]')].find(b => b.textContent.startsWith('Apple Pay')).click());
  expect(el.textContent).toContain('Jollibee');
  expect(el.textContent).not.toContain('Grab');
  expect(el.textContent).not.toContain('Starbucks');
  act(() => root.unmount());
});
