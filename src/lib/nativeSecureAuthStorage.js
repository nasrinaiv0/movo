/**
 * Native-only Supabase auth storage. Browser session semantics are unchanged.
 * On iOS auth data is held by Keychain (WhenUnlockedThisDeviceOnly).
 * On Android auth data is encrypted with a non-exportable Android Keystore AES key.
 *
 * Migration: after the native vault confirms storage, remove any legacy web
 * localStorage / Capacitor Preferences copy. If native storage fails, reject
 * rather than falling back to recoverable plaintext.
 */
import { Preferences } from '@capacitor/preferences';
import { MovoNative } from './native';
import { isNativeApp } from './platform';

const LEGACY_AUTH_KEY = /^sb-[A-Za-z0-9_-]+-auth-token(?:-code-verifier)?$/;
const LEGACY_PREFIX = /^sb-/;

function isAuthKey(key) {
  return typeof key === 'string' && LEGACY_AUTH_KEY.test(key);
}
function removeWebLegacy(key) {
  try { if (typeof localStorage !== 'undefined') localStorage.removeItem(key); } catch { /* secondary cleanup only */ }
}
async function removeLegacy(key) {
  removeWebLegacy(key);
  try { await Preferences.remove({ key }); } catch { /* native vault is authoritative */ }
}
function requireNative() {
  if (!isNativeApp()) throw new Error('secure_auth_storage_native_only');
}
export const nativeSecureAuthStorage = {
  async getItem(key) {
    requireNative();
    if (!isAuthKey(key)) throw new Error('invalid_auth_storage_key');
    // Never expose the stored credential through a browser-accessible mirror.
    const { value } = await MovoNative.secureGet({ key });
    if (value !== null && value !== undefined) {
      await removeLegacy(key);
      return String(value);
    }
    let legacy = null;
    try { legacy = localStorage.getItem(key); } catch { /* legacy storage unavailable */ }
    if (legacy === null) {
      // Native app versions before this update mirrored auth keys into Preferences.
      const old = await Preferences.get({ key });
      legacy = old?.value ?? null;
    }
    if (legacy === null || legacy === undefined) return null;
    if (typeof legacy !== 'string') throw new Error('invalid_legacy_auth_state');
    // Migration order is deliberately write-then-delete. Do not lose a signed-in
    // user's session when Keychain/Keystore is temporarily unavailable.
    await MovoNative.secureSet({ key, value: legacy });
    await removeLegacy(key);
    return legacy;
  },
  async setItem(key, value) {
    requireNative();
    if (!isAuthKey(key) || typeof value !== 'string') throw new Error('invalid_auth_storage_value');
    await MovoNative.secureSet({ key, value });
    await removeLegacy(key);
  },
  async removeItem(key) {
    requireNative();
    if (!isAuthKey(key)) throw new Error('invalid_auth_storage_key');
    await MovoNative.secureRemove({ key });
    await removeLegacy(key);
  },
};

/** MOVO's generic local-data mirror must never restore sensitive Supabase keys. */
export const shouldMirrorNonSecretKey = key =>
  typeof key === 'string' && /^movo\./.test(key) && !LEGACY_PREFIX.test(key);
