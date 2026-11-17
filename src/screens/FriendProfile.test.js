import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import FriendProfile from './FriendProfile';
import { friendsRequest } from '../lib/friends';

jest.mock('../lib/friends', () => ({ ...jest.requireActual('../lib/friends'), friendsRequest: jest.fn() }));
global.IS_REACT_ACT_ENVIRONMENT = true;

const finance = { months: ['2026-11'], currency: 'PHP', statsFor: () => ({ income: 1000, expenses: 600 }), breakdownFor: () => ({ data: [{ key: 'Food', percent: 100, amount: 600 }] }) };
const friend = { id: '2ddc22e5-f113-4a9b-977f-d7b8cdf09f41', name: 'Mika' };

let el; let root;
const mount = async (extra = {}) => {
  const c = { friendPage: friend, session: { access_token: 'test' }, friendFinance: finance, goBack: jest.fn(), openFriends: jest.fn(), notify: jest.fn(), ...extra };
  el = document.createElement('div'); document.body.appendChild(el); root = createRoot(el);
  await act(async () => root.render(<FriendProfile c={c} />));
  return c;
};
const button = name => [...el.querySelectorAll('button')].find(b => b.textContent.trim() === name || b.getAttribute('aria-label') === name);
afterEach(() => { act(() => root.unmount()); el.remove(); jest.restoreAllMocks(); friendsRequest.mockReset(); });

test('a friend’s page shows their name and everything they shared, with charts, without status chips', async () => {
  friendsRequest.mockResolvedValue({ yourShare: true, sharedWithYou: { month: '2026-11', sharedAt: '2026-11-16T09:00:00Z', savingsRate: 18,
    totals: { income: 1000, expenses: 820, currency: 'PHP' }, categories: [{ key: 'Food', percent: 60 }, { key: 'Bills', percent: 40 }], note: 'Cook at home.' } });
  await mount();
  expect(el.querySelector('.fp-hero h2').textContent).toBe('Mika');
  expect(el.querySelector('.fp-hero ul, .fp-status')).toBeNull(); // no sharing-status chips under the name (owner, 2026-11-17)
  expect(el.textContent).toContain('Sharing'); // what you share is still shown, on its own section
  const card = el.querySelector('[aria-label="Summary from Mika"]');
  expect(card.querySelector('.fs-donut')).not.toBeNull();
  expect(card.querySelector('.fs-ring')).not.toBeNull();
  expect(card.textContent).toContain('Saved 18% of income');
  expect(card.textContent).toContain('Cook at home.');
  expect(el.querySelector('.fs-back')).toBeNull(); // the page header has its own back button
});

test('back returns to the Friends list; removing the friend confirms first, then leaves the page', async () => {
  friendsRequest.mockResolvedValueOnce({ yourShare: false, sharedWithYou: null }).mockResolvedValueOnce({ ok: true });
  const c = await mount();
  expect(el.textContent).toContain('Mika hasn’t shared a summary with you yet.');
  await act(async () => { button('Back').click(); });
  expect(c.goBack).toHaveBeenCalledWith('Menu');
  expect(c.openFriends).toHaveBeenCalled();
  const ask = jest.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  await act(async () => { button('Remove friend').click(); });
  expect(friendsRequest).not.toHaveBeenCalledWith(expect.anything(), 'remove', expect.anything());
  await act(async () => { button('Remove friend').click(); });
  expect(ask).toHaveBeenCalledTimes(2);
  expect(friendsRequest).toHaveBeenCalledWith({ access_token: 'test' }, 'remove', { connectionId: friend.id });
  expect(c.notify).toHaveBeenCalledWith('Friend removed.');
  expect(c.openFriends).toHaveBeenCalledTimes(2);
});

test('without a friend to show it says so instead of an empty page', async () => {
  await mount({ friendPage: null });
  expect(el.textContent).toContain('This friend connection is no longer available.');
});
