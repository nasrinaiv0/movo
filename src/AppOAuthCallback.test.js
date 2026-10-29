import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

jest.mock('./lib/supabaseClient', () => ({ supabase: null, supabaseConfigured: false }));
jest.mock('./lib/financeRepository', () => ({
  getCurrentSession: jest.fn().mockResolvedValue(null),
  listAccounts: jest.fn().mockResolvedValue([]),
  listTransactions: jest.fn().mockResolvedValue([]),
  createAccount: jest.fn(),
  createTransaction: jest.fn(),
  deleteTransaction: jest.fn(),
  signOut: jest.fn(),
}));

global.IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = jest.fn();

describe('MOVO Google OAuth callback', () => {
  let container;
  let root;

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, '', '/#error=access_denied&error_description=private-provider-details');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<App />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    window.history.replaceState({}, '', '/');
    window.localStorage.clear();
  });

  test('shows a safe sign-in error and removes provider details from the URL', () => {
    expect(container.textContent).toContain('Google sign-in could not be completed.');
    expect(container.textContent).toContain('Continue with Google');
    expect(window.location.hash).toBe('');
    expect(window.location.search).not.toContain('private-provider-details');
  });
});
