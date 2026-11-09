import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import FinancialPlanning from './FinancialPlanning';
import { ConfirmHost } from '../components/ConfirmDialog';
import * as repo from '../lib/obligationsRepository';
import * as bills from '../lib/billsRepository';

jest.mock('../lib/obligationsRepository');
jest.mock('../lib/billsRepository');
global.IS_REACT_ACT_ENVIRONMENT = true;

const account = { id: 'bank', name: 'Savings', account_type: 'bank', currency: 'PHP', balance: 20000 };
const item = { id: 'rec-1', name: 'Emergency Fund', counterparty: 'Family', reason: 'Cash assistance',
  opening_amount: 2500, outstanding_amount: 1000, currency: 'PHP', due_date: '2026-11-17',
  status: 'active', account_id: 'bank', notes: 'Original' };
let el, root, c;

beforeEach(() => {
  jest.clearAllMocks();
  repo.listLoans.mockResolvedValue([]);
  repo.listReceivables.mockResolvedValue([item]);
  repo.listGoals.mockResolvedValue([]);
  repo.listGoalAllocations.mockResolvedValue([]);
  repo.listPlanAllocations.mockResolvedValue([]);
  bills.listBills.mockResolvedValue([]);
  bills.listOccurrences.mockResolvedValue([]);
  bills.listBillPayments.mockResolvedValue([]);
  repo.recordReceivableEvent.mockResolvedValue({});
  repo.updateReceivable.mockResolvedValue({});
  repo.deleteReceivable.mockResolvedValue({});
  el = document.createElement('div'); document.body.appendChild(el);
  root = createRoot(el);
  c = { cloudMode: true, base: 'PHP', show: true, accountsView: [account], toBase: v => v,
    go: jest.fn(), notify: jest.fn(), refreshFinance: jest.fn().mockResolvedValue(),
    session: { user: { id: 'user-1' } } };
});

afterEach(() => {
  act(() => root.unmount()); el.remove();
  document.querySelectorAll('[role="dialog"]').forEach(d => d.remove());
});

const showOwed = async () => {
  await act(async () => root.render(<ConfirmHost><FinancialPlanning c={c}/></ConfirmHost>));
  const tab = [...el.querySelectorAll('.chip-row button')].find(b => b.textContent === 'Owed to you');
  expect(tab).toBeDefined();
  await act(async () => tab.click());
};
const action = title => [...el.querySelectorAll('.fp-loan-actions button')].find(b => b.textContent.trim() === title);
const dialog = () => document.querySelector('[role="dialog"]');

test('Owed to you has three equally sized, borderless actions beneath the record', async () => {
  await showOwed();
  expect(el.querySelectorAll('.fp-loan-card')).toHaveLength(1);
  expect(el.querySelectorAll('.fp-loan-actions button')).toHaveLength(3);
  expect(action('Collect')).toBeTruthy();
  expect(action('Edit')).toBeTruthy();
  expect(action('Delete')).toBeTruthy();
  expect(el.querySelector('.fp-row .fp-main strong').textContent).toBe('Emergency Fund');
  expect(el.querySelector('.fp-amount').textContent).toContain('1,000.00');
});

test('Collect uses the original accounting event sheet with collected preselected', async () => {
  await showOwed();
  await act(async () => action('Collect').click());
  expect(dialog().textContent).toContain('Record collection');
  const select = dialog().querySelector('select');
  expect(select.value).toBe('collected');
  const accountOptions = [...dialog().querySelectorAll('select option')].map(o => o.value);
  expect(accountOptions).toContain('bank');
});

test('Edit form cannot overwrite original amount or collection balance', async () => {
  await showOwed();
  await act(async () => action('Edit').click());
  expect(dialog().textContent).toContain('Edit receivable');
  expect(dialog().querySelector('input[name="opening_amount"]')).toBeNull();
  expect(dialog().querySelector('input[name="outstanding_amount"]')).toBeNull();
  const numbers = dialog().querySelectorAll('input[type="number"]');
  expect(numbers).toHaveLength(0);
  expect(dialog().textContent).toContain('Original amount and recorded collections cannot be changed here.');
  await act(async () => dialog().querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(repo.updateReceivable).toHaveBeenCalledWith('rec-1', expect.anything(), 'user-1');
});

test('Delete asks for confirmation and archives rather than deleting cash movement', async () => {
  await showOwed();
  await act(async () => action('Delete').click());
  const confirmBox = () => document.querySelector('.confirm-dialog');
  expect(confirmBox().querySelector('.confirm-name').textContent).toBe('Emergency Fund');
  expect(confirmBox().textContent).toContain('Recorded collections and account balances will remain unchanged.');
  expect(repo.deleteReceivable).not.toHaveBeenCalled();
  await act(async () => confirmBox().querySelector('.confirm-cancel').click());
  expect(repo.deleteReceivable).not.toHaveBeenCalled();
  await act(async () => action('Delete').click());
  // A double tap sends one request.
  await act(async () => { const accept = confirmBox().querySelector('.confirm-accept'); accept.click(); accept.click(); });
  expect(repo.deleteReceivable).toHaveBeenCalledTimes(1);
  expect(repo.deleteReceivable).toHaveBeenCalledWith('rec-1', 'user-1');
  expect(c.notify).toHaveBeenCalledWith('Receivable deleted.');
});

test('a failed delete is shown in the dialog and nothing is reported as deleted', async () => {
  repo.deleteReceivable.mockRejectedValueOnce(new Error('offline'));
  await showOwed();
  await act(async () => action('Delete').click());
  await act(async () => document.querySelector('.confirm-accept').click());
  expect(document.querySelector('.confirm-error').textContent).toBe('Could not delete it. Nothing was changed. Please try again.');
  expect(document.querySelector('.confirm-accept').textContent).toBe('Try again');
  expect(c.notify).not.toHaveBeenCalled();
  await act(async () => document.querySelector('.confirm-accept').click());
  expect(repo.deleteReceivable).toHaveBeenCalledTimes(2);
  expect(document.querySelector('.confirm-dialog')).toBeNull();
  expect(c.notify).toHaveBeenCalledWith('Receivable deleted.');
});

test('Fully collected receivable has Collect disabled; editing/deleting remains possible', async () => {
  repo.listReceivables.mockResolvedValue([{ ...item, status: 'settled', outstanding_amount: 0 }]);
  await showOwed();
  expect(action('Collect').disabled).toBe(true);
  expect(action('Edit').disabled).toBe(false);
  expect(action('Delete').disabled).toBe(false);
});

test('Archived receivables are hidden and cannot be collected', async () => {
  repo.listReceivables.mockResolvedValue([{ ...item, status: 'archived' }]);
  await showOwed();
  expect(el.querySelector('.fp-loan-card')).toBeNull();
  expect(action('Collect')).toBeUndefined();
});
