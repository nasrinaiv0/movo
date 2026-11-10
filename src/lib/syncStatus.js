/*
 * One sync status for every page (Home, Wallet, Transactions, Menu, Settings), derived from the app's sync state.
 *
 *   local    – no cloud for this person (signed out, or Cloud Sync off): nothing to show
 *   syncing  – a sync is running
 *   synced   – the cloud and this device match
 *   offline  – no connection: the device copy is shown and new changes are kept on this device
 *   waiting  – the connection is back and changes made offline wait for "Sync local to cloud"
 *   review   – a sync found records changed both here and elsewhere; the person chooses which to keep
 *   error    – the sync stopped for another reason (plan check, storage, a server answer); nothing was discarded
 */
export function syncStatusOf({ signedIn, cloudSyncOn, cloudMode, syncState, pending = 0, conflicts = 0 }) {
  const count = Number.isSafeInteger(pending) && pending > 0 ? pending : 0;
  if (!signedIn || !cloudSyncOn) return { kind: 'local', pending: count, conflicts: 0 };
  const state = syncState || {};
  const kind = state.status === 'checking' ? 'syncing'
    : conflicts > 0 || state.status === 'review' ? 'review'
      : state.status === 'waiting' ? 'waiting'
        : state.status === 'blocked' ? 'error'
          : cloudMode ? 'synced'
            // A retry after a lost connection is offline; a retry for another reason (records changed during the
            // sync) runs again in a few seconds, so it still reads as syncing.
            : state.status === 'offline' || (state.retry === true && state.offline !== false) ? 'offline'
              : state.retry === true ? 'syncing'
                : state.status === 'pending' ? 'error'
                  : 'syncing';
  return { kind, pending: count, conflicts: Math.max(0, Number(conflicts) || 0) };
}
