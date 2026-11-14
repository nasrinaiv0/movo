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
// The tombstone prevents a failed sign-out scrub from re-importing a stale
// plaintext session on the next launch. It stays in the encrypted native vault
// until both old storage locations have been cleared successfully.
const REVOKED = '__movo_auth_revoked_v1__';

async function removeLegacy(key) {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(key) !== null) {
      localStorage.removeItem(key);
      if (localStorage.getItem(key) !== null) throw new Error('web_copy_present');
    }
    // A fresh secure-session write must not depend on an unnecessary remove
    // bridge call. Confirm absence first; only delete an existing legacy copy.
    // If the read is unavailable, fail closed rather than assuming it is empty.
    const legacy = await Preferences.get({ key });
    // Capacitor Preferences returns { value: null } for missing keys. A
    // missing/malformed bridge response must never be mistaken for proof that
    // old recoverable credentials are absent.
    if (!legacy || !Object.prototype.hasOwnProperty.call(legacy, 'value')
      || (legacy.value !== null && typeof legacy.value !== 'string')) {
      throw new Error('native_preferences_read_unverified');
    }
    if (legacy.value !== null) {
      await Preferences.remove({ key });
      const cleared = await Preferences.get({ key });
      if (!cleared || cleared.value !== null) throw new Error('native_preferences_copy_present');
    }
  } catch {
    // Never return a token while its recoverable legacy copy may still exist.
    // The next native auth access will retry the cleanup.
    throw new Error('secure_auth_legacy_cleanup_failed');
  }
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
    if (value === REVOKED) {
      // A previous logout was interrupted during legacy storage scrubbing.
      await removeLegacy(key);
      await MovoNative.secureRemove({ key });
      return null;
    }
    if (value !== null && value !== undefined) {
      await removeLegacy(key);
      return String(value);
    }
    let legacy = null;
    try {
      legacy = typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
    } catch {
      throw new Error('secure_auth_legacy_read_failed');
    }
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
    // Write a vault tombstone *before* clearing old copies. A failed cleanup
    // must not allow an obsolete plaintext token to be migrated on next login.
    await MovoNative.secureSet({ key, value: REVOKED });
    await removeLegacy(key);
    await MovoNative.secureRemove({ key });
  },
};

/** MOVO's generic local-data mirror must never restore sensitive Supabase keys. */
export const shouldMirrorNonSecretKey = key =>
  typeof key === 'string' && /^movo\./.test(key) && !LEGACY_PREFIX.test(key);
