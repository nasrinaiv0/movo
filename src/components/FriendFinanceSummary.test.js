import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import FriendFinanceSummary, { FriendSummaryCards } from './FriendFinanceSummary';
import { friendsRequest } from '../lib/friends';
import { ConfirmProvider } from './ConfirmDialog';
jest.mock('../lib/friends', () => ({ ...jest.requireActual('../lib/friends'), friendsRequest: jest.fn() }));
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

test('historical month and current-value dates are attached to the approved sections', () => {
  const { container, close } = render({
    month: '2026-02', asOf: '2026-11-17', currency: 'PHP', note: 'I check my budget weekly.',
    sections: {
      income: 12500, savings: 0, flow: [200, -100, 0, 50, 0],
      planning: { bills: 450, debt: 0, owed: 0 },
      budgets: { budgets: 4, onTrack: 3, plans: 2, progress: 65 },
    },
  });
  expect(container.querySelector('time').getAttribute('datetime')).toBe('2026-02');
  expect(container.querySelector('.friend-section-income').textContent).toContain('12,500.00');
  expect(container.querySelector('.friend-section-income small')).toBeNull();
  expect(container.querySelector('.friend-section-savings small').textContent).toContain('Nov 17, 2026');
  expect(container.querySelector('.friend-section-planning small').textContent).toContain('Nov 17, 2026');
  expect(container.querySelector('.friend-section-budgets small').textContent).toContain('Nov 17, 2026');
  expect(container.querySelector('.friend-plan-progress').textContent).toContain('65%');
  expect(container.querySelector('.friend-flow-summary').textContent).toContain('150.00');
  expect(container.querySelectorAll('.friend-flow li')).toHaveLength(4);
  expect(container.querySelector('.friend-flow .negative')).not.toBeNull();
  expect(container.querySelector('.friend-note').nextElementSibling.className).toBe('friend-summary-grid');
  close();
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


async function mountSummary({ session, onClose, removed }) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container);
  const page = (auth, close) => <ConfirmProvider value={async () => true}><FriendFinanceSummary key={auth.user.id} session={auth}
    friend={{ id: 'connection', name: 'Synthetic friend' }} c={{}} finance={{}} onClose={close} onConnectionRemoved={removed} /></ConfirmProvider>;
  await act(async () => root.render(page(session, onClose)));
  return { container, switchOwner: async (auth, close) => { await act(async () => root.render(page(auth, close))); },
    close: () => { act(() => root.unmount()); container.remove(); } };
}

test('a late block response cannot navigate or clear a different account after the summary unmounts', async () => {
  let finishBlock;
  friendsRequest.mockImplementation(async (_session, action) => action === 'block' ? new Promise(resolve => { finishBlock = resolve; }) : { sharedWithYou: null });
  const oldClose = jest.fn(), newClose = jest.fn(), removed = jest.fn();
  const { container, switchOwner, close } = await mountSummary({ session: { user: { id: 'owner-a' }, access_token: 'a' }, onClose: oldClose, removed });
  await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === 'Block user').click());
  const signal = friendsRequest.mock.calls.find(call => call[1] === 'block')[3];
  await switchOwner({ user: { id: 'owner-b' }, access_token: 'b' }, newClose);
  expect(signal.aborted).toBe(true);
  await act(async () => finishBlock({ ok: true }));
  expect(oldClose).not.toHaveBeenCalled(); expect(newClose).not.toHaveBeenCalled(); expect(removed).not.toHaveBeenCalled(); close();
});

test('a confirmed block clears the current connection cache before leaving its summary', async () => {
  friendsRequest.mockImplementation(async (_session, action) => action === 'summary' ? { sharedWithYou: null } : { ok: true });
  const removed = jest.fn(), onClose = jest.fn();
  const { container, close } = await mountSummary({ session: { user: { id: 'owner-a' }, access_token: 'a' }, onClose, removed });
  await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === 'Block user').click());
  expect(removed).toHaveBeenCalledWith('connection'); expect(onClose).toHaveBeenCalledTimes(1);
  expect(removed.mock.invocationCallOrder[0]).toBeLessThan(onClose.mock.invocationCallOrder[0]); close();
});
