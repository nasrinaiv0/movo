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
  expect(Preferences.remove).not.toHaveBeenCalled();
  expect(MovoNative.secureSet).not.toHaveBeenCalled();
});
test('migrates an old Capacitor Preferences session only after the device vault persists it', async () => {
  Preferences.get.mockResolvedValueOnce({ value: '{"access_token":"legacy"}' })
    .mockResolvedValueOnce({ value: '{"access_token":"legacy"}' });
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
  expect(Preferences.remove).not.toHaveBeenCalled();
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
  Preferences.get.mockResolvedValueOnce({ value: 'old-preferences-copy' })
    .mockResolvedValueOnce({ value: 'old-preferences-copy' });
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
  getItem.mockImplementationOnce(() => 'unremoved-secret')
    .mockImplementationOnce(() => 'still-present');
  await expect(nativeSecureAuthStorage.getItem(KEY)).rejects.toThrow('secure_auth_legacy_cleanup_failed');
  getItem.mockRestore();
  await expect(nativeSecureAuthStorage.getItem(KEY)).resolves.toBe('vault-session');
});

test('failed logout cleanup retains a secure tombstone so old plaintext cannot reauthenticate', async () => {
  localStorage.setItem(KEY, 'old-login');
  Preferences.get.mockResolvedValueOnce({ value: 'old-preferences-copy' });
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


test('new encrypted auth and PKCE writes avoid unnecessary Preferences deletion', async () => {
  // On a fresh install a transient Preferences.remove failure must not break
  // a working Keystore when the legacy entry is proven absent.
  Preferences.remove.mockRejectedValue(new Error('not_expected'));
  await expect(nativeSecureAuthStorage.setItem(KEY, 'encrypted-session')).resolves.toBeUndefined();
  await expect(nativeSecureAuthStorage.setItem(PKCE_KEY, 'transient-verifier')).resolves.toBeUndefined();
  expect(MovoNative.secureSet).toHaveBeenCalledTimes(2);
  expect(Preferences.get).toHaveBeenCalledWith({ key: KEY });
  expect(Preferences.get).toHaveBeenCalledWith({ key: PKCE_KEY });
  expect(Preferences.remove).not.toHaveBeenCalled();
});

test('an actual legacy Preferences copy is removed and verified after encrypted write', async () => {
  Preferences.get.mockResolvedValueOnce({ value: 'legacy-copy' })
    .mockResolvedValueOnce({ value: null });
  await nativeSecureAuthStorage.setItem(KEY, 'new-encrypted-value');
  expect(MovoNative.secureSet).toHaveBeenCalledWith({ key: KEY, value: 'new-encrypted-value' });
  expect(Preferences.remove).toHaveBeenCalledWith({ key: KEY });
});

test('inability to verify whether a legacy copy exists continues to fail closed', async () => {
  Preferences.get.mockRejectedValueOnce(new Error('preferences-unavailable'));
  await expect(nativeSecureAuthStorage.setItem(KEY, 'new-encrypted-value'))
    .rejects.toThrow('secure_auth_legacy_cleanup_failed');
  expect(MovoNative.secureSet).toHaveBeenCalledWith({ key: KEY, value: 'new-encrypted-value' });
  expect(MovoNative.secureRemove).not.toHaveBeenCalled();
});


test('malformed or missing Preferences bridge responses never bypass legacy validation', async () => {
  for (const response of [undefined, {}, { value: undefined }]) {
    Preferences.get.mockReset().mockResolvedValueOnce(response);
    await expect(nativeSecureAuthStorage.setItem(KEY, 'encrypted-only'))
      .rejects.toThrow('secure_auth_legacy_cleanup_failed');
  }
  expect(MovoNative.secureRemove).not.toHaveBeenCalled();
});
test('an unverified Preferences removal result remains blocked', async () => {
  Preferences.get.mockResolvedValueOnce({ value: 'legacy-copy' })
    .mockResolvedValueOnce(undefined);
  await expect(nativeSecureAuthStorage.setItem(KEY, 'encrypted-only'))
    .rejects.toThrow('secure_auth_legacy_cleanup_failed');
});
