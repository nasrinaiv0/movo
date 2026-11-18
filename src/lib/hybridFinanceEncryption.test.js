import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { webcrypto } from 'crypto';
import { claimHybridSyncBatch, listLocalFinanceRecords, listOwnerSyncOperations, commitLocalFinanceChange } from './hybridLocalStore';
import { migrateHybridFinanceEncryption } from './hybridFinanceEncryption';
import { isSealedFinance, SEALED_TAG } from './financeVault';

const OWNER = '123e4567-e89b-42d3-a456-426614174000';
const OTHER = '223e4567-e89b-42d3-a456-426614174000';
const RECORD = '323e4567-e89b-42d3-a456-426614174000';
const TX = '423e4567-e89b-42d3-a456-426614174000';
const DB_NAME = 'movo.hybrid.finance.v1';
const op = { id: TX, ownerId: OWNER, group: 'transactions', recordId: RECORD, kind: 'create',
  origin: 'offline', status: 'pending', revision: 0, localSequence: 7, claimGeneration: 0,
  approvedAt: null, payload: { id: RECORD, user_id: OWNER, merchant: 'Unsent PRIVATE purchase', amount: 25.50 } };

beforeAll(() => Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true, writable: true }));
beforeEach(() => { globalThis.indexedDB = new IDBFactory(); });

function openRaw(version) {
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open(DB_NAME, version);
    opening.onsuccess = () => resolve(opening.result);
    opening.onerror = () => reject(opening.error);
    opening.onupgradeneeded = () => {
      // Re-create the actual schema used by older clients.
      const db = opening.result;
      db.createObjectStore('records', { keyPath: ['ownerId', 'group', 'recordId'] })
        .createIndex('owner_group', ['ownerId', 'group']);
      db.createObjectStore('operations', { keyPath: 'id' }).createIndex('owner', 'ownerId');
      db.createObjectStore('metadata', { keyPath: 'ownerId' });
    };
  });
}

async function rawEntries(version = 2) {
  const db = await openRaw(version);
  try {
    const transaction = db.transaction(['records','operations','metadata'],'readonly');
    const read = (name) => new Promise((resolve, reject) => {
      const request = transaction.objectStore(name).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return { records: await read('records'), operations: await read('operations'), metadata: await read('metadata') };
  } finally { db.close(); }
}
async function putPlaintextLegacy() {
  const db = await openRaw(1);
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['records','operations','metadata'],'readwrite');
      tx.objectStore('records').put({ ownerId: OWNER, group: 'transactions', recordId: RECORD,
        record: { id: RECORD, user_id: OWNER, merchant: 'Unsent PRIVATE purchase', amount: 25.50 } });
      tx.objectStore('operations').put(op);
      tx.objectStore('metadata').put({ ownerId: OWNER, lastOperationSequence: 7,
        legacyBackup: { owner: OWNER, pendingDeletions: { transactions: [RECORD] } } });
      tx.oncomplete = resolve;
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}
test('atomic migration encrypts legacy pending outbox, row, and backup without changing IDs/order', async () => {
  await putPlaintextLegacy();
  const before = await rawEntries(1);
  expect(JSON.stringify(before)).toContain('Unsent PRIVATE purchase');
  const result = await migrateHybridFinanceEncryption();
  expect(result.upgraded).toBe(3);
  const after = await rawEntries();
  expect(JSON.stringify(after)).not.toContain('Unsent PRIVATE purchase');
  expect(isSealedFinance(after.records[0].record)).toBe(true);
  expect(isSealedFinance(after.operations[0].payload)).toBe(true);
  expect(isSealedFinance(after.metadata[0].legacyBackup)).toBe(true);
  expect(after.operations[0].id).toBe(TX);
  expect(after.operations[0].status).toBe('pending');
  expect(after.operations[0].localSequence).toBe(7);
  expect(after.metadata[0].lastOperationSequence).toBe(7);
  expect((await listLocalFinanceRecords(OWNER, 'transactions'))[0].merchant).toBe('Unsent PRIVATE purchase');
  expect((await listOwnerSyncOperations(OWNER))[0].payload.amount).toBe(25.50);
  expect((await listOwnerSyncOperations(OTHER))).toEqual([]);
  expect((await migrateHybridFinanceEncryption()).upgraded).toBe(0);
});

test('injected interruption aborts the WHOLE transaction; pending records remain recoverable', async () => {
  await putPlaintextLegacy();
  const before = await rawEntries(1);
  await expect(migrateHybridFinanceEncryption({ failAfter: 1 })).rejects.toThrow('test_injected_migration_interruption');
  const after = await rawEntries(1);
  expect(after).toEqual(before);
  expect(after.operations[0].status).toBe('pending');
  await migrateHybridFinanceEncryption();
  expect(isSealedFinance((await rawEntries()).operations[0].payload)).toBe(true);
});

test('a pre-upgrade client cannot reopen the upgraded ledger and write plaintext', async () => {
  await putPlaintextLegacy();
  const oldTab = await openRaw(1);
  oldTab.onversionchange = () => oldTab.close();
  try {
    await migrateHybridFinanceEncryption();
    expect(() => oldTab.transaction('operations', 'readwrite')).toThrow();
    await expect(openRaw(1)).rejects.toMatchObject({ name: 'VersionError' });
    expect((await listOwnerSyncOperations(OWNER))[0]).toEqual(op);
  } finally { oldTab.close(); }
});

test('a blocked upgrade preserves v1 until the old connection closes and the user retries', async () => {
  await putPlaintextLegacy();
  const oldTab = await openRaw(1);
  try {
    await expect(migrateHybridFinanceEncryption()).rejects.toThrow('prior local finance database connection');
    expect(oldTab.version).toBe(1);
  } finally { oldTab.close(); }
  expect((await rawEntries(1)).operations).toEqual([op]);
  await expect(migrateHybridFinanceEncryption()).resolves.toEqual({ upgraded: 3 });
});

test.each([
  ['a corrupt envelope marker', payload => ({ ...payload, [SEALED_TAG]: 0 })],
  ['a replacement plaintext payload', () => op.payload],
])('%s blocks v2 ledger reads without clearing the pending operation', async (_, replacePayload) => {
  await putPlaintextLegacy();
  await migrateHybridFinanceEncryption();
  const db = await openRaw(2);
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction('operations','readwrite');
      const req = tx.objectStore('operations').get(TX);
      req.onsuccess = () => {
        const record = req.result;
        record.payload = replacePayload(record.payload);
        tx.objectStore('operations').put(record);
      };
      tx.oncomplete = resolve; tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
  await expect(listOwnerSyncOperations(OWNER)).rejects.toThrow();
  const raw = (await rawEntries()).operations[0];
  expect(raw.id).toBe(TX); expect(raw.status).toBe('pending');
});

test('a sealing error rolls back all earlier outbox approvals in the same claim', async () => {
  const firstId = '523e4567-e89b-42d3-a456-426614174000';
  const secondId = '623e4567-e89b-42d3-a456-426614174000';
  const wallet = '723e4567-e89b-42d3-a456-426614174000';
  for (const operationId of [firstId, secondId]) {
    await commitLocalFinanceChange({
      operationId, ownerId: OWNER, group: 'financial_accounts', kind: 'create', origin: 'offline',
      record: { id: wallet, name: 'Offline test ledger' },
    });
  }
  const before = await rawEntries();
  const random = webcrypto.getRandomValues.bind(webcrypto);
  const mocked = jest.spyOn(webcrypto, 'getRandomValues')
    .mockImplementationOnce(random)
    .mockImplementationOnce(() => { throw new Error('nonce generation failed'); });
  try {
    await expect(claimHybridSyncBatch({ ownerId: OWNER, approvedOfflineIds: [firstId, secondId] }))
      .rejects.toThrow('nonce generation failed');
  } finally { mocked.mockRestore(); }
  expect((await rawEntries()).operations).toEqual(before.operations);
});

test('new encrypted ledger mutation still confirms record and outbox atomically', async () => {
  const walletId = '523e4567-e89b-42d3-a456-426614174000';
  const opId = '623e4567-e89b-42d3-a456-426614174000';
  const result = await commitLocalFinanceChange({
    ownerId: OWNER, group: 'financial_accounts', kind: 'create', origin: 'offline',
    operationId: opId, record: { id: walletId, name: 'Private salary bank' }
  });
  expect(result.id).toBe(opId);
  const raw = await rawEntries();
  expect(JSON.stringify(raw)).not.toContain('Private salary bank');
  expect((await listLocalFinanceRecords(OWNER, 'financial_accounts'))[0].name).toBe('Private salary bank');
  expect((await listOwnerSyncOperations(OWNER)).find(x=>x.id===opId).status).toBe('pending');
});
