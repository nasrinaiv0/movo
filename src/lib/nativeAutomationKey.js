/**
 * Phone-automation credential vault. The automation device key authorizes
 * transaction logging and therefore must not be copied with ordinary settings.
 *
 * On native platforms the key lives in the same device-only Keychain/Keystore
 * vault as auth. Web continues using existing local preferences until a
 * separate encrypted web-storage design is reviewed.
 */
import { Preferences } from '@capacitor/preferences';
import { MovoNative } from './native';
import { isNativeApp } from './platform';

const PREF = 'movo.preferences.v3';
const VAULT_KEY = 'movo-autolog-key';
const KEY_RE = /^[0-9a-f]{32,128}$/i;
let cached = '';
let ready = false;

const cleaned = value => {
  const clone = { ...value };
  delete clone.autoLogKey;
  return clone;
};

export function nativeAutomationKey() {
  return isNativeApp() && ready ? cached : '';
}
export function sanitizeNativePreferenceCache(prefs) {
  return isNativeApp() ? cleaned(prefs) : prefs;
}

/** Called after restoreNativeStorage but before React mounts on native devices. */
export async function restoreNativeAutomationKey(storage = typeof localStorage === 'undefined' ? null : localStorage) {
  if (!isNativeApp()) return;
  if (!storage) throw new Error('native_automation_storage_unavailable');
  // A native vault failure MUST NOT cause use of a credential found in plaintext.
  const { value } = await MovoNative.secureGet({ key: VAULT_KEY });
  const raw = storage.getItem(PREF);
  let prefs = null;
  try {
    prefs = raw ? JSON.parse(raw) : null;
    if (prefs && (typeof prefs !== 'object' || Array.isArray(prefs))) prefs = null;
  } catch { /* corrupted preferences cannot authorize an automation key */ }
  let activeKey = value && KEY_RE.test(value) ? value : '';
  if (!activeKey && prefs?.autoLogKey && KEY_RE.test(prefs.autoLogKey)) {
    // Write before removing old copies. A failed write preserves the old key
    // for a retry, but does not return it to app state.
    activeKey = prefs.autoLogKey;
    await MovoNative.secureSet({ key: VAULT_KEY, value: activeKey });
  }
  if (prefs && Object.prototype.hasOwnProperty.call(prefs, 'autoLogKey')) {
    const safe = JSON.stringify(cleaned(prefs));
    storage.setItem(PREF, safe);
    await Preferences.set({ key: PREF, value: safe });
  } else {
    // Old Capacitor Preferences can still contain a key even if localStorage
    // was cleaned in a previous interrupted migration.
    const old = await Preferences.get({ key: PREF });
    let oldPrefs;
    try { oldPrefs = old?.value ? JSON.parse(old.value) : null; } catch {}
    if (oldPrefs?.autoLogKey) {
      if (!activeKey && KEY_RE.test(oldPrefs.autoLogKey)) {
        activeKey = oldPrefs.autoLogKey;
        await MovoNative.secureSet({ key: VAULT_KEY, value: activeKey });
      }
      await Preferences.set({ key: PREF, value: JSON.stringify(cleaned(oldPrefs)) });
    }
  }
  cached = activeKey;
  ready = true;
}

/** Returns only after native storage confirms the new device key is durable. */
export async function saveNativeAutomationKey(value) {
  if (!isNativeApp()) throw new Error('native_automation_storage_native_only');
  if (value === '') {
    await MovoNative.secureRemove({ key: VAULT_KEY });
    cached = '';
    ready = true;
    return;
  }
  if (!KEY_RE.test(value)) throw new Error('invalid_automation_device_key');
  await MovoNative.secureSet({ key: VAULT_KEY, value });
  cached = value;
  ready = true;
}

