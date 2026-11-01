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
  for (const over of [{ cloudMode: true }, { supabaseConfigured: false }]) {
    const { el, root } = render(makeContext(over));
    expect(el.querySelector('.profile-signin')).toBeNull();
    act(() => root.unmount());
  }
});
