import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import FinancialPlanning from './FinancialPlanning';
import { ConfirmHost } from '../components/ConfirmDialog';
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



test('credit card planning fields stay grouped in a responsive card layout with readable stats', async () => {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  const credit = { id: 'credit-ui', name: 'AUB Credit', institution_name: 'Asia United Bank (AUB)', mask: '2556', account_type: 'card', cardKind: 'credit', currency: 'PHP', balance: -984 };
  await act(async () => root.render(<FinancialPlanning c={{
    cloudMode: true, base: 'PHP', show: true, accountsView: [...accounts, credit],
    prefs: { accountStyles: { 'credit-ui': { minimumDue: '0', statementBalance: '984', billingDay: '5', paymentDueDate: '2026-11-05' } } },
    toBase: value => value, go: jest.fn(),
  }} />));
  await act(async () => Array.from(el.querySelectorAll('.chip-row button')).find(button => button.textContent.includes('Credit cards')).click());
  const card = el.querySelector('.fp-credit-card');
  expect(card).not.toBeNull();
  expect(card.querySelector('.fp-credit-card-stats')).not.toBeNull();
  expect(card.querySelectorAll('.fp-credit-card-stats > span')).toHaveLength(3);
  expect(card.querySelectorAll('.fp-credit-card-stats > span > .movo-icon')).toHaveLength(3);
  expect(card.querySelector('.fp-stat-icon-calendar')).not.toBeNull();
  expect(card.querySelector('.fp-stat-icon-layers')).not.toBeNull();
  expect(card.querySelector('.fp-stat-icon-receipt')).not.toBeNull();
  const detailsToggle = card.querySelector('.fp-credit-card-toggle');
  expect(detailsToggle.getAttribute('aria-expanded')).toBe('false');
  expect(card.querySelector('.fp-credit-card-fields')).toBeNull();
  await act(async () => detailsToggle.click());
  expect(card.querySelector('.fp-credit-card-toggle').getAttribute('aria-expanded')).toBe('true');
  expect(card.querySelectorAll('.fp-credit-card-fields')).toHaveLength(2);
  expect(card.querySelectorAll('.fp-credit-card-fields input')).toHaveLength(5);
  expect(card.querySelector('.fp-credit-card-fields input[type="date"]')).not.toBeNull();
  expect(card.querySelector('.fp-credit-card-fields input[type="number"][min="1"]')).not.toBeNull();
  expect(card.querySelector('.fp-credit-card-actions').textContent).toContain('Record payment');
  expect(card.querySelectorAll('.fp-credit-card-actions button')).toHaveLength(2);
  expect(card.querySelector('.fp-credit-card-actions').textContent).toContain('Log credits');
  await act(async () => card.querySelector('.fp-credit-card-toggle').click());
  expect(card.querySelector('.fp-credit-card-fields')).toBeNull();
  await act(async () => card.querySelector('.fp-credit-card-toggle').click());
  expect(card.textContent).toContain('Credit spend limit');
  await act(async () => card.querySelector('.fp-credit-card-actions button:nth-child(2)').click());
  const logDialog = document.querySelector('[role="dialog"]');
  expect(logDialog.textContent).toContain('Merchant');
  expect(logDialog.textContent).toContain('Credit card used');
  expect(logDialog.textContent).toContain('Before interest amount');
  expect(logDialog.textContent).toContain('Annual interest rate (APR %)');
  expect(logDialog.textContent).toContain('Months to pay');
  expect(logDialog.textContent).toContain('After interest amount');
  expect(logDialog.textContent).toContain('Estimated monthly payment');
  expect(logDialog.querySelector('select').value).toBe('credit-ui');
  act(() => root.unmount()); el.remove();
});


test('credit spend history follows its source transaction and hides deleted or reversed entries', async () => {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  const card = { id: 'linked-card', name: 'Linked Card', account_type: 'card', cardKind: 'credit', currency: 'PHP', balance: -1000, creditLimit: 10000 };
  const prefs = { creditSpendLogs: { 'linked-card': [
    { id: 'log-live', transaction_id: 'tx-live', merchant: 'Live Merchant', amount: 100, annual_rate: 24, months: 3, date: '2026-11-01' },
    { id: 'log-deleted', transaction_id: 'tx-deleted', merchant: 'Deleted Merchant', amount: 200, annual_rate: 24, months: 3, date: '2026-11-02' },
    { id: 'log-legacy', merchant: 'Legacy Merchant', amount: 50, annual_rate: 0, months: 1, date: '2026-11-03' },
  ] } };
  const render = async (txs) => act(async () => root.render(<FinancialPlanning c={{
    cloudMode: true, base: 'PHP', show: true, accountsView: [...accounts, card], prefs, txs,
    toBase: value => value, go: jest.fn(),
  }} />));
  await render([{ id: 'tx-live', account_id: 'linked-card', type: 'expense', amount: 100, origAmount: 100, origCurrency: 'PHP' }]);
  await act(async () => Array.from(el.querySelectorAll('.chip-row button')).find(button => button.textContent.includes('Credit cards')).click());
  await act(async () => el.querySelector('.fp-credit-card-toggle').click());
  let history = el.querySelector('.fp-credit-spend-history');
  expect(history.textContent).toContain('Live Merchant');
  expect(history.textContent).toContain('Legacy Merchant');
  expect(history.textContent).not.toContain('Deleted Merchant');
  await render([]);
  history = el.querySelector('.fp-credit-spend-history');
  expect(history.textContent).not.toContain('Live Merchant');
  expect(history.textContent).not.toContain('Deleted Merchant');
  expect(history.textContent).toContain('Legacy Merchant');
  act(() => root.unmount()); el.remove();
});


test('credit card planning uses approved fallback and preserves spend, interest, utilization and post-payment balance', async () => {
  const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el);
  const card = { id: 'aub-card', name: 'AUB', institution_name: 'Asia United Bank (AUB)', mask: '2556', account_type: 'card', cardKind: 'credit', currency: 'PHP', balance: -10000, creditLimit: 50000 };
  await act(async () => root.render(<FinancialPlanning c={{ cloudMode: true, base: 'PHP', show: true, accountsView: [...accounts, card],
    txs: [{ id: 'tx-1', account_id: 'aub-card', type: 'expense', amount: 6000, origAmount: 6000, origCurrency: 'PHP' }], fx: { rates: { USD: 1, PHP: 58 } },
    prefs: { accountStyles: { 'aub-card': { annualInterestRate: '24' } }, creditCardPayments: { 'aub-card': [{ id: 'p-1', amount: 2000, month: '2026-11', date: '2026-11-05' }] } },
    toBase: value => value, go: jest.fn(),
  }} />));
  await act(async () => Array.from(el.querySelectorAll('.chip-row button')).find(button => button.textContent.includes('Credit cards')).click());
  const cardEl = el.querySelector('.fp-credit-card');
  expect(cardEl.querySelector('.fp-credit-card-logo')).toBeNull();
  expect(cardEl.querySelector('.stat-icon.tone-red svg')).not.toBeNull();
  expect(cardEl.textContent).toContain('Asia United Bank (AUB)');
  expect(cardEl.textContent).toContain('Amount Spent'); expect(cardEl.textContent).toContain('6,000.00');
  expect(cardEl.textContent).toContain('Amount After Interest'); expect(cardEl.textContent).toContain('8,160.00');
  expect(cardEl.textContent).toContain('12.0%'); expect(cardEl.textContent).toContain('8,000.00');
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

test('record card payment sheet shows the selected card available credit before saving', async () => {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  const card = { id: 'credit-payment', name: 'GoTyme Credit', institution_name: 'GoTyme', account_type: 'card', cardKind: 'credit', currency: 'PHP', balance: -12500, creditLimit: 50000 };
  await act(async () => root.render(<FinancialPlanning c={{
    cloudMode: true, base: 'PHP', show: true, accountsView: [...accounts, card], txs: [],
    prefs: { accountStyles: {}, creditCardPayments: {} }, toBase: value => value, go: jest.fn(),
  }} />));
  await act(async () => Array.from(el.querySelectorAll('.chip-row button')).find(button => button.textContent.includes('Credit cards')).click());
  const cardEl = el.querySelector('.fp-credit-card');
  expect(cardEl).not.toBeNull();
  await act(async () => cardEl.querySelector('.fp-credit-card-toggle').click());
  await act(async () => cardEl.querySelector('.fp-credit-card-actions button').click());
  const dialog = document.querySelector('[role="dialog"]');
  expect(dialog.querySelector('.acct-pick-availability').textContent).toContain('Available credit');
  expect(dialog.querySelector('.acct-pick-availability strong').textContent).toContain('37,500');
  act(() => root.unmount()); el.remove();
});

test('loan actions edit metadata and require confirmation before deletion', async () => {
  const el=document.createElement('div');document.body.appendChild(el);const root=createRoot(el);
  obligations.updateLoan.mockResolvedValue({});obligations.deleteLoan.mockResolvedValue({});
  const c={cloudMode:true,base:'PHP',show:true,accountsView:accounts,toBase:v=>v,go:jest.fn(),session:{user:{id:'u'}},refreshFinance:jest.fn(),notify:jest.fn()};
  await act(async()=>root.render(<ConfirmHost><FinancialPlanning c={c}/></ConfirmHost>));
  await act(async()=>Array.from(el.querySelectorAll('.fp-glance .fp-row')).find(b=>b.textContent.includes('Loans & debts')).click());
  expect(el.querySelector('.fp-loan-actions').textContent).toContain('PayEditDelete');
  await act(async()=>el.querySelectorAll('.fp-loan-actions button')[1].click());
  const form=document.querySelector('[role="dialog"] form');
  await act(async()=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  expect(obligations.updateLoan).toHaveBeenCalledWith('l1',expect.objectContaining({name:'Car loan'}),'u');
  await act(async()=>el.querySelectorAll('.fp-loan-actions button')[2].click());
  expect(obligations.deleteLoan).not.toHaveBeenCalled();
  const box=document.querySelector('.confirm-dialog');
  expect(box.querySelector('.confirm-title').textContent).toBe('Delete this record?');
  expect(box.querySelector('.confirm-name').textContent).toBe('Car loan');
  expect(box.textContent).toContain('Recorded payments and account balances will be kept');
  await act(async()=>box.querySelector('.confirm-accept').click());
  expect(obligations.deleteLoan).toHaveBeenCalledWith('l1','u');
  expect(c.notify).toHaveBeenCalledWith('Loan or debt deleted.');
  act(()=>root.unmount());el.remove();
});

test('a card payment records where the money came from (the card bank by default) so the total balance stays right', async () => {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  const credit = { id: 'credit-pay', name: 'AUB Credit', institution_name: 'AUB', account_type: 'card', cardKind: 'credit', currency: 'PHP', balance: -5000 };
  const recordCardPayment = jest.fn().mockResolvedValue({ id: 'payment' });
  await act(async () => root.render(<FinancialPlanning c={{
    cloudMode: true, base: 'PHP', show: true, accountsView: [...accounts, credit], recordCardPayment,
    prefs: { accountStyles: { 'credit-pay': { issuerBankId: 'bank' } } }, setPref: jest.fn(), toBase: value => value, go: jest.fn(),
  }} />));
  await act(async () => Array.from(el.querySelectorAll('.chip-row button')).find(button => button.textContent.includes('Credit cards')).click());
  if (!el.querySelector('.fp-credit-card-actions')) await act(async () => el.querySelector('.fp-credit-card-toggle').click());
  await act(async () => Array.from(el.querySelectorAll('.fp-credit-card-actions button')).find(b => b.textContent === 'Record payment').click());
  const dialog = document.querySelector('[role="dialog"]');
  const from = dialog.querySelector('#fp-card-payment-from');
  expect(from.value).toBe('bank');
  const amount = dialog.querySelector('input[type="number"]');
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(amount, '1500');
    amount.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => dialog.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(recordCardPayment).toHaveBeenCalledWith(expect.objectContaining({ cardId: 'credit-pay', amount: 1500, fromAccountId: 'bank' }));
  act(() => root.unmount()); el.remove();
});

test('while cloud records load, the position shows placeholders, never a provisional net worth', async () => {
  let release;
  obligations.listLoans.mockReturnValue(new Promise(resolve => { release = () => resolve([loan]); }));
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  const c = { cloudMode: true, base: 'PHP', show: true, accountsView: accounts, toBase: (v) => v, go: jest.fn(), refreshFinance: jest.fn(), notify: jest.fn(), session: { user: { id: 'u' } } };
  await act(async () => root.render(<FinancialPlanning c={c} />));
  const placeholder = el.querySelector('.skeleton');
  expect(placeholder.getAttribute('aria-busy')).toBe('true');
  // Before this change the hero showed ₱80,000.00 (accounts without the loan) until the loan arrived.
  expect(el.querySelector('.fp-hero').textContent).not.toMatch(/\d/);
  await act(async () => { release(); });
  expect(el.querySelector('.skeleton')).toBeNull();
  expect(el.querySelector('.fp-hero').textContent).toContain('20,000.00');
  act(() => root.unmount()); el.remove();
});
