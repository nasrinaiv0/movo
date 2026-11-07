import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { readAppUrl, notificationId, restoreNativeStorage } from './native';

jest.mock('@capacitor/preferences', () => ({ Preferences: { keys: jest.fn(), get: jest.fn(), set: jest.fn(), remove: jest.fn(), clear: jest.fn() } }));
afterEach(() => { jest.restoreAllMocks(); Object.values(Preferences).forEach(fn => fn.mockReset()); });

test('movo:// links: sign-in return and payment log links', () => {
  expect(readAppUrl('movo://auth-callback?code=abc123')).toEqual({ kind: 'auth', code: 'abc123', error: '' });
  expect(readAppUrl('movo://auth-callback#error=access_denied&error_description=Cancelled')).toEqual({ kind: 'auth', code: '', error: 'Cancelled' });
  expect(readAppUrl('movo://log?amount=250&merchant=Grab&src=applepay')).toEqual({ kind: 'log', hash: '#/log?amount=250&merchant=Grab&src=applepay' });
  expect(readAppUrl('https://movo.nasrinai.com/auth-callback?code=x')).toBeNull();
  expect(readAppUrl('movo://somewhere-else')).toBeNull();
  expect(readAppUrl('not a url')).toBeNull();
});

test('rejects spoofed, ambiguous or oversized native deep links', () => {
  expect(readAppUrl('movo://attacker@auth-callback?code=abc')).toBeNull();
  expect(readAppUrl('movo://auth-callback:444?code=abc')).toBeNull();
  expect(readAppUrl('movo://auth-callback/evil?code=abc')).toBeNull();
  expect(readAppUrl('movo://auth-callback?code=abc&code=def')).toBeNull();
  expect(readAppUrl('movo://auth-callback?access_token=secret')).toBeNull();
  expect(readAppUrl('movo://auth-callback?code=' + 'x'.repeat(2050))).toBeNull();
  expect(readAppUrl('movo://log/extra?amount=10')).toBeNull();
  expect(readAppUrl('movo://log?amount=10#ignored')).toBeNull();
  expect(readAppUrl('movo://log?merchant=' + 'x'.repeat(5000))).toBeNull();
  expect(readAppUrl('movo://auth-callback?code=abc&error=access_denied')).toEqual({
    kind: 'auth', code: '', error: 'access_denied',
  });
});

test('notification ids are stable, positive and differ by tag', () => {
  expect(notificationId('renewal:netflix')).toBe(notificationId('renewal:netflix'));
  expect(notificationId('renewal:netflix')).not.toBe(notificationId('limit:food'));
  expect(notificationId('')).toBeGreaterThan(0);
  expect(notificationId('x'.repeat(500))).toBeLessThan(2147483647);
});

test('storage mirroring does nothing on the web', async () => {
  await restoreNativeStorage(window.localStorage);
  expect(Preferences.keys).not.toHaveBeenCalled();
});

test('in the app, MOVO keys missing from web storage are restored and later writes are mirrored', async () => {
  jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
  const saved = { 'movo.preferences.v3': '{"theme":"dark"}', 'sb-x-auth-token': 'tok', 'other.key': 'skip' };
  Preferences.keys.mockResolvedValue({ keys: Object.keys(saved) });
  Preferences.get.mockImplementation(async ({ key }) => ({ value: saved[key] }));
  const set = Preferences.set.mockResolvedValue();
  const remove = Preferences.remove.mockResolvedValue();
  window.localStorage.clear();
  await restoreNativeStorage(window.localStorage);
  expect(window.localStorage.getItem('movo.preferences.v3')).toBe('{"theme":"dark"}');
  expect(window.localStorage.getItem('sb-x-auth-token')).toBeNull();
  expect(window.localStorage.getItem('other.key')).toBeNull();
  expect(Preferences.get).not.toHaveBeenCalledWith({ key: 'sb-x-auth-token' });
  expect(Preferences.set).not.toHaveBeenCalledWith({ key: 'sb-x-auth-token', value: 'tok' });
  // Non-secret Preferences may be mirrored, but never Supabase auth tokens.
  expect(Preferences.set).not.toHaveBeenCalledWith({ key: 'sb-x-auth-token', value: 'tok' });
  set.mockClear();
  window.localStorage.setItem('movo.local.accounts.v1', '[]');
  window.localStorage.setItem('unrelated', '1');
  expect(set).toHaveBeenCalledTimes(1);
  expect(set).toHaveBeenCalledWith({ key: 'movo.local.accounts.v1', value: '[]' });
  window.localStorage.removeItem('movo.local.accounts.v1');
  expect(remove).toHaveBeenCalledWith({ key: 'movo.local.accounts.v1' });
});
