import React, { act } from 'react';
import { Capacitor } from '@capacitor/core';
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
    jest.restoreAllMocks();
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

  test('automatically verifies a complete six-digit OTP without a submit click', async () => {
    accept();
    setValue(container.querySelector('input[type="email"]'), 'auto@example.com');
    await submit();
    setValue(container.querySelector('input[autocomplete="one-time-code"]'), '123456');
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 260)); });
    expect(verifyEmailCode).toHaveBeenCalledTimes(1);
    expect(verifyEmailCode).toHaveBeenCalledWith('auto@example.com', '123456');
    expect(onAuthenticated).toHaveBeenCalledWith({ id: 'u1' });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 220)); });
    expect(verifyEmailCode).toHaveBeenCalledTimes(1);
  });

  test('a wrong auto-submitted OTP is not repeatedly retried without editing', async () => {
    verifyEmailCode.mockRejectedValue(new Error('expired'));
    accept();
    setValue(container.querySelector('input[type="email"]'), 'expired@example.com');
    await submit();
    setValue(container.querySelector('input[autocomplete="one-time-code"]'), '654321');
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 280)); });
    expect(container.textContent).toContain('That code is not valid or has expired.');
    expect(verifyEmailCode).toHaveBeenCalledTimes(1);
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 280)); });
    expect(verifyEmailCode).toHaveBeenCalledTimes(1);
  });

  test('Apple sign-in starts only after consent', async () => {
    const apple = container.querySelector('.auth-apple');
    await act(async () => { apple.click(); await Promise.resolve(); });
    expect(signInWithApple).not.toHaveBeenCalled();
    accept();
    await act(async () => { apple.click(); await Promise.resolve(); });
    expect(signInWithApple).toHaveBeenCalledTimes(1);
  });

  test('Google provider-not-configured errors explain server setup instead of exposing details', async () => {
    signInWithGoogle.mockRejectedValueOnce({ code: 'oauth_provider_not_supported', message: 'private provider diagnostics' });
    accept();
    const google = container.querySelector('.auth-google');
    await act(async () => { google.click(); await Promise.resolve(); });
    expect(container.textContent).toContain('Google sign-in isn’t available right now.');
    expect(container.textContent).not.toContain('private provider diagnostics');
    expect(google.disabled).toBe(false);
  });

  test('invalid cloud credentials are explained without showing the key', async () => {
    signInWithGoogle.mockRejectedValueOnce({ code: 'invalid_api_key', message: 'a-private-key-value' });
    accept();
    await act(async () => { container.querySelector('.auth-google').click(); await Promise.resolve(); });
    expect(container.textContent).toContain('invalid cloud configuration');
    expect(container.textContent).not.toContain('a-private-key-value');
  });

  test('email delivery errors identify server delivery without incorrectly prompting for a code', async () => {
    sendEmailCode.mockRejectedValueOnce({ code: 'email_send_failed', message: 'smtp-internal-secret' });
    accept();
    setValue(container.querySelector('input[type="email"]'), 'test@example.com');
    await submit();
    expect(container.textContent).toContain('could not deliver email codes');
    expect(container.textContent).not.toContain('smtp-internal-secret');
    expect(container.querySelector('input[autocomplete="one-time-code"]')).toBeNull();
  });

  test('rate-limited email requests do not claim that a code was sent', async () => {
    sendEmailCode.mockRejectedValueOnce({ status: 429, code: 'over_email_send_rate_limit' });
    accept();
    setValue(container.querySelector('input[type="email"]'), 'test@example.com');
    await submit();
    expect(container.textContent).toContain('Too many code requests');
    expect(container.textContent).not.toContain('We sent a sign-in code');
  });


  test('Android-specific Google OAuth errors do not misstate that the web provider is disabled', async () => {
    jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    jest.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
    signInWithGoogle.mockRejectedValueOnce({ code: 'oauth_provider_not_supported', message: 'private OAuth diagnostics' });
    accept();
    await act(async () => { container.querySelector('.auth-google').click(); await Promise.resolve(); });
    expect(container.textContent).toContain('Google sign-in could not start in the Android app');
    expect(container.textContent).not.toContain('Google sign-in isn’t available right now.');
    expect(container.textContent).not.toContain('private OAuth diagnostics');
  });

  test('Android Chrome Custom Tabs errors show device-specific guidance without leaking OAuth state', async () => {
    signInWithGoogle.mockRejectedValueOnce({ code: 'android_auth_browser_unavailable', message: 'android_auth_browser_unavailable' });
    accept();
    await act(async () => { container.querySelector('.auth-google').click(); await Promise.resolve(); });
    expect(container.textContent).toContain('Android could not open secure sign-in');
    expect(container.querySelector('.auth-google').disabled).toBe(false);
  });

  test('Android encrypted auth-storage failures do not claim an OTP email was sent', async () => {
    sendEmailCode.mockRejectedValueOnce({ code: 'secure_auth_write_failed' });
    accept();
    setValue(container.querySelector('input[type="email"]'), 'android@example.com');
    await submit();
    expect(container.textContent).toContain('Secure sign-in storage is unavailable');
    expect(container.querySelector('input[autocomplete="one-time-code"]')).toBeNull();
  });

});
