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

test('links are read the same on an Android WebView that cannot parse custom-scheme hosts (Chromium < 130)', () => {
  // Older WebViews report hostname "" and pathname "//auth-callback" for movo://auth-callback?code=…, which made
  // every Google sign-in return look invalid. The parser must not depend on the WebView's URL implementation.
  const RealURL = global.URL;
  class LegacyWebViewURL {
    constructor(value) {
      const match = /^([a-z-]+:)([^?#]*)(\?[^#]*)?(#.*)?$/i.exec(String(value));
      if (!match) throw new TypeError('Invalid URL');
      Object.assign(this, { protocol: match[1].toLowerCase(), hostname: '', host: '', username: '', password: '', port: '',
        pathname: match[2], search: match[3] || '', hash: match[4] || '' });
    }
  }
  global.URL = LegacyWebViewURL;
  try {
    expect(new URL('movo://auth-callback?code=abc123').hostname).toBe(''); // the stub behaves like the old WebView
    expect(readAppUrl('movo://auth-callback?code=abc123')).toEqual({ kind: 'auth', code: 'abc123', error: '' });
    expect(readAppUrl('movo-authcheck://auth-callback?code=abc123')).toEqual({ kind: 'auth', code: 'abc123', error: '' });
    expect(readAppUrl('movo://auth-callback/?code=abc123')).toEqual({ kind: 'auth', code: 'abc123', error: '' });
    expect(readAppUrl('movo://auth-callback?error=access_denied')).toEqual({ kind: 'auth', code: '', error: 'access_denied' });
    expect(readAppUrl('movo://log?amount=250&merchant=Grab&src=googlepay')).toEqual({ kind: 'log', hash: '#/log?amount=250&merchant=Grab&src=googlepay' });
    expect(readAppUrl('movo://attacker@auth-callback?code=abc')).toBeNull();
    expect(readAppUrl('movo://auth-callback:444?code=abc')).toBeNull();
    expect(readAppUrl('movo://auth-callback/evil?code=abc')).toBeNull();
    expect(readAppUrl('movo://evil/auth-callback?code=abc')).toBeNull();
  } finally { global.URL = RealURL; }
});

test('link shapes outside scheme://route[/][?query][#fragment] are refused', () => {
  expect(readAppUrl('MOVO://auth-callback?code=abc')).toEqual({ kind: 'auth', code: 'abc', error: '' });
  expect(readAppUrl('movo://Auth-Callback?code=abc')).toBeNull();
  expect(readAppUrl('movo:auth-callback?code=abc')).toBeNull();
  expect(readAppUrl('movo:///auth-callback?code=abc')).toBeNull();
  expect(readAppUrl('movo://auth-callback.evil.example?code=abc')).toBeNull();
  expect(readAppUrl('movo://auth-callback//?code=abc')).toBeNull();
  expect(readAppUrl('movo://auth-callback?code=abc\n')).toBeNull();
  expect(readAppUrl(' movo://auth-callback?code=abc')).toBeNull();
  expect(readAppUrl('movo://auth-callback#code=abc')).toBeNull();
  expect(readAppUrl('movo://auth-callback?code=abc&refresh_token=x')).toBeNull();
  expect(readAppUrl('movo://log?merchant=Jollibee%20Makati&amount=199')).toEqual({ kind: 'log', hash: '#/log?merchant=Jollibee+Makati&amount=199' });
  expect(readAppUrl('movo://log')).toEqual({ kind: 'log', hash: '#/log?' });
  expect(readAppUrl(null)).toBeNull();
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
  const saved = { 'movo.preferences.v3': '{"theme":"dark"}', 'sb-x-auth-token': 'tok',
    'movo.local.transactions.v1': '[{"merchant":"PRIVATE legacy"}]',
    'movo.offline.workspace.v2.11111111-1111-4111-8111-111111111111': '{"dirty":true}',
    'other.key': 'skip' };
  Preferences.keys.mockResolvedValue({ keys: Object.keys(saved) });
  Preferences.get.mockImplementation(async ({ key }) => ({ value: saved[key] }));
  const set = Preferences.set.mockResolvedValue();
  const remove = Preferences.remove.mockResolvedValue();
  window.localStorage.clear();
  await restoreNativeStorage(window.localStorage);
  expect(window.localStorage.getItem('movo.preferences.v3')).toBe('{"theme":"dark"}');
  expect(window.localStorage.getItem('sb-x-auth-token')).toBeNull();
  expect(window.localStorage.getItem('other.key')).toBeNull();
  expect(window.localStorage.getItem('movo.local.transactions.v1')).toBeNull();
  expect(window.localStorage.getItem('movo.offline.workspace.v2.11111111-1111-4111-8111-111111111111')).toBeNull();
  expect(Preferences.get).not.toHaveBeenCalledWith({ key: 'movo.local.transactions.v1' });
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
  // Encrypted finance cache storage is never copied to native Preferences.
  set.mockClear();
  const cacheKey = 'movo.readCache.v1:11111111-1111-4111-8111-111111111111:loans';
  window.localStorage.setItem(cacheKey, '{"v":2,"ct":"ciphertext"}');
  expect(Preferences.set).not.toHaveBeenCalledWith({ key: cacheKey, value: expect.any(String) });
});


test('Siri expense deep links are parsed as review requests', () => {
  expect(readAppUrl('movo://log?src=siri_shortcut&amount=250.50&merchant=Groceries')).toEqual({
    kind: 'log', hash: '#/log?src=siri_shortcut&amount=250.50&merchant=Groceries',
  });
  // URLs from other apps never become MOVO commands.
  expect(readAppUrl('https://untrusted.example/log?amount=250')).toBeNull();
});
