import { sameSyncedFinanceFields } from './offlineReconciliation';

/**
 * A UI collection is not proof of a durable cloud backup. Verify that its
 * account/transaction meaning matches the last confirmed owner-scoped device
 * workspace before allowing a cloud->device handoff. Do not accept missing
 * rows, duplicates, a different owner, or pending local edits.
 */
export function matchesConfirmedOfflineHandoff(ownerId, workspace, rendered) {
  if (!ownerId || workspace?.owner !== ownerId || workspace?.version !== 2
    || workspace.dirty || !workspace.lastConfirmedAt) return false;
  return ['financial_accounts', 'transactions'].every(group => {
    const expected=workspace.working?.[group], actual=rendered?.[group];
    if (!Array.isArray(expected) || !Array.isArray(actual) || expected.length!==actual.length)
      return false;
    const keyed=new Map();
    for (const row of expected) {
      if (!row?.id || (row.user_id && row.user_id!==ownerId) || keyed.has(row.id))return false;
      keyed.set(row.id,row);
    }
    const seen=new Set();
    for (const row of actual) {
      if (!row?.id || seen.has(row.id) || (row.user_id && row.user_id!==ownerId))return false;
      seen.add(row.id);
      if (!keyed.has(row.id)||!sameSyncedFinanceFields(row,keyed.get(row.id),group))return false;
    }
    return true;
  });
}

/**
 * Automatic network-loss handoff must not bless the UI as a new cloud
 * baseline. Restore only an already-confirmed, owner-scoped workspace.
 * Unknown or corrupt caches block edits rather than inventing an empty ledger.
 */
export function planOfflineNetworkTransition(ownerId, workspace, rendered) {
  const complete = groups => ['financial_accounts','transactions'].every(group =>
    Array.isArray(groups?.[group]) && groups[group].every(row =>
      row && typeof row === 'object' && (!row.user_id || row.user_id === ownerId)));
  if (!ownerId || workspace?.version !== 2 || workspace?.owner !== ownerId ||
      !workspace.lastConfirmedAt || !complete(workspace.baseline) ||
      !complete(workspace.working)) return 'blocked';
  if (workspace.dirty === true) return 'restore_pending';
  return matchesConfirmedOfflineHandoff(ownerId, workspace, rendered)
    ? 'reuse_confirmed' : 'restore_stale';
}
