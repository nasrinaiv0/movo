import {
  SyncOrigin, SyncStatus, makeSyncOperation, eligibleSyncOperations,
  pendingOfflineSyncCount, acknowledgeSyncOperation,
} from './hybridSyncPolicy';

const owner = '4a7e20c3-9a0b-4b62-85a8-12b6c30ed410';
const other = '5b7e20c3-9a0b-4b62-85a8-12b6c30ed410';
const record = 'a7b03d40-a811-4eaa-9c31-981e9c5bca10';
const opId = 'c1d03d40-a811-4eaa-9c31-981e9c5bca10';
const otherId = 'd1d03d40-a811-4eaa-9c31-981e9c5bca10';
const create = (id, origin, ownerId = owner) => makeSyncOperation({
  id, ownerId, recordId: record, kind: 'create', origin,
  revision: 2, createdAt: '2026-11-09T12:00:00.000Z',
});

test('online work uploads automatically, offline work waits for explicit approval', () => {
  const online = create(opId, SyncOrigin.ONLINE);
  const offline = create(otherId, SyncOrigin.OFFLINE);
  expect(eligibleSyncOperations([online, offline], { ownerId: owner })).toEqual([online]);
  expect(eligibleSyncOperations([online, offline], {
    ownerId: owner, approvedOfflineIds: [otherId],
  })).toEqual([online, offline]);
});

test('reconnection inspection does not mutate pending records', () => {
  const offline = create(otherId, SyncOrigin.OFFLINE);
  const list = [offline];
  expect(pendingOfflineSyncCount(list, owner)).toBe(1);
  expect(list[0].status).toBe(SyncStatus.PENDING);
});

test('cross-owner records and approvals cannot leak into upload batch', () => {
  const theirs = create(otherId, SyncOrigin.OFFLINE, other);
  expect(eligibleSyncOperations([theirs], {
    ownerId: owner, approvedOfflineIds: [otherId],
  })).toEqual([]);
});

test('repeated operation ids are uploaded once per batch', () => {
  const online = create(opId, SyncOrigin.ONLINE);
  expect(eligibleSyncOperations([online, online], { ownerId: owner })).toHaveLength(1);
});

test('acknowledgement rejects wrong owner, wrong operation and stale revision', () => {
  const op = { ...create(opId, SyncOrigin.ONLINE), status: SyncStatus.IN_FLIGHT };
  const valid = { ownerId: owner, operationId: opId, recordId: record, revision: 2 };
  expect(() => acknowledgeSyncOperation(op, { ...valid, ownerId: other })).toThrow();
  expect(() => acknowledgeSyncOperation(op, { ...valid, operationId: otherId })).toThrow();
  expect(() => acknowledgeSyncOperation(op, { ...valid, revision: 1 })).toThrow();
  expect(acknowledgeSyncOperation(op, valid).status).toBe(SyncStatus.CONFIRMED);
});

test('invalid identities and revisions are rejected before journal insertion', () => {
  expect(() => create('bad-id', SyncOrigin.ONLINE)).toThrow();
  expect(() => makeSyncOperation({ id: opId, ownerId: owner, recordId: record,
    kind: 'create', origin: SyncOrigin.OFFLINE, revision: -1,
    createdAt: '2026-11-09T12:00:00Z' })).toThrow();
});

test('persisted manual approval remains valid for retry after an interrupted worker', () => {
  const approvedOp = { ...create(opId, SyncOrigin.OFFLINE), approvedAt:'2026-11-09T12:00:00.000Z' };
  expect(eligibleSyncOperations([approvedOp], { ownerId: owner })).toEqual([approvedOp]);
});
