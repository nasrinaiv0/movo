/**
 * Slow or missing connections (offline-first). A cloud request that cannot reach the server, or does not answer in
 * time, is a network failure: the app keeps working on the signed-in owner's device copy and syncs later. Server
 * answers (validation, permissions, conflicts) are never network failures and are shown as they are.
 */
export const CLOUD_WRITE_TIMEOUT_MS = 12000;
export const CLOUD_READ_TIMEOUT_MS = 25000;

export class NetworkTimeoutError extends Error {
  constructor(message = 'The connection is too slow. Your changes are kept on this device.') {
    super(message);
    this.name = 'NetworkTimeoutError';
    this.code = 'MOVO_TIMEOUT';
  }
}

/** Rejects with NetworkTimeoutError when the promise does not settle in time. The request itself is not cancelled. */
export function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new NetworkTimeoutError()), ms); });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timer));
}

const NETWORK_MESSAGE = /failed to fetch|load failed|networkerror|network request failed|network connection was lost|fetch failed|internet connection appears to be offline|err_internet_disconnected|err_network|request timed out|timed out/i;

export function isNetworkFailure(cause) {
  if (!cause) return false;
  if (cause.code === 'MOVO_TIMEOUT' || cause.name === 'NetworkTimeoutError' || cause.name === 'AbortError') return true;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  // supabase-js reports an unreachable server as an error object whose message carries the fetch failure.
  return NETWORK_MESSAGE.test(String(cause.message || '')) || NETWORK_MESSAGE.test(String(cause.details || ''));
}
