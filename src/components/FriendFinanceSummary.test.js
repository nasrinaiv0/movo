import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import FriendFinanceSummary, { buildFriendSummary, monthLabel, savingsRate, NOTE_LIMIT } from './FriendFinanceSummary';
import { friendsRequest } from '../lib/friends';

jest.mock('../lib/friends', () => ({ ...jest.requireActual('../lib/friends'), friendsRequest: jest.fn() }));
global.IS_REACT_ACT_ENVIRONMENT = true;

const STATS = { '2026-11': { income: 50000, expenses: 38500.456 }, '2026-10': { income: 0, expenses: 1200 } };
const BREAKDOWN = { '2026-11': [{ key: 'Food', percent: 20, amount: 7700 }, { key: 'Bills', percent: 55, amount: 21175 }, { key: 'Others', percent: 25, amount: 9625 }], '2026-10': [] };
const finance = {
  months: ['2026-11', '2026-10'], currency: 'PHP',
  statsFor: key => STATS[key] || { income: 0, expenses: 0 },
  breakdownFor: key => ({ data: BREAKDOWN[key] || [] }),
};
const friend = { id: '2ddc22e5-f113-4a9b-977f-d7b8cdf09f41', name: 'Mika' };
const session = { access_token: 'test' };

describe('the snapshot that would be shared', () => {
  test('contains only what was switched on, never amounts unless totals are chosen', () => {
    expect(buildFriendSummary({ month: '2026-11' }, finance)).toBeNull();
    expect(buildFriendSummary({ month: '2026-11', note: '   ' }, finance)).toBeNull();
    const cats = buildFriendSummary({ month: '2026-11', include: { categories: true } }, finance);
    // Largest first, percentages only: the amounts behind them never leave the device.
    expect(cats).toEqual({ month: '2026-11', categories: [{ key: 'Bills', percent: 55 }, { key: 'Others', percent: 25 }, { key: 'Food', percent: 20 }] });
    expect(JSON.stringify(cats)).not.toMatch(/amount|7700|50000/);
    expect(buildFriendSummary({ month: '2026-11', include: { savings: true } }, finance)).toEqual({ month: '2026-11', savingsRate: 23 });
    expect(buildFriendSummary({ month: '2026-11', note: ' Weekly review ', include: { totals: true } }, finance))
      .toEqual({ month: '2026-11', note: 'Weekly review', totals: { income: 50000, expenses: 38500.46, currency: 'PHP' } });
    // A month with no income and no spending has nothing to share for those switches.
    expect(buildFriendSummary({ month: '2026-10', include: { savings: true, categories: true } }, finance)).toBeNull();
  });

  test('savings rate is a whole percent from -100 to 100, and absent without income', () => {
    expect(savingsRate(1000, 750)).toBe(25);
    expect(savingsRate(1000, 1120)).toBe(-12);
    expect(savingsRate(1000, 99999)).toBe(-100);
    expect(savingsRate(0, 10)).toBeNull();
    expect(savingsRate(500, NaN)).toBeNull();
  });

  test('months read as words, not codes', () => {
    expect(monthLabel('2026-11')).toBe('November 2026');
    expect(monthLabel('bad')).toBe('bad');
  });
});

describe('the summary screen', () => {
  let el; let root;
  const mount = async (props = {}) => {
    el = document.createElement('div'); document.body.appendChild(el); root = createRoot(el);
    const run = jest.fn((action, payload, done) => done({ ok: true }));
    const onSafety = jest.fn();
    await act(async () => root.render(<FriendFinanceSummary friend={friend} session={session} finance={finance} run={run} busy={false}
      onClose={() => {}} onSafety={onSafety} errorMessage={() => 'Friends are unavailable right now. Try again.'} {...props} />));
    return { run, onSafety };
  };
  const button = name => [...el.querySelectorAll('button')].find(b => b.textContent.trim() === name || b.getAttribute('aria-label') === name);
  const tap = async node => act(async () => { node.click(); });
  afterEach(() => { act(() => root.unmount()); el.remove(); jest.restoreAllMocks(); friendsRequest.mockReset(); });

  test('shows what the friend shared as a readable card', async () => {
    friendsRequest.mockResolvedValue({ yourShare: false, sharedWithYou: { month: '2026-11', sharedAt: '2026-11-16T09:00:00Z', savingsRate: 18,
      totals: { income: 1000, expenses: 1100, currency: 'PHP' }, categories: [{ key: 'Food', percent: 60 }], note: 'Cook at home.' } });
    await mount();
    const card = el.querySelector('[aria-label="Summary from Mika"]');
    expect(card.textContent).toContain('November 2026');
    expect(card.textContent).toContain('Shared Nov 16, 2026');
    expect(card.textContent).toContain('Saved 18% of income');
    expect(card.querySelector('.fs-totals .is-negative').textContent).toContain('100');
    expect(card.textContent).toContain('Food');
    expect(card.textContent).toContain('Cook at home.');
  });

  test('says plainly when nothing was shared, and previews exactly what will be sent before one explicit share', async () => {
    friendsRequest.mockResolvedValue({ yourShare: false, sharedWithYou: null });
    const { run } = await mount();
    expect(el.textContent).toContain('Mika hasn’t shared a summary with you yet.');
    expect(el.textContent).toContain('Not shared');
    expect(button('Share with Mika').disabled).toBe(true); // nothing chosen yet
    await tap(el.querySelector('[role="switch"][aria-label="Spending by category"]'));
    await tap(el.querySelector('[role="switch"][aria-label="Savings rate"]'));
    const preview = el.querySelector('[aria-label="Preview for Mika"]');
    expect(preview.textContent).toContain('Bills');
    expect(preview.textContent).toContain('Saved 23% of income');
    expect(preview.textContent).not.toContain('50,000');
    expect(run).not.toHaveBeenCalled();
    await tap(button('Share with Mika'));
    expect(run).toHaveBeenCalledWith('share_summary', { connectionId: friend.id, summary: {
      month: '2026-11', categories: [{ key: 'Bills', percent: 55 }, { key: 'Others', percent: 25 }, { key: 'Food', percent: 20 }], savingsRate: 23 } }, expect.any(Function));
    expect(el.textContent).toContain('Summary shared with Mika.');
  });

  test('switches for data the month does not have are off, and the note shows how much room is left', async () => {
    friendsRequest.mockResolvedValue({ yourShare: false, sharedWithYou: null });
    await mount();
    const select = el.querySelector('select');
    expect([...select.options].map(o => o.textContent)).toEqual(['November 2026', 'October 2026']);
    await act(async () => { select.value = '2026-10'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(el.querySelector('[role="switch"][aria-label="Savings rate"]').disabled).toBe(true);
    expect(el.querySelector('[role="switch"][aria-label="Spending by category"]').disabled).toBe(true);
    expect(el.textContent).toContain(`0 of ${NOTE_LIMIT}`);
  });

  test('an existing share can be updated, or stopped after confirming', async () => {
    friendsRequest.mockResolvedValue({ yourShare: true, sharedWithYou: null });
    const { run, onSafety } = await mount();
    expect(el.textContent).toContain('Sharing');
    await tap(el.querySelector('[role="switch"][aria-label="Income and expense totals"]'));
    expect(button('Update summary for Mika')).toBeDefined();
    const ask = jest.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    await tap(button('Stop sharing'));
    expect(run).not.toHaveBeenCalledWith('revoke_summary', expect.anything(), expect.anything());
    await tap(button('Stop sharing'));
    expect(ask).toHaveBeenCalledTimes(2);
    expect(run).toHaveBeenCalledWith('revoke_summary', { connectionId: friend.id }, expect.any(Function));
    expect(el.textContent).toContain('Mika can no longer see your summary.');
    await tap(button('Block user'));
    expect(onSafety).toHaveBeenCalledWith('block', { connectionId: friend.id });
  });
});
