/**
 * Hybrid sync policy. This is deliberately independent of React and network APIs.
 * A browser 'online' event is not authorization to upload offline work.
 */
export const SyncOrigin = Object.freeze({ ONLINE: 'online', OFFLINE: 'offline' });
export const SyncStatus = Object.freeze({
  PENDING: 'pending', IN_FLIGHT: 'in_flight', CONFIRMED: 'confirmed',
  CONFLICT: 'conflict', FAILED: 'failed',
});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function makeSyncOperation({ id, ownerId, recordId, kind, origin, revision, createdAt }) {
  if (!UUID.test(String(id)) || !UUID.test(String(ownerId)) || !UUID.test(String(recordId)))
    throw new Error('Invalid operation or owner identity');
  if (!['create', 'update', 'delete'].includes(kind)) throw new Error('Invalid operation kind');
  if (!Object.values(SyncOrigin).includes(origin)) throw new Error('Invalid sync origin');
  if (!Number.isSafeInteger(revision) || revision < 0) throw new Error('Invalid revision');
  if (!Number.isFinite(Date.parse(createdAt))) throw new Error('Invalid operation time');
  return Object.freeze({ id, ownerId, recordId, kind, origin, revision, createdAt,
    status: SyncStatus.PENDING, approvedAt: null });
}

/** Only owner-matched online operations may auto-upload; offline operations require approval. */
export function eligibleSyncOperations(operations, { ownerId, approvedOfflineIds = [] } = {}) {
  if (!UUID.test(String(ownerId))) return [];
  const approved = new Set(approvedOfflineIds);
  const seen = new Set();
  return (Array.isArray(operations) ? operations : []).filter(op => {
    if (!op || op.ownerId !== ownerId || !UUID.test(String(op.id)) ||
        op.status !== SyncStatus.PENDING || seen.has(op.id)) return false;
    if (op.origin !== SyncOrigin.ONLINE &&
        !(op.origin === SyncOrigin.OFFLINE && (approved.has(op.id) || op.approvedAt != null))) return false;
    seen.add(op.id);
    return true;
  });
}

/** A reconnect event only reports what requires consent; it never mutates the journal. */
export function pendingOfflineSyncCount(operations, ownerId) {
  return (Array.isArray(operations) ? operations : []).filter(op =>
    op?.ownerId === ownerId && op.origin === SyncOrigin.OFFLINE &&
    [SyncStatus.PENDING, SyncStatus.FAILED, SyncStatus.CONFLICT].includes(op.status)).length;
}

/** A cloud acknowledgement must match the exact owner, operation, and revision. */
export function acknowledgeSyncOperation(operation, confirmation) {
  if (!operation || operation.status !== SyncStatus.IN_FLIGHT ||
      confirmation?.ownerId !== operation.ownerId ||
      confirmation?.operationId !== operation.id ||
      confirmation?.recordId !== operation.recordId ||
      !Number.isSafeInteger(confirmation?.revision) ||
      confirmation.revision < operation.revision)
    throw new Error('Untrusted sync acknowledgement');
  return Object.freeze({ ...operation, status: SyncStatus.CONFIRMED,
    confirmedRevision: confirmation.revision });
}
