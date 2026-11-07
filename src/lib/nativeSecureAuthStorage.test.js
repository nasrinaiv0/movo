import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { MovoNative } from './native';
import { nativeSecureAuthStorage } from './nativeSecureAuthStorage';

jest.mock('./native', () => ({
  MovoNative: {
    secureGet: jest.fn(),
    secureSet: jest.fn(),
    secureRemove: jest.fn(),
  },
}));
jest.mock('@capacitor/preferences', () => ({
  Preferences: { get: jest.fn(), remove: jest.fn() }
}));
const KEY = 'sb-project-auth-token';
const PKCE_KEY = 'sb-project-auth-token-code-verifier';
beforeEach(() => {
  jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
  MovoNative.secureGet.mockResolvedValue({ value: null });
  MovoNative.secureSet.mockResolvedValue({});
  MovoNative.secureRemove.mockResolvedValue({});
  Preferences.get.mockResolvedValue({ value: null });
  Preferences.remove.mockResolvedValue({});
  window.localStorage.clear();
});
afterEach(() => {
  jest.restoreAllMocks();
  for (const fn of Object.values(MovoNative)) fn.mockReset();
  for (const fn of Object.values(Preferences)) fn.mockReset();
});

test('reads an existing Keychain/Keystore token and scrubs stale plaintext copies', async () => {
  localStorage.setItem(KEY, 'legacy-plaintext');
  MovoNative.secureGet.mockResolvedValue({ value: 'encrypted-backed-session' });
  expect(await nativeSecureAuthStorage.getItem(KEY)).toBe('encrypted-backed-session');
  expect(localStorage.getItem(KEY)).toBeNull();
  expect(Preferences.remove).toHaveBeenCalledWith({ key: KEY });
  expect(MovoNative.secureSet).not.toHaveBeenCalled();
});
test('migrates an old Capacitor Preferences session only after the device vault persists it', async () => {
  Preferences.get.mockResolvedValueOnce({ value: '{"access_token":"legacy"}' });
  expect(await nativeSecureAuthStorage.getItem(KEY)).toBe('{"access_token":"legacy"}');
  expect(MovoNative.secureSet).toHaveBeenCalledWith({ key: KEY, value: '{"access_token":"legacy"}' });
  expect(Preferences.remove).toHaveBeenCalledWith({ key: KEY });
});
test('migrates the OAuth PKCE verifier from browser storage to the device vault', async () => {
  localStorage.setItem(PKCE_KEY, 'secret-verifier');
  expect(await nativeSecureAuthStorage.getItem(PKCE_KEY)).toBe('secret-verifier');
  expect(MovoNative.secureSet).toHaveBeenCalledWith({ key: PKCE_KEY, value: 'secret-verifier' });
  expect(localStorage.getItem(PKCE_KEY)).toBeNull();
});
test('failed migration retains the previous login instead of deleting it', async () => {
  localStorage.setItem(KEY, 'still-signed-in');
  MovoNative.secureSet.mockRejectedValue(new Error('device_locked'));
  await expect(nativeSecureAuthStorage.getItem(KEY)).rejects.toThrow('device_locked');
  expect(localStorage.getItem(KEY)).toBe('still-signed-in');
  expect(Preferences.remove).not.toHaveBeenCalled();
});
test('a vault read error fails closed rather than exposing legacy tokens', async () => {
  localStorage.setItem(KEY, 'legacy');
  MovoNative.secureGet.mockRejectedValue(new Error('keychain_unavailable'));
  await expect(nativeSecureAuthStorage.getItem(KEY)).rejects.toThrow('keychain_unavailable');
  expect(MovoNative.secureSet).not.toHaveBeenCalled();
});
test('auth writes never go through plaintext localStorage or Capacitor Preferences', async () => {
  await nativeSecureAuthStorage.setItem(KEY, 'new-secret');
  expect(MovoNative.secureSet).toHaveBeenCalledWith({ key: KEY, value: 'new-secret' });
  expect(localStorage.getItem(KEY)).toBeNull();
  expect(Preferences.remove).toHaveBeenCalledWith({ key: KEY });
});
test('removal clears encrypted and any legacy auth copies', async () => {
  localStorage.setItem(KEY, 'stale');
  await nativeSecureAuthStorage.removeItem(KEY);
  expect(MovoNative.secureRemove).toHaveBeenCalledWith({ key: KEY });
  expect(localStorage.getItem(KEY)).toBeNull();
});
test('invalid keys cannot use sensitive native storage; native vault is never enabled on web', async () => {
  await expect(nativeSecureAuthStorage.setItem('movo.preferences.v3', 'x')).rejects.toThrow('invalid_auth_storage');
  jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
  await expect(nativeSecureAuthStorage.getItem(KEY)).rejects.toThrow('native_only');
});

test('a failed Preferences scrub blocks a migrated secure session until cleanup succeeds', async () => {
  MovoNative.secureGet.mockResolvedValue({ value: 'vault-session' });
  localStorage.setItem(KEY, 'old-plaintext');
  Preferences.remove.mockRejectedValueOnce(new Error('storage_locked'));
  await expect(nativeSecureAuthStorage.getItem(KEY)).rejects.toThrow('secure_auth_legacy_cleanup_failed');
  expect(MovoNative.secureRemove).not.toHaveBeenCalled();
  // A later load retries cleanup; no plaintext fallback or forced logout.
  await expect(nativeSecureAuthStorage.getItem(KEY)).resolves.toBe('vault-session');
  expect(localStorage.getItem(KEY)).toBeNull();
});

test('a failed browser legacy scrub fails closed and retries without exposing the token', async () => {
  MovoNative.secureGet.mockResolvedValue({ value: 'vault-session' });
  const proto = Object.getPrototypeOf(localStorage);
  const getItem = jest.spyOn(proto, 'getItem');
  getItem.mockImplementationOnce(() => 'unremoved-secret');
  await expect(nativeSecureAuthStorage.getItem(KEY)).rejects.toThrow('secure_auth_legacy_cleanup_failed');
  getItem.mockRestore();
  await expect(nativeSecureAuthStorage.getItem(KEY)).resolves.toBe('vault-session');
});

test('failed logout cleanup retains a secure tombstone so old plaintext cannot reauthenticate', async () => {
  localStorage.setItem(KEY, 'old-login');
  Preferences.remove.mockRejectedValueOnce(new Error('read_only'));
  await expect(nativeSecureAuthStorage.removeItem(KEY)).rejects.toThrow('secure_auth_legacy_cleanup_failed');
  expect(MovoNative.secureSet).toHaveBeenCalledWith({
    key: KEY, value: '__movo_auth_revoked_v1__',
  });
  expect(MovoNative.secureRemove).not.toHaveBeenCalled();
  MovoNative.secureGet.mockResolvedValue({ value: '__movo_auth_revoked_v1__' });
  await expect(nativeSecureAuthStorage.getItem(KEY)).resolves.toBeNull();
  expect(MovoNative.secureRemove).toHaveBeenCalledWith({ key: KEY });
});
