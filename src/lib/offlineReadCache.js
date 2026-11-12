import { Preferences } from '@capacitor/preferences';
import { supabase } from './supabaseClient';
import { isNetworkFailure, withTimeout, CLOUD_READ_TIMEOUT_MS } from './networkFailure';
import { isNativeApp } from './platform';
import { CACHE_PREFIX, encryptFinancialCache, decryptFinancialCache } from './financeCacheCrypto';

/**
 * Read-only offline finance lists. All new persisted rows are AES-256-GCM ciphertext.
 * Existing plaintext v1 entries are migrated per key, write-verified, THEN scrubbed
 * from Capacitor Preferences. A failed migration never erases the recoverable copy.
 * No plaintext fallback is used if the encryption key is unavailable.
 *
 * NOTE: This protects this read-cache only. Older local wallet/workspace snapshots
 * and the durable IndexedDB sync outbox need a separate encryption migration.
 */
const MAX_CHARS = 2_000_000;
const OWNER = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const locks = new Map();
const storage = () => { try { return typeof window !== 'undefined' ? window.localStorage : null; } catch { return null; } };
const keyFor = (ownerId, name) => OWNER.test(String(ownerId || '')) && typeof name === 'string' && name.length < 256
  ? CACHE_PREFIX + ownerId + ':' + name : '';

function locked(key, action) {
  const prev = locks.get(key) || Promise.resolve();
  const current = prev.catch(() => {}).then(action);
  locks.set(key, current);
  current.finally(() => { if (locks.get(key) === current) locks.delete(key); }).catch(() => {});
  return current;
}

async function currentOwner() {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.id || null;
  } catch { return null; }
}

async function scrubNativeLegacy(key) {
  if (!isNativeApp()) return;
  await Preferences.remove({ key });
  const { value } = await Preferences.get({ key });
  if (value !== null && value !== undefined) throw new Error('offline_cache_legacy_scrub_failed');
}

function verifiedPayload(value, ownerId) {
  return value && value.owner === ownerId && Array.isArray(value.rows) &&
    typeof value.savedAt === 'string' ? value : null;
}

async function persistEncrypted(key, ownerId, name, payload) {
  const store = storage();
  if (!store) throw new Error('offline_cache_storage_unavailable');
  const ciphertext = await encryptFinancialCache(ownerId, name, payload);
  if (ciphertext.length > MAX_CHARS * 2) throw new Error('offline_cache_too_large');
  store.setItem(key, ciphertext);
  if (store.getItem(key) !== ciphertext) throw new Error('offline_cache_write_unverified');
  await scrubNativeLegacy(key);
  return true;
}

export async function writeCachedList(ownerId, name, rows, savedAt = new Date().toISOString()) {
  const key = keyFor(ownerId, name);
  if (!key || !Array.isArray(rows)) return false;
  return locked(key, async () => {
    try {
      return await persistEncrypted(key, ownerId, name, { owner: ownerId, savedAt, rows });
    } catch { return false; } // Cloud reads still succeed; never fall back to plaintext writes.
  });
}

export async function readCachedList(ownerId, name) {
  const key = keyFor(ownerId, name);
  if (!key) return null;
  return locked(key, async () => {
    try {
      const store = storage();
      if (!store) return null;
      let raw = store.getItem(key);
      let fromPreferences = false;
      if (!raw && isNativeApp()) {
        const old = await Preferences.get({ key });
        raw = old?.value || null;
        fromPreferences = !!raw;
      }
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.v === 2) {
        const data = verifiedPayload(await decryptFinancialCache(ownerId, name, parsed), ownerId);
        if (!data) return null;
        // A previous native app might have mirrored the ciphertext into Preferences.
        if (fromPreferences) {
          store.setItem(key, raw);
          if (store.getItem(key) !== raw) return null;
        }
        await scrubNativeLegacy(key);
        return data;
      }
      const legacy = verifiedPayload(parsed, ownerId);
      if (!legacy) return null;
      // A reader MUST NOT use legacy plaintext until it is safely encrypted.
      await persistEncrypted(key, ownerId, name, legacy);
      return legacy;
    } catch {
      // Keep the encrypted/legacy bytes for repair; never return plaintext on failure.
      return null;
    }
  });
}

/** Best-effort background migration for copies that are not requested this session.
 * This must not delay the app splash screen or erase a copy on vault failure.
 */
export async function migrateLegacyOfflineReadCache() {
  const names = new Set();
  try {
    const store = storage();
    if (store) {
      for (let i = 0; i < store.length; i++) {
        const name = store.key(i);
        if (name?.startsWith(CACHE_PREFIX)) names.add(name);
      }
    }
    if (isNativeApp()) {
      const { keys = [] } = await Preferences.keys();
      keys.filter(k => k.startsWith(CACHE_PREFIX)).forEach(k => names.add(k));
    }
  } catch { return false; }
  let complete = true;
  for (const key of names) {
    const ownerId = key.slice(CACHE_PREFIX.length).split(':')[0];
    const name = key.slice(CACHE_PREFIX.length + ownerId.length + 1);
    if (!keyFor(ownerId, name) || keyFor(ownerId, name) !== key) continue;
    // Any failed entry remains untouched and is retried the next time it is read.
    if (!await readCachedList(ownerId, name)) complete = false;
  }
  return complete;
}

/** Cloud-first, offline fallback. Server denials are never overridden by cache. */
export async function cachedList(name, load, variant = '', { latest = false } = {}) {
  const ownerId = await currentOwner();
  const exact = variant ? name + '|' + variant : name;
  try {
    const rows = await withTimeout(load(), CLOUD_READ_TIMEOUT_MS);
    if (ownerId && Array.isArray(rows)) {
      await writeCachedList(ownerId, exact, rows);
      if (variant && latest) await writeCachedList(ownerId, name, rows);
    }
    return rows;
  } catch (cause) {
    if (ownerId && isNetworkFailure(cause)) {
      const cached = await readCachedList(ownerId, exact) ||
        (variant && latest ? await readCachedList(ownerId, name) : null);
      if (cached) return cached.rows;
    }
    throw cause;
  }
}
