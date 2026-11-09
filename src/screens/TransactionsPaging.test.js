import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Transactions from './Transactions';

/* Long histories render progressively (performance phase 7): a page of rows first, more as the end comes into view
   or on Show more; without IntersectionObserver every row renders as before. */
global.IS_REACT_ACT_ENVIRONMENT = true;
const refDate = new Date('2026-11-09T12:00:00+08:00');
const txs = Array.from({ length: 400 }, (_, i) => ({
  id: 't' + i, merchant: 'Shop ' + i, category: 'Food', amount: 10, type: 'expense', transaction_type: 'expense',
  date: new Date(refDate.getTime() - i * 60000).toISOString(), currency: 'PHP', accountName: 'BPI',
}));
const props = expanded => ({
  show: true, setShow: jest.fn(), txFilter: 'Expenses', setTxFilter: jest.fn(), month: '', setMonth: jest.fn(), months: ['2026-11'],
  sortKey: 'Date', setSortKey: jest.fn(), monthTxs: txs, txs, refDate, expanded, setExpanded: jest.fn(),
  monthStats: { expenses: 4000, income: 0, transfers: 0, transferCount: 0, incomeCount: 0, bars: [] }, breakdown: { data: [], total: 0 },
  deltas: {}, openTx: jest.fn(), openForm: jest.fn(), openSearch: jest.fn(), setSheet: jest.fn(), prefs: {},
});
let el; let root; let observers;
beforeEach(() => {
  observers = [];
  window.IntersectionObserver = class { constructor(cb) { this.cb = cb; observers.push(this); } observe() {} disconnect() { this.off = true; } };
  el = document.createElement('div'); document.body.appendChild(el); root = createRoot(el);
});
afterEach(() => { act(() => root.unmount()); el.remove(); delete window.IntersectionObserver; });
const rows = () => el.querySelectorAll('.tx-groups .tx-row').length;

test('renders 150 rows first, then the next page when the end of the list comes into view', async () => {
  await act(async () => root.render(<Transactions c={props(true)} />));
  expect(rows()).toBe(150);
  expect(el.querySelector('.tx-more button').textContent).toBe('Show more (250 left)');
  await act(async () => { observers.filter(o => !o.off).at(-1).cb([{ isIntersecting: true }]); });
  expect(rows()).toBe(300);
  await act(async () => { el.querySelector('.tx-more button').click(); });
  expect(rows()).toBe(400);
  expect(el.querySelector('.tx-more')).toBeNull();
});

test('without IntersectionObserver every row renders, as before', async () => {
  delete window.IntersectionObserver;
  await act(async () => root.render(<Transactions c={props(true)} />));
  expect(rows()).toBe(400);
  expect(el.querySelector('.tx-more')).toBeNull();
});
