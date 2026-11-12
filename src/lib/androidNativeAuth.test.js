import { Capacitor } from '@capacitor/core';
import { sendEmailCode, verifyEmailCode, signInWithGoogle, finishOAuth } from './financeRepository';
import { AUTH_CALLBACK, openAuthBrowser } from './native';
import { readAppUrl } from './native';
import { supabase } from './supabaseClient';

jest.mock('./native', () => ({
  AUTH_CALLBACK: 'movo://auth-callback',
  openAuthBrowser: jest.fn().mockResolvedValue(),
  readAppUrl: jest.requireActual('./native').readAppUrl,
}));
jest.mock('./supabaseClient', () => ({
  supabase: { auth: {
    signInWithOtp: jest.fn(),
    verifyOtp: jest.fn(),
    signInWithOAuth: jest.fn(),
    exchangeCodeForSession: jest.fn(),
  } },
}));

beforeEach(() => {
  jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
  jest.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
  supabase.auth.signInWithOtp.mockResolvedValue({ data: {}, error: null });
  supabase.auth.verifyOtp.mockResolvedValue({ data: { session: { user: { id: 'owner' } } }, error: null });
  supabase.auth.signInWithOAuth.mockResolvedValue({ data: { url: 'https://cjsjmorqvuvvwbfyztiz.supabase.co/auth/v1/authorize?provider=google' }, error: null });
  supabase.auth.exchangeCodeForSession.mockResolvedValue({ data: { session: { user: { id: 'owner' } } }, error: null });
  openAuthBrowser.mockResolvedValue();
});
afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks(); });

test('Android typed-email OTP uses the app callback, never a website session', async () => {
  await sendEmailCode('test@example.com');
  expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
    email: 'test@example.com',
    options: { shouldCreateUser: true, emailRedirectTo: AUTH_CALLBACK },
  });
  await verifyEmailCode('test@example.com', '123456');
  expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({ email: 'test@example.com', token: '123456', type: 'email' });
});

test('Android Google OAuth uses the native browser and same PKCE return as email links', async () => {
  await signInWithGoogle();
  expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
    provider: 'google',
    options: { redirectTo: AUTH_CALLBACK, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
  });
  expect(openAuthBrowser).toHaveBeenCalledTimes(1);
  expect(openAuthBrowser).toHaveBeenCalledWith(expect.stringContaining('https://cjsjmorqvuvvwbfyztiz.supabase.co/'));
  const returned = readAppUrl('movo://auth-callback?code=android-return-code');
  expect(returned).toMatchObject({ kind: 'auth', code: 'android-return-code', error: '' });
  await finishOAuth(returned.code);
  expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('android-return-code');
});

test('Android native callback errors fail without exchanging a code or exposing tokens', async () => {
  const returned = readAppUrl('movo://auth-callback?error=access_denied');
  expect(returned).toMatchObject({ kind: 'auth', code: '', error: 'access_denied' });
  expect(readAppUrl('movo://auth-callback?access_token=plaintext')).toBeNull();
  await expect(finishOAuth('')).rejects.toThrow('oauth_code_missing');
  expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
});

test('web remains on its existing origin and does not open the native login browser', async () => {
  jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
  await sendEmailCode('web@example.com');
  expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
    email: 'web@example.com',
    options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
  });
  await signInWithGoogle();
  expect(openAuthBrowser).not.toHaveBeenCalled();
  expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
    provider: 'google', options: { redirectTo: window.location.origin, queryParams: { prompt: 'select_account' } },
  });
});

test('iOS retains its existing email-link website destination', async () => {
  jest.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios');
  await sendEmailCode('ios@example.com');
  expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
    email: 'ios@example.com',
    options: { shouldCreateUser: true, emailRedirectTo: 'https://movo.nasrinai.com' },
  });
});
