import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import BillsPanel from './BillsPanel';
import FinancialPlanning from '../screens/FinancialPlanning';
import * as obligations from '../lib/obligationsRepository';
import * as bills from '../lib/billsRepository';

jest.mock('../lib/obligationsRepository');
jest.mock('../lib/billsRepository');
global.IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  obligations.listLoans.mockResolvedValue([]);
  obligations.listReceivables.mockResolvedValue([]);
  obligations.listGoals.mockResolvedValue([]);
  obligations.listGoalAllocations.mockResolvedValue([]);
  obligations.listPlanAllocations.mockResolvedValue([]);
  bills.listBills.mockResolvedValue([]);
  bills.listOccurrences.mockResolvedValue([]);
  bills.listBillPayments.mockResolvedValue([]);
});

async function mount(element) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(element));
  return { host, close: () => { act(() => root.unmount()); host.remove(); } };
}

test.each([
  [2000, 'focused'],
  [5000, 'celebrate'],
])('Aries follows recorded plan funding of %s toward a 5000 target', async (saved, state) => {
  const { host, close } = await mount(<FinancialPlanning c={{
    cloudMode: true, base: 'PHP', show: true, accountsView: [], planTab: 'goals',
    plans: [{ id: 'trip', name: 'Trip', target: 5000, saved, currency: 'PHP' }],
    toBase: value => value, go: jest.fn(),
  }} />);
  try {
    expect(host.querySelector(`.aries-goal-companion.aries--${state}`)).not.toBeNull();
    expect(host.querySelector('.fp-goal').textContent).toContain('Trip');
  } finally { close(); }
});

test('a released goal allocation does not cause a celebration', async () => {
  obligations.listGoals.mockResolvedValue([{ id: 'goal', name: 'Reserve', target_amount: 5000, currency: 'PHP', status: 'active' }]);
  obligations.listGoalAllocations.mockResolvedValue([
    { id: 'live', goal_id: 'goal', amount: 2000, currency: 'PHP', status: 'allocated' },
    { id: 'old', goal_id: 'goal', amount: 5000, currency: 'PHP', status: 'released' },
  ]);
  const { host, close } = await mount(<FinancialPlanning c={{
    cloudMode: true, base: 'PHP', show: true, accountsView: [], planTab: 'goals',
    toBase: value => value, go: jest.fn(),
  }} />);
  try {
    expect(host.querySelector('.aries-goal-companion.aries--focused')).not.toBeNull();
    expect(host.querySelector('.aries--celebrate')).toBeNull();
    expect(host.querySelector('.fp-goal').textContent).toContain('40%');
  } finally { close(); }
});

test('empty goals have a welcoming companion and still open creation', async () => {
  const { host, close } = await mount(<FinancialPlanning c={{
    cloudMode: true, base: 'PHP', show: true, accountsView: [], planTab: 'goals',
    toBase: value => value, go: jest.fn(),
  }} />);
  try {
    expect(host.querySelector('.aries-goals-empty .aries--welcome')).not.toBeNull();
    await act(async () => host.querySelector('.aries-goals-empty').click());
    expect(document.querySelector('[role="dialog"]').textContent).toContain('Create a savings goal');
  } finally { close(); }
});

test('a bill due today shows the reminder expression and an empty loaded cycle shows happy', async () => {
  const occurrence = {
    id: 'due', bill_id: 'electricity', due_date: new Date().toLocaleDateString('en-CA'),
    expected_amount: 500, paid_amount: 0, late_fee: 0, currency: 'PHP', status: 'scheduled',
  };
  bills.listBills.mockResolvedValue([{ id: 'electricity', name: 'Electricity', currency: 'PHP' }]);
  bills.listOccurrences.mockResolvedValue([occurrence]);
  const due = await mount(<BillsPanel c={{ base: 'PHP' }} accounts={[]} />);
  try { expect(due.host.querySelector('.aries-bills-companion.aries--reminder')).not.toBeNull(); }
  finally { due.close(); }
  bills.listOccurrences.mockResolvedValue([]);
  const empty = await mount(<BillsPanel c={{ base: 'PHP' }} accounts={[]} />);
  try { expect(empty.host.querySelector('.aries-bills-companion.aries--happy')).not.toBeNull(); }
  finally { empty.close(); }
});

test('a failed bill load does not show an all-clear happy expression', async () => {
  bills.listBills.mockRejectedValue(new Error('Unavailable'));
  const { host, close } = await mount(<BillsPanel c={{ base: 'PHP' }} accounts={[]} />);
  try {
    expect(host.querySelector('[role="alert"]').textContent).toBe('Unavailable');
    expect(host.querySelector('.aries-bills-companion.aries--thinking')).not.toBeNull();
    expect(host.querySelector('.aries--happy')).toBeNull();
  } finally { close(); }
});
