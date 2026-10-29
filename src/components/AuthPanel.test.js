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
  let onOpenLegal;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    signInWithGoogle.mockClear();
    signInWithGoogle.mockResolvedValue({ provider: 'google', url: 'https://accounts.google.com/' });
    onOpenLegal = jest.fn();
    act(() => root.render(<AuthPanel onOpenLegal={onOpenLegal} />));
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

  test('requires explicit legal acknowledgement before starting Google OAuth', async () => {
    const button = Array.from(container.querySelectorAll('button'))
      .find((item) => item.textContent.includes('Continue with Google'));
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(signInWithGoogle).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Please review and accept the Terms of Service');
    const consent = container.querySelector('input[aria-label="Accept MOVO Terms of Service and Privacy Policy"]');
    act(() => consent.click());
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
  });

  test('onboarding links open the correct legal documents', () => {
    const terms = Array.from(container.querySelectorAll('button')).find(item => item.textContent.trim() === 'Terms of Service');
    const privacy = Array.from(container.querySelectorAll('button')).find(item => item.textContent.trim() === 'Privacy Policy');
    act(() => { terms.click(); privacy.click(); });
    expect(onOpenLegal).toHaveBeenNthCalledWith(1, 'TermsOfService');
    expect(onOpenLegal).toHaveBeenNthCalledWith(2, 'PrivacyPolicy');
  });
});
