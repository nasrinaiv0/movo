import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { FriendSummaryCards } from './FriendFinanceSummary';
import { buildFriendSummary } from '../lib/friendSummary';

global.IS_REACT_ACT_ENVIRONMENT = true;

function render(snapshot) {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(<FriendSummaryCards snapshot={snapshot} />));
  return { container, close: () => act(() => root.unmount()) };
}

test('only selected sections render, zero is visible and old snapshots still open', () => {
  const shared = render({ month: '2026-11', currency: 'PHP', sections: { income: 0, flow: [100, -20, 0, 0, 0] } });
  expect(shared.container.querySelector('.friend-section-income').textContent).toContain('0.00');
  expect(shared.container.querySelector('.friend-section-expenses')).toBeNull();
  expect(shared.container.querySelector('.friend-section-savings')).toBeNull();
  expect(shared.container.querySelectorAll('.friend-flow li')).toHaveLength(5);
  shared.close();
  const legacy = render({ month: '2026-02', note: 'Test note', totals: { currency: 'PHP', income: 20, expenses: 11 }, categories: [{ key: 'Food', percent: 100 }] });
  expect(legacy.container.querySelector('.friend-section-expenses').textContent).toContain('11.00');
  expect(legacy.container.querySelector('.friend-section-spending').textContent).toContain('100%');
  legacy.close();
});

test('weekly flow and current figures exclude transfers and raw ledger fields', () => {
  const payment = { date: '2026-10-02T12:00:00Z', merchant: 'Private', type: 'expense', amount: 8 };
  const snapshot = buildFriendSummary({
    c: { stats: { savings: 78 } }, planning: { loaded: false, summary: {} },
    finance: { currency: 'PHP', budgets: [], statsFor: month => ({ list: month === '2026-10' ? [payment, { ...payment, type: 'transfer', amount: 50 }] : [], income: 17, expenses: 8 }), breakdownFor: () => ({ data: [] }) },
    month: '2026-10', today: new Date('2026-11-17T12:00:00Z'), selected: ['savings', 'flow', 'planning'], note: '',
  });
  expect(snapshot).toEqual({ month: '2026-10', currency: 'PHP', asOf: '2026-11-17', sections: { savings: 78, flow: [-8, 0, 0, 0, 0] } });
});
