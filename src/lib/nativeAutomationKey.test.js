jest.mock('./native', () => ({
  MovoNative: { secureGet: jest.fn(), secureSet: jest.fn(), secureRemove: jest.fn() }
}));
jest.mock('@capacitor/preferences', () => ({
  Preferences: { get: jest.fn(), set: jest.fn(), remove: jest.fn() }
}));

const PREF = 'movo.preferences.v3';
const DEVICE_KEY = 'a'.repeat(32);
let vault, Capacitor, Preferences, MovoNative;
beforeEach(() => {
  jest.resetModules();
  Capacitor = require('@capacitor/core').Capacitor;
  Preferences = require('@capacitor/preferences').Preferences;
  MovoNative = require('./native').MovoNative;
  jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
  MovoNative.secureGet.mockResolvedValue({ value: null });
  MovoNative.secureSet.mockResolvedValue({});
  MovoNative.secureRemove.mockResolvedValue({});
  Preferences.get.mockResolvedValue({ value: null });
  Preferences.set.mockResolvedValue({});
  localStorage.clear();
  vault = require('./nativeAutomationKey');
});
afterEach(() => {
  jest.restoreAllMocks();
  for (const fn of Object.values(MovoNative)) fn.mockReset();
  for (const fn of Object.values(Preferences)) fn.mockReset();
});

test('migrates legacy automation key to device vault before deleting it from local and mirrored settings', async () => {
  localStorage.setItem(PREF, JSON.stringify({ theme: 'dark', autoLogKey: DEVICE_KEY, autoLog: true }));
  await vault.restoreNativeAutomationKey();
  expect(MovoNative.secureSet).toHaveBeenCalledWith({ key: 'movo-autolog-key', value: DEVICE_KEY });
  expect(vault.nativeAutomationKey()).toBe(DEVICE_KEY);
  expect(JSON.parse(localStorage.getItem(PREF))).toEqual({ theme: 'dark', autoLog: true });
  expect(Preferences.set).toHaveBeenCalledWith({
    key: PREF, value: JSON.stringify({ theme: 'dark', autoLog: true })
  });
});

test('existing secure vault value takes precedence over conflicting plaintext and removes the plaintext', async () => {
  const secure = 'b'.repeat(32);
  MovoNative.secureGet.mockResolvedValue({ value: secure });
  localStorage.setItem(PREF, JSON.stringify({ autoLogKey: DEVICE_KEY }));
  await vault.restoreNativeAutomationKey();
  expect(vault.nativeAutomationKey()).toBe(secure);
  expect(MovoNative.secureSet).not.toHaveBeenCalled();
  expect(JSON.parse(localStorage.getItem(PREF))).toEqual({});
});

test('can restore legacy key from Capacitor Preferences if local prefs were previously scrubbed', async () => {
  localStorage.setItem(PREF, JSON.stringify({theme:'light'}));
  Preferences.get.mockResolvedValue({value:JSON.stringify({theme:'light',autoLogKey: DEVICE_KEY})});
  await vault.restoreNativeAutomationKey();
  expect(vault.nativeAutomationKey()).toBe(DEVICE_KEY);
  expect(MovoNative.secureSet).toHaveBeenCalledWith({key:'movo-autolog-key',value:DEVICE_KEY});
  expect(Preferences.set).toHaveBeenCalled();
});

test('a failed vault write preserves the legacy key for retry but does not activate it', async () => {
  localStorage.setItem(PREF, JSON.stringify({autoLogKey: DEVICE_KEY}));
  MovoNative.secureSet.mockRejectedValue(new Error('device_locked'));
  await expect(vault.restoreNativeAutomationKey()).rejects.toThrow('device_locked');
  expect(JSON.parse(localStorage.getItem(PREF)).autoLogKey).toBe(DEVICE_KEY);
  expect(vault.nativeAutomationKey()).toBe('');
  expect(Preferences.set).not.toHaveBeenCalled();
});

test('vault read failure prevents plaintext fallback', async () => {
  localStorage.setItem(PREF, JSON.stringify({autoLogKey: DEVICE_KEY}));
  MovoNative.secureGet.mockRejectedValue(new Error('keychain_error'));
  await expect(vault.restoreNativeAutomationKey()).rejects.toThrow('keychain_error');
  expect(vault.nativeAutomationKey()).toBe('');
  expect(MovoNative.secureSet).not.toHaveBeenCalled();
});

test('new key is activated only when secureSet confirms it was stored', async () => {
  const key = 'c'.repeat(32);
  MovoNative.secureSet.mockRejectedValueOnce(new Error('full'));
  await expect(vault.saveNativeAutomationKey(key)).rejects.toThrow('full');
  expect(vault.nativeAutomationKey()).toBe('');
  await vault.saveNativeAutomationKey(key);
  expect(vault.nativeAutomationKey()).toBe(key);
  expect(localStorage.getItem(PREF)).toBeNull();
  await vault.saveNativeAutomationKey('');
  expect(vault.nativeAutomationKey()).toBe('');
  expect(MovoNative.secureRemove).toHaveBeenCalledWith({ key:'movo-autolog-key' });
});

test('native saved preferences cannot contain an automation credential', () => {
  const prefs={theme:'dark', autoLogKey: DEVICE_KEY, autoLog:true};
  expect(vault.sanitizeNativePreferenceCache(prefs)).toEqual({theme:'dark',autoLog:true});
});

test('web preferences remain unchanged; native secure APIs do not run on the web', async () => {
  jest.spyOn(Capacitor,'isNativePlatform').mockReturnValue(false);
  const prefs={autoLogKey: DEVICE_KEY};
  expect(vault.sanitizeNativePreferenceCache(prefs)).toEqual(prefs);
  await vault.restoreNativeAutomationKey();
  expect(MovoNative.secureGet).not.toHaveBeenCalled();
  await expect(vault.saveNativeAutomationKey(DEVICE_KEY)).rejects.toThrow('native_only');
});


test('secure copy survives interrupted plaintext Preferences cleanup', async () => {
  localStorage.setItem(PREF, JSON.stringify({ theme:'light', autoLogKey: DEVICE_KEY }));
  Preferences.set.mockRejectedValueOnce(new Error('preferences_unavailable'));
  await expect(vault.restoreNativeAutomationKey()).rejects.toThrow('preferences_unavailable');
  expect(MovoNative.secureSet).toHaveBeenCalledWith({ key:'movo-autolog-key', value:DEVICE_KEY });
  MovoNative.secureGet.mockResolvedValue({ value: DEVICE_KEY });
  Preferences.get.mockResolvedValue({ value: JSON.stringify({ autoLogKey: DEVICE_KEY, theme:'light' }) });
  await vault.restoreNativeAutomationKey();
  expect(vault.nativeAutomationKey()).toBe(DEVICE_KEY);
  expect(JSON.parse(localStorage.getItem(PREF)).autoLogKey).toBeUndefined();
});

test('a later vault read failure deactivates a previously restored automation key', async () => {
  MovoNative.secureGet.mockResolvedValue({ value: DEVICE_KEY });
  await vault.restoreNativeAutomationKey();
  expect(vault.nativeAutomationKey()).toBe(DEVICE_KEY);
  MovoNative.secureGet.mockRejectedValueOnce(new Error('keychain_locked'));
  await expect(vault.restoreNativeAutomationKey()).rejects.toThrow('keychain_locked');
  expect(vault.nativeAutomationKey()).toBe('');
});
