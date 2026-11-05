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
  obligations.listPlanAllocations.mockResolvedValue([]);
  obligations.allocatePlanFunds.mockResolvedValue({ id: 'plan-allocation-1' });
  obligations.releasePlanFundingAllocation.mockResolvedValue({});
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


test('saved plans can reserve funds from an eligible account and update saved progress', async () => {
  const plan = { id: 'plan-trip', name: 'Japan Trip', target: 5000, saved: 1000, currency: 'PHP' };
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  obligations.allocatePlanFunds.mockImplementation(async input => {
    obligations.listPlanAllocations.mockResolvedValue([{
      id: 'plan-allocation-1', plan_id: input.plan_id, account_id: input.account_id,
      account_type: 'bank', amount: input.amount, currency: input.currency, status: 'allocated',
    }]);
    return { id: 'plan-allocation-1' };
  });
  await act(async () => root.render(<FinancialPlanning c={{
    cloudMode: true, base: 'PHP', show: true, accountsView: accounts,
    plans: [plan], prefs: { plans: [plan] },
    toBase: value => value, go: jest.fn(), session: { user: { id: 'u' } },
  }} />));
  await act(async () => Array.from(el.querySelectorAll('.chip-row button')).find(button => button.textContent.includes('Goals & Plans')).click());
  expect(el.textContent).toContain('Japan Trip');
  expect(el.querySelector('.fp-goal').textContent).toContain('4,000.00 remaining');
  await act(async () => Array.from(el.querySelectorAll('.fp-goal button')).find(button => button.textContent.includes('Allocate funds')).click());
  const dialog = document.querySelector('[role="dialog"]');
  expect(dialog.textContent).toContain('Japan Trip');
  const account = dialog.querySelector('select');
  expect(account.value).toBe('bank');
  const amount = dialog.querySelector('input[type="number"]');
  act(() => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(amount, '2500'); amount.dispatchEvent(new Event('input', { bubbles: true })); });
  await act(async () => dialog.querySelector('button.primary-button').click());
  expect(obligations.allocatePlanFunds).toHaveBeenCalledWith(expect.objectContaining({
    plan_id: 'plan-trip', plan_name: 'Japan Trip', account_id: 'bank', amount: 2500, currency: 'PHP',
  }));
  expect(el.querySelector('.fp-goal').textContent).toContain('3,500.00');
  expect(el.textContent).toContain('Plan allocation recorded.');
  act(() => root.unmount()); el.remove();
});

test('plan allocation cannot exceed remaining target or unreserved account balance', async () => {
  const plan = { id: 'plan-trip', name: 'Japan Trip', target: 5000, saved: 4500, currency: 'PHP' };
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => root.render(<FinancialPlanning c={{
    cloudMode: true, base: 'PHP', show: true, accountsView: accounts,
    plans: [plan], prefs: { plans: [plan] },
    toBase: value => value, go: jest.fn(), session: { user: { id: 'u' } },
  }} />));
  await act(async () => Array.from(el.querySelectorAll('.chip-row button')).find(button => button.textContent.includes('Goals & Plans')).click());
  await act(async () => Array.from(el.querySelectorAll('.fp-goal button')).find(button => button.textContent.includes('Allocate funds')).click());
  const dialog = document.querySelector('[role="dialog"]');
  const amount = dialog.querySelector('input[type="number"]');
  act(() => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(amount, '600'); amount.dispatchEvent(new Event('input', { bubbles: true })); });
  await act(async () => dialog.querySelector('button.primary-button').click());
  expect(obligations.allocatePlanFunds).not.toHaveBeenCalled();
  expect(dialog.textContent).toContain('Allocation cannot exceed the remaining plan amount.');
  act(() => root.unmount()); el.remove();
});

test('plan funding respects the account balance after existing goal and plan reservations', async () => {
  const plan = { id: 'plan-trip', name: 'Japan Trip', target: 20000, saved: 1000, currency: 'PHP' };
  obligations.listPlanAllocations.mockResolvedValue([{
    id: 'prior', plan_id: 'plan-trip', account_id: 'bank', amount: 9000, currency: 'PHP', status: 'allocated',
  }]);
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => root.render(<FinancialPlanning c={{
    cloudMode: true, base: 'PHP', show: true,
    accountsView: [{ id: 'bank', name: 'BPI Savings', account_type: 'bank', currency: 'PHP', balance: 10000 }],
    plans: [plan], prefs: { plans: [plan] },
    toBase: value => value, go: jest.fn(), session: { user: { id: 'u' } },
  }} />));
  await act(async () => Array.from(el.querySelectorAll('.chip-row button')).find(button => button.textContent.includes('Goals & Plans')).click());
  await act(async () => Array.from(el.querySelectorAll('.fp-goal button')).find(button => button.textContent.includes('Allocate funds')).click());
  const dialog = document.querySelector('[role="dialog"]');
  const amount = dialog.querySelector('input[type="number"]');
  act(() => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(amount, '2000'); amount.dispatchEvent(new Event('input', { bubbles: true })); });
  await act(async () => dialog.querySelector('button.primary-button').click());
  expect(obligations.allocatePlanFunds).not.toHaveBeenCalled();
  expect(dialog.textContent).toContain('Allocation exceeds the unreserved account balance.');
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


test('plan allocations show their source account, can be released, and offer bank and e-wallet choices', async () => {
  const plan = { id: 'plan-trip', name: 'Japan Trip', target: 5000, saved: 1500, currency: 'PHP' };
  obligations.listPlanAllocations.mockResolvedValue([{
    id: 'allocation-wallet', plan_id: 'plan-trip', account_id: 'wallet', amount: 500, currency: 'PHP', status: 'allocated',
  }]);
  obligations.releasePlanFundingAllocation.mockImplementation(async () => {
    obligations.listPlanAllocations.mockResolvedValue([]);
    return {};
  });
  const accountsView = [
    { id: 'bank', name: 'BPI Savings', institution_name: 'BPI', account_type: 'bank', currency: 'PHP', balance: 10000 },
    { id: 'wallet', name: 'GCash Wallet', institution_name: 'GCash', account_type: 'e_wallet', currency: 'PHP', balance: 5000 },
  ];
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => root.render(<FinancialPlanning c={{
    cloudMode: true, base: 'PHP', show: true, accountsView,
    plans: [plan], prefs: { plans: [plan] },
    toBase: value => value, go: jest.fn(), session: { user: { id: 'u' } },
  }} />));
  await act(async () => Array.from(el.querySelectorAll('.chip-row button')).find(button => button.textContent.includes('Goals & Plans')).click());
  expect(el.querySelector('.fp-plan-funding').textContent).toContain('GCash Wallet');
  expect(el.querySelector('.fp-plan-funding').textContent).toContain('500.00');
  await act(async () => el.querySelector('.fp-plan-funding button.link-button').click());
  expect(obligations.releasePlanFundingAllocation).toHaveBeenCalledWith('allocation-wallet');
  await act(async () => Array.from(el.querySelectorAll('.fp-goal button')).find(button => button.textContent.includes('Allocate funds')).click());
  const dialog = document.querySelector('[role="dialog"]');
  const account = dialog.querySelector('select');
  expect(Array.from(account.options).map(option => option.value)).toEqual(expect.arrayContaining(['bank', 'wallet']));
  expect(dialog.textContent).toContain('Choose a bank account or e-wallet');
  act(() => root.unmount()); el.remove();
});
