import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Profile from './Profile';

global.IS_REACT_ACT_ENVIRONMENT = true;

const makeContext = (over = {}) => ({
  show: true, stats: { balance: 0, income: 0, expenses: 0 }, deltas: {},
  user: { name: 'Friend', email: 'Local-only session', initial: 'F' },
  accountsByType: { bank: [], card: [], e_wallet: [] },
  go: jest.fn(), notify: jest.fn(), session: null, signOutNow: jest.fn(), exportCsv: jest.fn(),
  prefs: { theme: 'system', accent: 'green' }, setPref: jest.fn(),
  cloudMode: false, supabaseConfigured: true, ...over,
});

function render(c) {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  act(() => root.render(<Profile c={c} />));
  return { el, root };
}

test('a signed-out person gets a Sign in button in the profile card', () => {
  const c = makeContext();
  const { el, root } = render(c);
  const btn = el.querySelector('.profile-card-wrap .profile-signin');
  expect(btn).not.toBeNull();
  expect(el.querySelector('.plan-pill')).toBeNull();
  act(() => btn.click());
  expect(c.go).toHaveBeenCalledWith('Sign in');
  act(() => root.unmount());
});

test('signed-in people, or builds without cloud, show no Sign in button', () => {
  // Signed in with Cloud Sync off, or offline (local mode), is still signed in.
  const session = { user: { id: 'u1', email: 'person@example.com' } };
  for (const over of [{ cloudMode: true, session }, { cloudMode: false, session }, { supabaseConfigured: false }]) {
    const { el, root } = render(makeContext(over));
    expect(el.querySelector('.profile-signin')).toBeNull();
    act(() => root.unmount());
  }
});

test('signed-in account email is masked in the visible profile card', () => {
  const c = makeContext({ cloudMode: true, user: { name: 'Friend', email: 'person.private@example.com', initial: 'F' }, session: { user: { email: 'person.private@example.com', app_metadata: { provider: 'google' } } } });
  const { el, root } = render(c);
  expect(el.textContent).toContain('pe••••@e••••.com');
  expect(el.textContent).not.toContain('person.private@example.com');
  act(() => root.unmount());
});

test('a signed-in person in local mode sees the Cloud Sync status and is sent to Settings, not to Sign in', () => {
  const c = makeContext({ cloudMode: false, session: { user: { id: 'u1', email: 'person@example.com' } }, syncState: { message: 'No internet. Changes are saved on this device and upload automatically when you are back online.' } });
  const { el, root } = render(c);
  const row = Array.from(el.querySelectorAll('.menu-row')).find(b => b.textContent.includes('Cloud Sync'));
  expect(row.textContent).toContain('No internet.');
  expect(row.textContent).not.toContain('Sign in');
  act(() => row.click());
  expect(c.go).toHaveBeenCalledWith('Settings');
  expect(el.textContent).not.toContain('Sign in / create account');
  act(() => root.unmount());
});

test('account rows add up the way Total Balance does: linked debit cards once, archived accounts out', () => {
  const bank = { id: 'b', account_type: 'bank', balance: 4000, currency: 'PHP' };
  const debit = { id: 'd', account_type: 'card', cardKind: 'debit', balance: 4000, currency: 'PHP', linkedAccountId: 'b' };
  const credit = { id: 'c', account_type: 'card', cardKind: 'credit', balance: -1500, currency: 'PHP' };
  const archived = { id: 'x', account_type: 'card', cardKind: 'credit', balance: -900, currency: 'PHP', is_archived: true };
  const { el, root } = render(makeContext({ accountsByType: { bank: [bank], card: [debit, credit, archived], e_wallet: [] }, toBase: v => v }));
  const cards = Array.from(el.querySelectorAll('.menu-row')).find(b => b.textContent.includes('Cards'));
  expect(cards.textContent).toContain('2 accounts');
  expect(cards.textContent).toMatch(/[-−]₱1,500\.00/);
  act(() => root.unmount());
});
