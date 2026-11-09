import { SYNC_GROUPS, sameFinanceRecord } from './offlineReconciliation';

/*
 * How many records on this device have not reached the cloud yet, for the log-out warning (owner spec 2026-11-09):
 * rows added or changed in this person's offline workspace since the last confirmed cloud copy, plus deletions still
 * waiting to be applied. A workspace marked dirty always counts as at least one change. Read-only: it never changes
 * the workspace, and logging out never deletes it.
 */
export function unsyncedChangeCount(workspace) {
  if (!workspace || workspace.dirty !== true) return 0;
  const changed = new Set();
  for (const group of SYNC_GROUPS) {
    const baseline = Array.isArray(workspace.baseline?.[group]) ? workspace.baseline[group] : [];
    const working = Array.isArray(workspace.working?.[group]) ? workspace.working[group] : [];
    const before = new Map(baseline.filter(row => row?.id).map(row => [String(row.id), row]));
    const kept = new Set();
    for (const row of working) {
      if (!row?.id) continue;
      const id = String(row.id);
      kept.add(id);
      if (!before.has(id) || !sameFinanceRecord(before.get(id), row)) changed.add(`${group}:${id}`);
    }
    for (const id of before.keys()) if (!kept.has(id)) changed.add(`${group}:${id}`);
    for (const id of workspace.pendingDeletions?.[group] || []) changed.add(`${group}:${id}`);
  }
  return Math.max(changed.size, 1);
}
