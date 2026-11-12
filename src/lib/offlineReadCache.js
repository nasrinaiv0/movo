import { supabase } from './supabaseClient';
import { isNetworkFailure, withTimeout, CLOUD_READ_TIMEOUT_MS } from './networkFailure';

/*
 * Offline reading for a subscriber's cloud lists (owner, 2026-11-12): loans, receivables, bills and their dates and
 * payments, scheduled transactions, payment attempts, goals, plan allocations, budgets and the accounting ledger.
 *
 * Every successful cloud read keeps its rows on this device, under the signed-in account's own id. When the cloud
 * cannot be reached (no internet, server unreachable, too slow), the last copy is shown instead, so a subscriber's
 * screens never go blank offline. Rules:
 *  - Only network failures fall back. A server answer (permission, plan, validation) is shown as it is.
 *  - Per account: one account never sees another's copy, and nothing shows while signed out.
 *  - The copy is read-only; changes still go through the normal sync.
 *  - "Clear All Data" removes it with every other movo.* key; it stays on logout, like the device copy of
 *    accounts and transactions, and is only shown to the same account after signing in again.
 */
const PREFIX = 'movo.readCache.v1:';
const MAX_CHARS = 2_000_000; // a single list never fills device storage

const storage = () => { try { return typeof window !== 'undefined' ? window.localStorage : null; } catch { return null; } };
const keyFor = (ownerId, name) => `${PREFIX}${ownerId}:${name}`;

async function currentOwner() {
  try {
    // getSession reads the saved session on this device; it does not need the network.
    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.id || null;
  } catch { return null; }
}

export function readCachedList(ownerId, name) {
  try {
    const raw = storage()?.getItem(keyFor(ownerId, name));
    if (!raw) return null;
    const value = JSON.parse(raw);
    return value && value.owner === ownerId && value.rows !== undefined && value.rows !== null ? value : null;
  } catch { return null; }
}

export function writeCachedList(ownerId, name, rows) {
  if (!ownerId || rows === undefined || rows === null) return false;
  try {
    const text = JSON.stringify({ owner: ownerId, savedAt: new Date().toISOString(), rows });
    if (text.length > MAX_CHARS) return false;
    storage()?.setItem(keyFor(ownerId, name), text);
    return true;
  } catch { return false; } // full or blocked storage: the screen still shows the fresh rows
}

/**
 * Runs `load` (a cloud list read). On success the rows are kept for offline use; on a network failure the last copy
 * for the signed-in account is returned. Anything else is rethrown unchanged.
 */
export async function cachedList(name, load, variant = '', { latest = false } = {}) {
  const ownerId = await currentOwner();
  const exact = variant ? `${name}|${variant}` : name;
  try {
    const rows = await withTimeout(load(), CLOUD_READ_TIMEOUT_MS);
    if (ownerId && rows !== undefined && rows !== null) {
      writeCachedList(ownerId, exact, rows);
      // A date-range read also refreshes the latest copy of that list, used offline when the exact range was never
      // read on this device (tomorrow's range, for instance). Per-record lists (one loan's events) never do.
      if (variant && latest) writeCachedList(ownerId, name, rows);
    }
    return rows;
  } catch (cause) {
    if (ownerId && isNetworkFailure(cause)) {
      const cached = readCachedList(ownerId, exact) || (variant && latest ? readCachedList(ownerId, name) : null);
      if (cached) return cached.rows;
    }
    throw cause;
  }
}
