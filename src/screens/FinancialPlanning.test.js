import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import FinancialPlanning from './FinancialPlanning';
import * as obligations from '../lib/obligationsRepository';
import * as billsRepo from '../lib/billsRepository';

jest.mock('../lib/obligationsRepository');
jest.mock('../lib/billsRepository');
global.IS_REACT_ACT_ENVIRONMENT = true;

const loan = { id: 'l1', name: 'Car loan', lender: 'BPI', obligation_type: 'loan', principal_amount: 100000, outstanding_principal: 60000, currency: 'PHP', status: 'active', due_date: '2026-12-01', account_id: 'bank' };
const accounts = [{ id: 'bank', name: 'BPI Savings', account_type: 'bank', currency: 'PHP', balance: 80000 }];

beforeEach(() => {
  obligations.listLoans.mockResolvedValue([loan]);
  obligations.listReceivables.mockResolvedValue([]);
  obligations.listGoals.mockResolvedValue([]);
  obligations.listGoalAllocations.mockResolvedValue([]);
  obligations.recordLoanEvent.mockResolvedValue({});
  billsRepo.listBills.mockResolvedValue([]);
  billsRepo.listOccurrences.mockResolvedValue([]);
  billsRepo.listBillPayments.mockResolvedValue([]);
});

test('signed in: shows the position, opens a section from At a glance and records a loan payment in a sheet', async () => {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el); const refreshFinance = jest.fn().mockResolvedValue(undefined); const notify = jest.fn();
  const c = { cloudMode: true, base: 'PHP', show: true, accountsView: accounts, toBase: (v) => v, go: jest.fn(), refreshFinance, notify, session: { user: { id: 'u' } } };
  await act(async () => root.render(<FinancialPlanning c={c} />));
  expect(el.querySelector('.fp-hero').textContent).toContain('20,000.00'); // 80,000 assets − 60,000 loan
  expect(el.querySelector('.fp-glance').textContent).toContain('1 active');

  await act(async () => Array.from(el.querySelectorAll('.fp-glance .fp-row')).find(b => b.textContent.includes('Loans & debts')).click());
  expect(el.textContent).toContain('Car loan');
  await act(async () => Array.from(el.querySelectorAll('.fp-row')).find(b => b.textContent.includes('Car loan')).click());
  const dialog = document.querySelector('[role="dialog"]');
  expect(dialog.textContent).toContain('Record loan event');
  const amount = dialog.querySelector('input[type="number"]');
  act(() => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(amount, '5000'); amount.dispatchEvent(new Event('input', { bubbles: true })); });
  await act(async () => dialog.querySelector('button.primary-button').click());
  expect(obligations.recordLoanEvent).toHaveBeenCalledWith(expect.objectContaining({ loan_id: 'l1', event_type: 'principal_payment', amount: 5000, account_id: 'bank', currency: 'PHP' }));
  expect(refreshFinance).toHaveBeenCalled();
  expect(notify).toHaveBeenCalledWith('Payment or adjustment recorded.');
  act(() => root.unmount()); el.remove();
});

test('signed out: shows the position from accounts and a sign-in prompt, without loading cloud records', async () => {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => root.render(<FinancialPlanning c={{ cloudMode: false, base: 'PHP', show: true, accountsView: accounts, toBase: (v) => v, go: jest.fn() }} />));
  expect(el.querySelector('.fp-hero').textContent).toContain('80,000.00');
  expect(el.textContent).toContain('Sign in to manage your financial records');
  expect(obligations.listLoans).not.toHaveBeenCalled();
  act(() => root.unmount()); el.remove();
});

test('credit card purchases appear in Loans & debts and saved plans appear in Goals & Plans', async () => {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  const c = {
    cloudMode: true, base: 'PHP', show: true,
    accountsView: [
      ...accounts,
      { id: 'credit-1', name: 'GoTyme Credit', institution_name: 'GoTyme', account_type: 'card', cardKind: 'credit', currency: 'PHP', balance: -12500, creditLimit: 50000 },
    ],
    plans: [{ id: 'plan-1', name: 'Emergency fund', target: 20000, saved: 5000, currency: 'PHP' }],
    toBase: value => value, go: jest.fn(), openBudgets: jest.fn(),
  };
  await act(async () => root.render(<FinancialPlanning c={c} />));
  await act(async () => Array.from(el.querySelectorAll('.chip-row button')).find(button => button.textContent.includes('Loans & debts')).click());
  expect(el.textContent).toContain('GoTyme');
  expect(el.textContent).toContain('12,500');
  await act(async () => Array.from(el.querySelectorAll('.chip-row button')).find(button => button.textContent.includes('Goals & Plans')).click());
  expect(el.textContent).toContain('Emergency fund');
  expect(el.textContent).toContain('20,000');
  act(() => root.unmount()); el.remove();
});


test('bank-account goal allocations stay linked to the selected bank account', async () => {
  const goal = { id: 'goal-bank', name: 'Emergency fund', target_amount: 10000, currency: 'PHP', status: 'active' };
  obligations.listGoals.mockResolvedValue([goal]);
  obligations.listGoalAllocations.mockResolvedValue([]);
  obligations.allocateToGoal.mockResolvedValue({ id: 'allocation-bank', goal_id: goal.id, account_id: 'bank', amount: 2500, currency: 'PHP', status: 'allocated' });
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => root.render(<FinancialPlanning c={{
    cloudMode: true, base: 'PHP', show: true, accountsView: accounts,
    toBase: value => value, go: jest.fn(), session: { user: { id: 'u' } },
  }} />));
  await act(async () => Array.from(el.querySelectorAll('.chip-row button')).find(button => button.textContent.includes('Goals & Plans')).click());
  await act(async () => Array.from(el.querySelectorAll('button')).find(button => button.textContent.includes('Allocate funds')).click());
  const dialog = document.querySelector('[role="dialog"]');
  const account = dialog.querySelector('select');
  expect(Array.from(account.options).some(option => option.value === 'bank')).toBe(true);
  expect(account.value).toBe('bank');
  const amount = dialog.querySelector('input[type="number"]');
  act(() => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(amount, '2500'); amount.dispatchEvent(new Event('input', { bubbles: true })); });
  await act(async () => dialog.querySelector('button.primary-button').click());
  expect(obligations.allocateToGoal).toHaveBeenCalledWith(expect.objectContaining({
    goal_id: 'goal-bank', account_id: 'bank', amount: '2500', currency: 'PHP',
  }));
  act(() => root.unmount()); el.remove();
});
