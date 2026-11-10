import { SUPPORTED_SYNC_GROUPS } from './offlineSyncTransport';

/*
 * Sync conflicts are settled by the person, one record at a time, never by a clock ("last write wins"). Each choice
 * only rewrites this account's device copy; nothing is sent from here. The next sync uploads a "Keep this device"
 * choice with the usual compare-and-swap on the cloud row's revision, so a row that changed again in the cloud in the
 * meantime comes back as a new conflict instead of being overwritten.
 *
 *   keep 'cloud'  → the device copy takes the cloud row (or its deletion); nothing is uploaded for it.
 *   keep 'device' → the cloud row becomes the confirmed starting point, so the device row (or its deletion) is
 *                   uploaded as an ordinary edit, creation or deletion of that exact revision.
 */

// What each planner reason means for the person: which side changed what.
const KINDS = Object.freeze({
  concurrent_divergent_edits: 'edited_both',
  deletion_marker_with_live_row: 'edited_both',
  same_new_id_diverged: 'created_both',
  deleted_locally_changed_remotely: 'deleted_here',
  missing_local_row_without_tombstone: 'deleted_here',
  remote_row_missing_without_tombstone: 'deleted_there',
});

export const conflictKey = conflict => `${conflict?.group}:${conflict?.id}`;

/** The two versions to show for a conflict. `device`/`cloud` are undefined when that side deleted the record. */
export function describeConflict(conflict) {
  const kind = KINDS[conflict?.reason] || 'edited_both';
  return {
    key: conflictKey(conflict), group: conflict?.group, id: conflict?.id, kind,
    device: kind === 'deleted_here' ? undefined : conflict?.local,
    cloud: kind === 'deleted_there' ? undefined : conflict?.cloud,
  };
}

const plain = value => JSON.parse(JSON.stringify(value));
const withRow = (rows, row) => [row, ...rows.filter(item => item?.id !== row.id)];
const withoutRow = (rows, id) => rows.filter(item => item?.id !== id);

/**
 * Apply `choices` ({ [conflictKey]: 'device' | 'cloud' }) for the given planner conflicts to a copy of `workspace`.
 * Conflicts without a choice are left exactly as they are. Throws (changing nothing) on anything unexpected: a group
 * this sync does not handle, a record of another owner, or a cloud row that is not the conflicting record.
 */
export function resolveOfflineConflicts(workspace, ownerId, conflicts, choices) {
  if (!workspace || workspace.version !== 2 || workspace.owner !== ownerId) throw new Error('Verified owner-scoped workspace is required.');
  if (!Array.isArray(conflicts)) throw new Error('Conflicts are required.');
  const next = plain({ ...workspace, pendingDeletions: workspace.pendingDeletions || {}, deletedRows: workspace.deletedRows || {} });
  let resolved = 0;
  for (const conflict of conflicts) {
    const keep = choices?.[conflictKey(conflict)];
    if (keep === undefined) continue;
    if (keep !== 'device' && keep !== 'cloud') throw new Error('Choose this device or the cloud for each conflict.');
    const { group, id } = conflict || {};
    if (!SUPPORTED_SYNC_GROUPS.includes(group) || typeof id !== 'string' || !id) throw new Error('This conflict cannot be settled on this device.');
    const { kind } = describeConflict(conflict);
    const cloud = kind === 'deleted_there' ? undefined : conflict.cloud;
    if (cloud !== undefined && (!cloud || cloud.id !== id || (cloud.user_id && cloud.user_id !== ownerId))) throw new Error('A cloud record does not belong to this account.');
    if (!Array.isArray(next.working[group]) || !Array.isArray(next.baseline[group])) throw new Error('This device copy is incomplete.');
    const live = next.working[group].find(item => item?.id === id);
    if (live?.user_id && live.user_id !== ownerId) throw new Error('A device record does not belong to this account.');
    const tombstones = new Set(next.pendingDeletions[group] || []);
    const deleted = { ...(next.deletedRows[group] || {}) };
    // The cloud side becomes the confirmed starting point in both cases.
    next.baseline[group] = cloud ? withRow(next.baseline[group], cloud) : withoutRow(next.baseline[group], id);
    if (keep === 'cloud') {
      next.working[group] = cloud ? withRow(next.working[group], cloud) : withoutRow(next.working[group], id);
      tombstones.delete(id); delete deleted[id];
    } else if (live) {
      // This device's row stands: an edit of the cloud revision, or a new row if the cloud deleted it.
      tombstones.delete(id); delete deleted[id];
    } else if (cloud) {
      // This device deleted it: delete exactly the cloud revision shown.
      tombstones.add(id); deleted[id] = cloud;
    } else {
      // Deleted on both sides: nothing left to do.
      tombstones.delete(id); delete deleted[id];
    }
    next.pendingDeletions[group] = Array.from(tombstones);
    next.deletedRows[group] = deleted;
    resolved += 1;
  }
  return { workspace: { ...next, dirty: true }, resolved };
}
