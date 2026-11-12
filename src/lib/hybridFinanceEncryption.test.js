import 'fake-indexeddb/auto';
import { webcrypto } from 'crypto';
import { openHybridFinanceStore, listLocalFinanceRecords, listOwnerSyncOperations, commitLocalFinanceChange } from './hybridLocalStore';
import { migrateHybridFinanceEncryption } from './hybridFinanceEncryption';
import { isSealedFinance, SEALED_TAG } from './financeVault';

const OWNER = '123e4567-e89b-42d3-a456-426614174000';
const OTHER = '223e4567-e89b-42d3-a456-426614174000';
const RECORD = '323e4567-e89b-42d3-a456-426614174000';
const TX = '423e4567-e89b-42d3-a456-426614174000';
const op = { id: TX, ownerId: OWNER, group: 'transactions', recordId: RECORD, kind: 'create',
  origin: 'offline', status: 'pending', revision: 0, localSequence: 7, claimGeneration: 0,
  approvedAt: null, payload: { id: RECORD, user_id: OWNER, merchant: 'Unsent PRIVATE purchase', amount: 25.50 } };

beforeAll(() => Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true, writable: true }));
async function rawEntries() {
  const db = await openHybridFinanceStore();
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
  const db = await openHybridFinanceStore();
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
async function removeAll() {
  const db = await openHybridFinanceStore();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['records','operations','metadata'],'readwrite');
      for(const name of ['records','operations','metadata']) tx.objectStore(name).clear();
      tx.oncomplete = resolve; tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}
beforeEach(async () => { await removeAll(); });
afterEach(async () => { await removeAll(); });

test('atomic migration encrypts legacy pending outbox, row, and backup without changing IDs/order', async () => {
  await putPlaintextLegacy();
  const before = await rawEntries();
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
  const before = await rawEntries();
  await expect(migrateHybridFinanceEncryption({ failAfter: 1 })).rejects.toThrow();
  const after = await rawEntries();
  expect(after).toEqual(before);
  expect((await listOwnerSyncOperations(OWNER))[0].status).toBe('pending');
  await migrateHybridFinanceEncryption();
  expect(isSealedFinance((await rawEntries()).operations[0].payload)).toBe(true);
});

test('tampered owner/ciphertext blocks ledger reads without clearing pending operation', async () => {
  await putPlaintextLegacy();
  await migrateHybridFinanceEncryption();
  const db = await openHybridFinanceStore();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction('operations','readwrite');
      const req = tx.objectStore('operations').get(TX);
      req.onsuccess = () => {
        const record = req.result;
        record.payload = { ...record.payload, [SEALED_TAG]: 0 };
        tx.objectStore('operations').put(record);
      };
      tx.oncomplete = resolve; tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
  await expect(listOwnerSyncOperations(OWNER)).rejects.toThrow('envelope_corrupt');
  const raw = (await rawEntries()).operations[0];
  expect(raw.id).toBe(TX); expect(raw.status).toBe('pending');
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
