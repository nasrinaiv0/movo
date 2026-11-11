import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AuthPanel from './AuthPanel';
import { signInWithGoogle, signInWithApple, sendEmailCode, verifyEmailCode } from '../lib/financeRepository';

jest.mock('../lib/supabaseClient', () => ({ supabaseConfigured: true }));
jest.mock('../lib/financeRepository', () => ({
  signInWithGoogle: jest.fn().mockResolvedValue({ provider: 'google', url: 'https://accounts.google.com/' }),
  signInWithApple: jest.fn().mockResolvedValue({ provider: 'apple', url: 'https://appleid.apple.com/' }),
  sendEmailCode: jest.fn().mockResolvedValue({}),
  verifyEmailCode: jest.fn().mockResolvedValue({ session: { user: { id: 'u1' } } }),
}));

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('MOVO Google OAuth sign-in', () => {
  let container;
  let root;
  let onOpenLegal;
  let onAuthenticated;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    signInWithGoogle.mockClear();
    signInWithGoogle.mockResolvedValue({ provider: 'google', url: 'https://accounts.google.com/' });
    onOpenLegal = jest.fn();
    onAuthenticated = jest.fn();
    jest.clearAllMocks();
    signInWithApple.mockResolvedValue({ provider: 'apple', url: 'https://appleid.apple.com/' });
    sendEmailCode.mockResolvedValue({});
    verifyEmailCode.mockResolvedValue({ session: { user: { id: 'u1' } } });
    act(() => root.render(<AuthPanel onOpenLegal={onOpenLegal} onAuthenticated={onAuthenticated} />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test('shows a dedicated Google sign-in action', () => {
    const button = Array.from(container.querySelectorAll('button'))
      .find((item) => item.getAttribute('aria-label') === 'Continue with Google');
    expect(button).toBeTruthy();
    expect(button.disabled).toBe(false);
  });

  test('requires explicit legal acknowledgement before starting Google OAuth', async () => {
    const button = Array.from(container.querySelectorAll('button'))
      .find((item) => item.getAttribute('aria-label') === 'Continue with Google');
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
  const accept = () => act(() => container.querySelector('input[aria-label="Accept MOVO Terms of Service and Privacy Policy"]').click());
  const setValue = (el, value) => act(() => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const submit = async () => { await act(async () => { container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); }); };

  test('has no password: email gets a one-time code, then the code signs in', async () => {
    expect(container.querySelector('input[type="password"]')).toBeNull();
    expect(container.textContent).not.toMatch(/Create an account/);
    setValue(container.querySelector('input[type="email"]'), 'nasrin@example.com');
    await submit();
    expect(sendEmailCode).not.toHaveBeenCalled(); // consent first
    accept();
    await submit();
    expect(sendEmailCode).toHaveBeenCalledWith('nasrin@example.com');
    expect(container.textContent).toContain('We sent a sign-in code to nasrin@example.com.');
    const codeInput = container.querySelector('input[autocomplete="one-time-code"]');
    expect(codeInput).not.toBeNull();
    setValue(codeInput, '12 34 5');
    await submit();
    expect(verifyEmailCode).not.toHaveBeenCalled(); // too short
    expect(container.textContent).toContain('Enter the code from your email.');
    setValue(codeInput, '123456');
    await submit();
    expect(verifyEmailCode).toHaveBeenCalledWith('nasrin@example.com', '123456');
    expect(onAuthenticated).toHaveBeenCalledWith({ id: 'u1' });
  });

  test('a wrong code shows a clear error and resend waits for the cooldown', async () => {
    verifyEmailCode.mockRejectedValueOnce(new Error('expired'));
    accept();
    setValue(container.querySelector('input[type="email"]'), 'a@b.co');
    await submit();
    const resend = Array.from(container.querySelectorAll('button')).find(b => /Resend/.test(b.textContent));
    expect(resend.disabled).toBe(true);
    expect(resend.textContent).toMatch(/Resend in \d+s/);
    setValue(container.querySelector('input[autocomplete="one-time-code"]'), '654321');
    await submit();
    expect(container.textContent).toContain('That code is not valid or has expired.');
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  const codeInput = () => container.querySelector('input[autocomplete="one-time-code"]');
  const pause = ms => act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); });
  const reachCodeStep = async (email) => { accept(); setValue(container.querySelector('input[type="email"]'), email); await submit(); };

  test('a code that arrives whole (pasted or filled in from the message) is checked without a tap, once', async () => {
    await reachCodeStep('auto@example.com');
    setValue(codeInput(), '12345678'); // codes can be 6 to 10 digits
    await pause(250);
    expect(verifyEmailCode).toHaveBeenCalledTimes(1);
    expect(verifyEmailCode).toHaveBeenCalledWith('auto@example.com', '12345678');
    expect(onAuthenticated).toHaveBeenCalledWith({ id: 'u1' });
    await pause(250);
    expect(verifyEmailCode).toHaveBeenCalledTimes(1);
  });

  test('a typed code is never sent early: it waits for the button', async () => {
    await reachCodeStep('typed@example.com');
    for (const partial of ['1', '12', '123', '1234', '12345', '123456']) setValue(codeInput(), partial);
    await pause(250);
    expect(verifyEmailCode).not.toHaveBeenCalled();
    await submit();
    expect(verifyEmailCode).toHaveBeenCalledTimes(1);
    expect(verifyEmailCode).toHaveBeenCalledWith('typed@example.com', '123456');
  });

  test('a wrong pasted code shows the error and is not retried by itself; the button still works', async () => {
    verifyEmailCode.mockRejectedValueOnce(new Error('expired'));
    await reachCodeStep('wrong@example.com');
    setValue(codeInput(), '654321');
    await pause(250);
    expect(container.textContent).toContain('That code is not valid or has expired.');
    expect(verifyEmailCode).toHaveBeenCalledTimes(1);
    await pause(300);
    expect(verifyEmailCode).toHaveBeenCalledTimes(1);
    expect(onAuthenticated).not.toHaveBeenCalled();
    await submit();
    expect(verifyEmailCode).toHaveBeenCalledTimes(2);
    expect(onAuthenticated).toHaveBeenCalledWith({ id: 'u1' });
  });

  test('a second submit while a code is being checked is ignored', async () => {
    let finish; verifyEmailCode.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    await reachCodeStep('double@example.com');
    setValue(codeInput(), '123456');
    await pause(250);
    await submit(); await submit();
    expect(verifyEmailCode).toHaveBeenCalledTimes(1);
    await act(async () => { finish({ session: { user: { id: 'u1' } } }); });
    expect(onAuthenticated).toHaveBeenCalledTimes(1);
  });

  test('Apple sign-in starts only after consent', async () => {
    const apple = container.querySelector('.auth-apple');
    await act(async () => { apple.click(); await Promise.resolve(); });
    expect(signInWithApple).not.toHaveBeenCalled();
    accept();
    await act(async () => { apple.click(); await Promise.resolve(); });
    expect(signInWithApple).toHaveBeenCalledTimes(1);
  });
});
