import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import BillsPanel from './BillsPanel';
import * as repo from '../lib/billsRepository';

jest.mock('../lib/billsRepository');
global.IS_REACT_ACT_ENVIRONMENT = true;

const today = new Date().toLocaleDateString('en-CA');
const bill = { id: 'b1', name: 'Electricity', category: 'Utilities', amount: 2500, amount_type: 'variable', currency: 'PHP', frequency: 'monthly', status: 'active', account_id: 'acc1', reminder_days: [3, 1, 0] };
const occ = { id: 'o1', bill_id: 'b1', due_date: today, expected_amount: 2500, actual_amount: null, late_fee: 0, paid_amount: 0, currency: 'PHP', status: 'scheduled', is_estimate: true };

beforeEach(() => {
  repo.listBills.mockResolvedValue([bill]);
  repo.listOccurrences.mockResolvedValue([occ]);
  repo.listBillPayments.mockResolvedValue([]);
  repo.updateOccurrence.mockResolvedValue({});
});

test('pay a variable bill: sets the actual amount, records once per attempt with the same key on retry, refreshes the ledger', async () => {
  const app = document.createElement('div'); document.body.appendChild(app);
  const root = createRoot(app); const onChanged = jest.fn();
  repo.recordBillPayment.mockRejectedValueOnce(new Error('Network error')).mockResolvedValueOnce({ id: 'p1' });
  await act(async () => root.render(<BillsPanel c={{ base: 'PHP', session: { user: { id: 'u' } } }} accounts={[{ id: 'acc1', name: 'BPI', currency: 'PHP' }, { id: 'usd', name: 'USD', currency: 'USD' }]} onChanged={onChanged} />));
  expect(app.textContent).toContain('Electricity');
  expect(app.textContent).toContain('Due today');
  const button = (label) => Array.from(app.querySelectorAll('button')).find(b => b.textContent === label);
  await act(async () => button('Log payment').click());
  const select = app.querySelector('.bill-pay select');
  expect(Array.from(select.options).map(o => o.value)).toEqual(['', 'acc1']); // only same-currency accounts
  const actual = app.querySelector('.bill-pay input[type="number"]');
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(actual, '2800'); actual.dispatchEvent(new Event('input', { bubbles: true })); });
  await act(async () => button('Record payment').click());
  expect(app.querySelector('[role="alert"]').textContent).toBe('Network error');
  await act(async () => button('Record payment').click());
  expect(repo.updateOccurrence).toHaveBeenCalledWith('o1', { actual_amount: 2800 });
  const [first, second] = repo.recordBillPayment.mock.calls.map(c => c[0]);
  expect(first).toEqual(expect.objectContaining({ occurrence_id: 'o1', amount: 2800, method: 'recorded', account_id: 'acc1' }));
  expect(second.key).toBe(first.key);
  expect(onChanged).toHaveBeenCalledTimes(1);
  act(() => root.unmount()); app.remove();
});

test('paid elsewhere reconciles without an account', async () => {
  const app = document.createElement('div'); document.body.appendChild(app);
  const root = createRoot(app);
  repo.recordBillPayment.mockResolvedValue({ id: 'p2' });
  await act(async () => root.render(<BillsPanel c={{ base: 'PHP' }} accounts={[{ id: 'acc1', name: 'BPI', currency: 'PHP' }]} />));
  await act(async () => Array.from(app.querySelectorAll('button')).find(b => b.textContent === 'Log payment').click());
  await act(async () => Array.from(app.querySelectorAll('button')).find(b => b.textContent === 'Paid elsewhere').click());
  expect(repo.recordBillPayment).toHaveBeenLastCalledWith(expect.objectContaining({ method: 'external', account_id: null }));
  expect(app.textContent).toContain('No account was charged');
  act(() => root.unmount()); app.remove();
});

test('subscription renewals appear in Bills Due and route payment logging through the existing subscription flow', async () => {
  const app = document.createElement('div'); document.body.appendChild(app);
  const root = createRoot(app); const onLogSubscription = jest.fn();
  const start = new Date().toLocaleDateString('en-CA');
  const subscription = { id: 'sub-1', name: 'Music Plus', amount: 299, currency: 'PHP', cycle: 'monthly', start, status: 'active' };
  await act(async () => root.render(<BillsPanel
    c={{ base: 'PHP', toBase: value => value }}
    accounts={[]}
    subscriptions={[subscription]}
    onLogSubscription={onLogSubscription}
  />));
  expect(app.textContent).toContain('Music Plus');
  expect(app.textContent).toContain('Subscription');
  await act(async () => Array.from(app.querySelectorAll('.bill-row')).find(row => row.textContent.includes('Music Plus')).querySelector('button.primary-button').click());
  expect(onLogSubscription).toHaveBeenCalledWith(subscription);
  act(() => root.unmount()); app.remove();
});



test('upcoming and overdue use compact bill rows with aligned amounts and working payment/skip actions', async () => {
  const app = document.createElement('div');
  document.body.appendChild(app);
  const root = createRoot(app);
  try {
    await act(async () => root.render(
      <BillsPanel
        c={{ base:'PHP', session:{user:{id:'u'}} }}
        accounts={[{id:'acc1',name:'BPI',currency:'PHP'}]}
      />
    ));
    const section=app.querySelector('section[aria-label="Upcoming and overdue bills"]');
    expect(section).not.toBeNull();
    const row=section.querySelector('.bill-row-compact');
    expect(row).not.toBeNull();
    expect(row.querySelector('.bill-row-copy strong').textContent).toBe('Electricity');
    expect(row.querySelector('.bill-row-amount')).not.toBeNull();
    expect(row.querySelector('.bill-row-meta').textContent).toContain('Due');
    expect(row.querySelector('.bill-state')).not.toBeNull();
    expect(row.querySelectorAll('.bill-actions button')).toHaveLength(2);
    expect(row.querySelector('.bill-log-action').textContent).toBe('Log payment');
    expect(row.querySelector('.bill-skip-action').textContent).toBe('Skip this one');
    await act(async () => row.querySelector('.bill-log-action').click());
    expect(app.querySelector('.bill-pay')).not.toBeNull();
  } finally {
    act(() => root.unmount());
    app.remove();
  }
});

test('split payment can be submitted without a default account and is disabled while a split is incomplete', async () => {
  repo.listBills.mockResolvedValue([{ ...bill, account_id: '' }]);
  repo.listOccurrences.mockResolvedValue([{ ...occ, is_estimate: false }]);
  repo.recordBillPayment.mockResolvedValue({ id: 'split-payment' });
  const app = document.createElement('div'); document.body.appendChild(app);
  const root = createRoot(app);
  const button = label => [...app.querySelectorAll('button')].find(b => b.textContent === label);
  try {
    await act(async () => root.render(<BillsPanel c={{ base: 'PHP', show: true }} accounts={[{ id: 'acc1', name: 'Cash', account_type: 'cash', currency: 'PHP', balance: 5000 }]} />));
    await act(async () => button('Log payment').click());
    await act(async () => app.querySelector('.bill-split-toggle input').click());
    expect(button('Record payment').disabled).toBe(true);
    await act(async () => {
      const select = app.querySelector('.bill-split-account select');
      select.value = 'acc1'; select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(button('Record payment').disabled).toBe(false);
    await act(async () => button('Add another account').click());
    expect(button('Record payment').disabled).toBe(true);
    await act(async () => [...app.querySelectorAll('.bill-split-remove')][1].click());
    expect(button('Record payment').disabled).toBe(false);
    await act(async () => button('Record payment').click());
    expect(repo.recordBillPayment).toHaveBeenLastCalledWith(expect.objectContaining({ account_id: 'acc1', amount: 2500, method: 'recorded' }));
  } finally { act(() => root.unmount()); app.remove(); }
});
