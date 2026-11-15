import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { finishOAuth } from './lib/financeRepository';
import { listenForAppUrls } from './lib/native';

jest.mock('./lib/supabaseClient', () => ({ supabase: null, supabaseConfigured: false }));
jest.mock('./lib/financeRepository', () => ({
  getCurrentSession: jest.fn().mockResolvedValue(null),
  listAccounts: jest.fn().mockResolvedValue([]),
  listTransactions: jest.fn().mockResolvedValue([]),
  createAccount: jest.fn(),
  createTransaction: jest.fn(),
  deleteTransaction: jest.fn(),
  signOut: jest.fn(),
  finishOAuth: jest.fn(),
}));

jest.mock('./lib/native', () => ({
  ...jest.requireActual('./lib/native'),
  listenForAppUrls: jest.fn(),
}));

global.IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = jest.fn();

describe('MOVO Google OAuth callback', () => {
  let container;
  let root;

  beforeEach(async () => {
    window.localStorage.clear();
    window.history.replaceState({}, '', '/#error=access_denied&error_description=private-provider-details');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => { root.render(<App />); });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    window.history.replaceState({}, '', '/');
    window.localStorage.clear();
  });

  test('shows a safe sign-in error and removes provider details from the URL', () => {
    expect(container.textContent).toContain('Google sign-in could not be completed.');
    expect(container.querySelector('button[aria-label="Continue with Google"]')).not.toBeNull();
    expect(window.location.hash).toBe('');
    expect(window.location.search).not.toContain('private-provider-details');
  });
});


test('a valid native callback clears a stale no-code alert and exchanges the code', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  finishOAuth.mockResolvedValue({ user: { id: 'test-user' } });
  listenForAppUrls.mockClear();

  try {
    await act(async () => { root.render(<App />); });
    const [{ onAuth }] = listenForAppUrls.mock.calls[0];
    act(() => onAuth({ code: '', error: '' }));
    expect(container.textContent).toContain('OA-NO-CODE');

    await act(async () => onAuth({ code: 'fresh-test-code', error: '' }));
    expect(finishOAuth).toHaveBeenCalledWith('fresh-test-code');
    expect(container.textContent).not.toContain('OA-NO-CODE');
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});
