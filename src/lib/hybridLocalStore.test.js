import 'fake-indexeddb/auto';
// Jest's jsdom runtime predates the structuredClone global required by IndexedDB.
if (typeof global.structuredClone !== 'function') global.structuredClone = value => JSON.parse(JSON.stringify(value));
import {
  commitLocalFinanceChange, listLocalFinanceRecords, listOwnerSyncOperations,
  claimHybridSyncBatch, finalizeHybridSyncOperation, requeueHybridSyncOperation,
  countHeldOfflineOperations, clearHybridOwner,
} from './hybridLocalStore';

const owner = '1d1a5d3f-5ce7-4d8b-b28e-52fa8bb27db4';
const other = '2d1a5d3f-5ce7-4d8b-b28e-52fa8bb27db4';
const a = '3d1a5d3f-5ce7-4d8b-b28e-52fa8bb27db4';
const b = '4d1a5d3f-5ce7-4d8b-b28e-52fa8bb27db4';
const o1 = '5d1a5d3f-5ce7-4d8b-b28e-52fa8bb27db4';
const o2 = '6d1a5d3f-5ce7-4d8b-b28e-52fa8bb27db4';
const row = (id, userId = owner) => ({
  id, user_id: userId, account_id: a, transaction_type: 'expense', amount: 10.25,
  occurred_at: '2026-11-09T02:00:00Z',
});
const commit = (id, op, origin = 'offline', userId = owner) => commitLocalFinanceChange({
  ownerId: userId, group: 'transactions', kind: 'create',
  record: row(id, userId), origin, operationId: op, createdAt: '2026-11-09T02:00:00Z',
});

beforeEach(async () => { await clearHybridOwner(owner); await clearHybridOwner(other); });
afterEach(async () => { await clearHybridOwner(owner); await clearHybridOwner(other); });

test('atomic local record and pending outbox appear together', async () => {
  await commit(a, o1);
  expect((await listLocalFinanceRecords(owner, 'transactions')).some(r => r.id === a)).toBe(true);
  expect((await listOwnerSyncOperations(owner)).find(op => op.id === o1)?.status).toBe('pending');
});

test('offline operations remain held on reconnection while online operations can be claimed', async () => {
  await commit(a, o1, 'offline');
  await commit(b, o2, 'online');
  const batch = await claimHybridSyncBatch({ ownerId: owner });
  expect(batch.map(op => op.id)).toEqual([o2]);
  expect(await countHeldOfflineOperations(owner)).toBeGreaterThanOrEqual(1);
  await finalizeHybridSyncOperation({
    ownerId: owner, operationId: o2, claimGeneration: batch[0].claimGeneration, confirmedRevision: 0,
  });
  const approved = await claimHybridSyncBatch({ ownerId: owner, approvedOfflineIds: [o1] });
  expect(approved.map(op => op.id)).toEqual([o1]);
});

test('acknowledgement requires owner and expected revision, retry retains same operation ID', async () => {
  await commit(b, o2, 'online');
  const [inFlight] = await claimHybridSyncBatch({ ownerId: owner });
  await expect(finalizeHybridSyncOperation({
    ownerId: other, operationId: o2, confirmedRevision: 0, claimGeneration: inFlight.claimGeneration,
  })).rejects.toThrow();
  await finalizeHybridSyncOperation({
    ownerId: owner, operationId: o2, confirmedRevision: 0, claimGeneration: inFlight.claimGeneration,
  });
  expect((await listOwnerSyncOperations(owner)).find(op => op.id === o2).status).toBe('confirmed');
  await commit(a, o1, 'offline');
  const [offlineClaim] = await claimHybridSyncBatch({ ownerId: owner, approvedOfflineIds: [o1] });
  await requeueHybridSyncOperation({
    ownerId: owner, operationId: o1, claimGeneration: offlineClaim.claimGeneration,
  });
  expect((await listOwnerSyncOperations(owner)).find(op => op.id === o1).status).toBe('pending');
});

test('duplicate operation ID is idempotent and mismatched owners cannot overwrite', async () => {
  await commit(a, o1);
  expect((await listOwnerSyncOperations(owner)).filter(op => op.id === o1)).toHaveLength(1);
  await expect(commit(b, o1, 'online')).rejects.toThrow('collision');
  await expect(commit(b, o1, 'offline', other)).rejects.toThrow();
  expect(await listLocalFinanceRecords(other, 'transactions')).toHaveLength(0);
});

test('invalid financial cents and cross-owner rows reject before local commit', async () => {
  await expect(commitLocalFinanceChange({
    ownerId: owner, group: 'transactions', kind: 'create',
    record: { ...row(b), amount: 4.123 },
    origin: 'online', operationId: o2,
  })).rejects.toThrow('exact positive cents');
  await expect(commitLocalFinanceChange({
    ownerId: owner, group: 'transactions', kind: 'create',
    record: row(b, other), origin: 'online', operationId: o2,
  })).rejects.toThrow('Cross-owner');
});

test('deleting one owner clears only their IndexedDB ledger and pending operations', async () => {
  const owned = '7d1a5d3f-5ce7-4d8b-b28e-52fa8bb27db4';
  const theirs = '8d1a5d3f-5ce7-4d8b-b28e-52fa8bb27db4';
  await commitLocalFinanceChange({ownerId:other,group:'transactions',kind:'create',
    record:row(owned,other),origin:'offline',operationId:theirs});
  await clearHybridOwner(owner);
  expect(await listOwnerSyncOperations(owner)).toEqual([]);
  expect(await listLocalFinanceRecords(owner,'transactions')).toEqual([]);
  expect(await listLocalFinanceRecords(other,'transactions')).toHaveLength(1);
  await clearHybridOwner(other);
});

describe('adversarial ordering, crash recovery, fencing, and idempotency', () => {
const orderedOperation = (kind, operationId, revision = 0, recordId = b, createdAt = '2026-11-09T02:00:00Z') =>
  commitLocalFinanceChange({
    ownerId: owner, group: 'transactions', kind, record: row(recordId),
    origin: 'online', operationId, revision, createdAt,
  });

test('same-record create must sync before delete despite reversed UUID index order', async () => {
  const createId = 'f1111111-1111-4111-8111-111111111111';
  const deleteId = 'a1111111-1111-4111-8111-111111111111';
  await orderedOperation('create', createId, 1);
  await orderedOperation('delete', deleteId, 2);
  const batch = await claimHybridSyncBatch({ ownerId: owner });
  expect(batch.map(item => item.id)).toEqual([createId, deleteId]);
  expect(batch[0].localSequence).toBeLessThan(batch[1].localSequence);
});

test('unapproved earlier offline create blocks newer same-record online delete', async () => {
  await commit(b, o1);
  await orderedOperation('delete', o2, 1);
  expect(await claimHybridSyncBatch({ ownerId: owner })).toEqual([]);
  const approved = await claimHybridSyncBatch({ ownerId: owner, approvedOfflineIds: [o1] });
  expect(approved.map(x => x.id)).toEqual([o1, o2]);
});

test('expired leases recover on restart while unexpired leases cannot be stolen', async () => {
  await orderedOperation('create', o1, 1);
  const first = (await claimHybridSyncBatch({ ownerId: owner, now: 10000, leaseMs: 2000 }))[0];
  expect(first.claimGeneration).toBe(1);
  expect(await claimHybridSyncBatch({ ownerId: owner, now: 11999 })).toEqual([]);
  const recovered = (await claimHybridSyncBatch({ ownerId: owner, now: 12000 }))[0];
  expect(recovered.id).toBe(first.id);
  expect(recovered.claimGeneration).toBe(2);
  await expect(finalizeHybridSyncOperation({
    ownerId: owner, operationId: o1, confirmedRevision: 1, claimGeneration: 1,
  })).rejects.toThrow('superseded');
  await expect(requeueHybridSyncOperation({
    ownerId: owner, operationId: o1, claimGeneration: 1,
  })).rejects.toThrow('no longer owned');
  await finalizeHybridSyncOperation({
    ownerId: owner, operationId: o1, confirmedRevision: 1, claimGeneration: 2,
  });
  expect((await listOwnerSyncOperations(owner)).find(x => x.id === o1).status).toBe('confirmed');
});

test('an active lease prevents a second browser tab from claiming later operations', async () => {
  await orderedOperation('create', o1, 1, a);
  await orderedOperation('create', o2, 1, b);
  const first = await claimHybridSyncBatch({ ownerId: owner, now: 10000, leaseMs: 5000, limit: 1 });
  expect(first.map(x => x.id)).toEqual([o1]);
  expect(await claimHybridSyncBatch({ ownerId: owner, now: 11000 })).toEqual([]);
  const resumed = await claimHybridSyncBatch({ ownerId: owner, now: 15000, limit: 1 });
  expect(resumed[0].id).toBe(o1);
  expect(resumed[0].claimGeneration).toBe(2);
});

test('offline approval survives recovery but reconnect alone cannot approve', async () => {
  await commit(b, o1);
  expect(await claimHybridSyncBatch({ ownerId: owner, now: 10000 })).toHaveLength(0);
  const first = (await claimHybridSyncBatch({ ownerId: owner, now: 10000, leaseMs: 2000,
    approvedOfflineIds: [o1] }))[0];
  expect(first.approvedAt).toBeTruthy();
  const retry = (await claimHybridSyncBatch({ ownerId: owner, now: 12000 }))[0];
  expect(retry.id).toBe(o1);
  expect(retry.claimGeneration).toBe(2);
});

test('same operation id rejects changed revision and timestamp without changing ledger', async () => {
  await orderedOperation('create', o1, 1);
  await expect(orderedOperation('create', o1, 2)).rejects.toThrow('collision');
  await expect(orderedOperation('create', o1, 1, b, '2026-11-09T04:00:00Z')).rejects.toThrow('collision');
  expect((await listOwnerSyncOperations(owner)).find(x => x.id === o1).revision).toBe(1);
  expect(await listLocalFinanceRecords(owner, 'transactions')).toEqual(expect.arrayContaining([row(b)]));
});

test('tenant-scoped sequences and lease recovery do not affect another owner', async () => {
  await orderedOperation('create', o1, 1);
  const otherOp = '81111111-1111-4111-8111-111111111111';
  await commitLocalFinanceChange({ ownerId: other, group: 'transactions', kind: 'create',
    record: row(a, other), origin: 'online', operationId: otherOp });
  const owned = await claimHybridSyncBatch({ ownerId: owner, now: 10000 });
  const theirs = await claimHybridSyncBatch({ ownerId: other, now: 10000 });
  expect(owned).toHaveLength(1);
  expect(theirs).toHaveLength(1);
  expect(owned[0].localSequence).toBe(1);
  expect(theirs[0].localSequence).toBe(1);
  await clearHybridOwner(other);
});

});

test('explicit approval covers the selected batch before an interrupted first request', async () => {
 await commit(a,o1,'offline');await commit(b,o2,'offline');
 const first=await claimHybridSyncBatch({ownerId:owner,approvedOfflineIds:[o1,o2],limit:1});
 expect(first).toHaveLength(1);
 const saved=await listOwnerSyncOperations(owner);
 expect(saved.every(op=>!!op.approvedAt)).toBe(true);
 await finalizeHybridSyncOperation({ownerId:owner,operationId:o1,confirmedRevision:1,claimGeneration:first[0].claimGeneration});
 expect((await claimHybridSyncBatch({ownerId:owner,limit:1}))[0].id).toBe(o2);
});
test('online transaction cannot bypass a held offline account creation', async () => {
 await commitLocalFinanceChange({ownerId:owner,group:'financial_accounts',kind:'create',record:{id:a,name:'Bank'},origin:'offline',operationId:o1});
 await commit(b,o2,'online');
 expect(await claimHybridSyncBatch({ownerId:owner})).toEqual([]);
 expect((await claimHybridSyncBatch({ownerId:owner,approvedOfflineIds:[o1],limit:1}))[0].group).toBe('financial_accounts');
});
test('same operation identity cannot change the server CAS revision', async () => {
 const input={ownerId:owner,group:'transactions',kind:'update',record:row(b),origin:'online',operationId:o1,
  createdAt:'2026-11-09T02:00:00Z',expectedUpdatedAt:'2026-11-09T01:00:00Z'};
 await commitLocalFinanceChange(input);
 await expect(commitLocalFinanceChange({...input,expectedUpdatedAt:'2026-11-09T01:01:00Z'})).rejects.toThrow('collision');
 expect((await listOwnerSyncOperations(owner))[0].expectedUpdatedAt).toBe(input.expectedUpdatedAt);
});
