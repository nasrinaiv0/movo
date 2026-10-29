import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AuthPanel from './AuthPanel';
import { signInWithGoogle } from '../lib/financeRepository';

jest.mock('../lib/supabaseClient', () => ({ supabaseConfigured: true }));
jest.mock('../lib/financeRepository', () => ({
  signInWithGoogle: jest.fn().mockResolvedValue({ provider: 'google', url: 'https://accounts.google.com/' }),
  signInWithPassword: jest.fn(),
  signUpWithPassword: jest.fn(),
}));

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('MOVO Google OAuth sign-in', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    signInWithGoogle.mockClear();
    signInWithGoogle.mockResolvedValue({ provider: 'google', url: 'https://accounts.google.com/' });
    act(() => root.render(<AuthPanel />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test('shows a dedicated Google sign-in action', () => {
    const button = Array.from(container.querySelectorAll('button'))
      .find((item) => item.textContent.includes('Continue with Google'));
    expect(button).toBeTruthy();
    expect(button.disabled).toBe(false);
  });

  test('starts Supabase Google OAuth when clicked', async () => {
    const button = Array.from(container.querySelectorAll('button'))
      .find((item) => item.textContent.includes('Continue with Google'));
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
  });
});
