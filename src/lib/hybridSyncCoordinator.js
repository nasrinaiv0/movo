import { claimHybridSyncBatch, finalizeHybridSyncOperation, requeueHybridSyncOperation } from './hybridLocalStore';

/**
 * A transport-neutral, owner-scoped sync coordinator. Each operation is
 * independently verified; it never treats a browser "online" signal as proof
 * of cloud reachability or entitlement. The server adapter MUST implement
 * idempotency keyed by ownerId + operation.id before being used in production.
 */
export async function synchronizeHybridBatch({
  ownerId, approvedOfflineIds = [],
  verifyOwner, verifyCloudWrite, applyOperation,
  limit = 50, shouldContinue = () => true,
}) {
  if (typeof verifyOwner !== 'function' || typeof verifyCloudWrite !== 'function' ||
      typeof applyOperation !== 'function')
    throw new Error('Cloud sync requires verified owner, access and server transport');
  if (!shouldContinue()) throw new Error('Sync cancelled');
  await verifyOwner(ownerId);
  if (!(await verifyCloudWrite(ownerId))) throw new Error('Verified cloud-write entitlement required');
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500)
    throw new Error('Invalid sync batch limit');
  const outcomes = [];
  // Claim only the next operation. Leasing a whole batch up front would let
  // unsent items expire while earlier writes wait on a slow connection.
  // Stop on the first error to preserve financial posting dependencies.
  for (let index = 0; index < limit; index++) {
    if (!shouldContinue()) break;
    await verifyOwner(ownerId);
    if (!(await verifyCloudWrite(ownerId))) break;
    const [op] = await claimHybridSyncBatch({ ownerId, approvedOfflineIds, limit: 1 });
    if (!op) break;
    try {
      if (!shouldContinue()) throw new Error('Sync cancelled');
      await verifyOwner(ownerId);
      if (!(await verifyCloudWrite(ownerId))) throw new Error('Cloud-write entitlement expired');
      // The server must verify owner, revision, and idempotency keyed to the
      // immutable (ownerId, operation.id) before returning an acknowledgement.
      const response = await applyOperation(op);
      if (response?.ownerId !== ownerId ||
          response?.operationId !== op.id ||
          response?.recordId !== op.recordId ||
          !Number.isSafeInteger(response?.revision) ||
          response.revision < op.revision)
        throw new Error('Cloud returned unverified operation acknowledgement');
      if (!shouldContinue()) throw new Error('Sync cancelled after server write');
      await verifyOwner(ownerId);
      await finalizeHybridSyncOperation({
        ownerId, operationId: op.id, claimGeneration: op.claimGeneration,
        confirmedRevision: response.revision,
      });
      outcomes.push({ id: op.id, status: 'confirmed' });
    } catch (error) {
      // Retry with the SAME operation ID after an ambiguous server response.
      // A stale worker must not reset a newer worker's lease.
      try {
        await requeueHybridSyncOperation({
          ownerId, operationId: op.id, claimGeneration: op.claimGeneration,
        });
      } catch {
        // The generation no longer belongs to this worker; the current worker
        // or a subsequent lease recovery now owns resolution of this record.
      }
      outcomes.push({ id: op.id, status: 'pending', error: String(error?.message || 'Sync failed') });
      break;
    }
  }
  return {
    confirmed:outcomes.filter(x=>x.status==='confirmed').length,
    pending:outcomes.filter(x=>x.status==='pending').length,
    outcomes,
  };
}
