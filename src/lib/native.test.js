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
  expect(window.localStorage.getItem('sb-x-auth-token')).toBe('tok');
  expect(window.localStorage.getItem('other.key')).toBeNull();
  set.mockClear();
  window.localStorage.setItem('movo.local.accounts.v1', '[]');
  window.localStorage.setItem('unrelated', '1');
  expect(set).toHaveBeenCalledTimes(1);
  expect(set).toHaveBeenCalledWith({ key: 'movo.local.accounts.v1', value: '[]' });
  window.localStorage.removeItem('movo.local.accounts.v1');
  expect(remove).toHaveBeenCalledWith({ key: 'movo.local.accounts.v1' });
});


test('Siri expense deep links are parsed as review requests', () => {
  expect(readAppUrl('movo://log?src=siri_shortcut&amount=250.50&merchant=Groceries')).toEqual({
    kind: 'log', hash: '#/log?src=siri_shortcut&amount=250.50&merchant=Groceries',
  });
  // URLs from other apps never become MOVO commands.
  expect(readAppUrl('https://untrusted.example/log?amount=250')).toBeNull();
});
