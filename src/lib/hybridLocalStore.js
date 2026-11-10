import { sameSyncedFinanceFields } from './offlineReconciliation';
import { eligibleSyncOperations, makeSyncOperation, pendingOfflineSyncCount, SyncOrigin, SyncStatus } from './hybridSyncPolicy';

/**
 * IndexedDB is the durable local ledger/outbox for the staged hybrid-sync engine.
 * A record and its sync operation commit in the SAME IndexedDB transaction.
 * Existing localStorage workspaces remain authoritative until the migration is
 * separately proven; they are never silently erased by this module.
 */
const DB_NAME = 'movo.hybrid.finance.v1';
const DB_VERSION = 1;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GROUPS = new Set(['financial_accounts', 'transactions']);
const DEFAULT_LEASE_MS = 60_000;
const MAX_LEASE_MS = 10 * 60_000;

function validOwner(value) {
  if (!UUID.test(String(value || ''))) throw new Error('Verified owner UUID required');
  return value;
}
function validRecord(group, record, ownerId, kind) {
  if (!GROUPS.has(group)) throw new Error('Unsupported finance group');
  if (!record || !UUID.test(String(record.id || ''))) throw new Error('Stable record UUID required');
  if (record.user_id && record.user_id !== ownerId) throw new Error('Cross-owner finance record rejected');
  if (kind !== 'delete' && group === 'transactions') {
    if (!UUID.test(String(record.account_id || '')) || !['expense', 'income', 'transfer'].includes(record.transaction_type)) throw new Error('Invalid transaction');
    const cents = Number(record.amount) * 100;
    if (!Number.isSafeInteger(Math.round(cents)) || Math.abs(cents - Math.round(cents)) > 1e-6 || cents <= 0) throw new Error('Transaction amount requires exact positive cents');
  }
}
function request(requestObject) {
  return new Promise((resolve, reject) => {
    requestObject.onsuccess = () => resolve(requestObject.result);
    requestObject.onerror = () => reject(requestObject.error || new Error('IndexedDB operation failed'));
  });
}
function completed(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted'));
    transaction.onerror = () => { /* onabort owns the rejection */ };
  });
}
export function openHybridFinanceStore() {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('Secure local database unavailable'));
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open(DB_NAME, DB_VERSION);
    opening.onupgradeneeded = () => {
      const db = opening.result;
      if (!db.objectStoreNames.contains('records')) {
        const records = db.createObjectStore('records', { keyPath: ['ownerId', 'group', 'recordId'] });
        records.createIndex('owner_group', ['ownerId', 'group']);
      }
      if (!db.objectStoreNames.contains('operations')) {
        const operations = db.createObjectStore('operations', { keyPath: 'id' });
        operations.createIndex('owner', 'ownerId');
      }
      if (!db.objectStoreNames.contains('metadata')) db.createObjectStore('metadata', { keyPath: 'ownerId' });
    };
    opening.onsuccess = () => {
      const db = opening.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    opening.onerror = () => reject(opening.error || new Error('Unable to open local finance database'));
    opening.onblocked = () => reject(new Error('A prior local finance database connection must close before upgrading'));
  });
}
const key = (ownerId, group, recordId) => [ownerId, group, recordId];

/** Commit the ledger mutation and outbox operation atomically or fail as a unit. */
export async function commitLocalFinanceChange({
  ownerId, group, kind, record, origin, operationId, revision = 0,
  createdAt = new Date().toISOString(), expectedUpdatedAt = null,
}) {
  validOwner(ownerId);
  validRecord(group, record, ownerId, kind);
  const op = makeSyncOperation({
    id: operationId, ownerId, recordId: record.id, kind, origin, revision, createdAt,
  });
  const db = await openHybridFinanceStore();
  let transaction, done;
  try {
    transaction = db.transaction(['records', 'operations', 'metadata'], 'readwrite');
    done = completed(transaction);
    done.catch(() => {});
    const records = transaction.objectStore('records');
    const operations = transaction.objectStore('operations');
    const metadata = transaction.objectStore('metadata');
    const existing = await request(operations.get(op.id));
    if (existing) {
      if (existing.ownerId !== ownerId || existing.recordId !== record.id || existing.kind !== kind ||
        existing.origin !== origin || existing.group !== group || existing.revision !== revision ||
        existing.createdAt !== createdAt || (existing.expectedUpdatedAt ?? null) !== expectedUpdatedAt ||
        JSON.stringify(existing.payload) !== JSON.stringify(kind === 'delete' ? null : { ...record, user_id: ownerId }))
        throw new Error('Operation ID collision detected');
      // Exact retries are idempotent and must not repeat a balance mutation.
      return await done.then(() => existing);
    }
    // The UI's preflight check is advisory: another tab may enqueue between
    // that check and this transaction. Fence competing authenticated edits
    // inside IndexedDB's owner-wide readwrite transaction instead.
    if (origin === 'online') {
      const active = await request(operations.index('owner').getAll(IDBKeyRange.only(ownerId)));
      if (active.some(item => item.recordId === record.id && item.group === group &&
        item.id !== op.id && ['pending', 'in_flight', 'conflict'].includes(item.status) &&
        // Legacy same-record operation chains may exist. CAS-bearing edits
        // must never race an earlier operation with a different request ID.
        (expectedUpdatedAt != null || item.kind === kind))) {
        throw new Error('Concurrent edit: sync the pending record change before editing it again.');
      }
      const current = await request(records.get(key(ownerId, group, record.id)));
      if (kind === 'create' && current) {
        throw new Error('Concurrent edit: record already exists locally.');
      }
      if (kind !== 'create' && expectedUpdatedAt != null &&
        current?.record?.updated_at !== expectedUpdatedAt) {
        throw new Error('Concurrent edit: local record revision changed.');
      }
    }
    // Serialize mutations for one owner with a durable sequence allocated in
    // the SAME transaction. UUID index order does not represent posting order.
    const meta = await request(metadata.get(ownerId));
    let lastSequence = meta?.lastOperationSequence;
    if (!Number.isSafeInteger(lastSequence) || lastSequence < 0) {
      // One-time upgrade path for staged journals created before sequencing.
      const older = await request(operations.index('owner').getAll(IDBKeyRange.only(ownerId)));
      lastSequence = older.reduce((highest, item) =>
        Math.max(highest, Number.isSafeInteger(item.localSequence) ? item.localSequence : 0), 0);
    }
    if (!Number.isSafeInteger(lastSequence + 1)) throw new Error('Local operation sequence exhausted');
    const localSequence = lastSequence + 1;
    metadata.put({ ...meta, ownerId, lastOperationSequence: localSequence });
    if (kind === 'delete') records.delete(key(ownerId, group, record.id));
    else records.put({ ownerId, group, recordId: record.id, record: { ...record, user_id: ownerId }, locallyUpdatedAt: createdAt });
    operations.add({ ...op, group, localSequence, claimGeneration: 0, expectedUpdatedAt,
      payload: kind === 'delete' ? null : { ...record, user_id: ownerId } });
    await done;
    return op;
  } catch (error) {
    // A thrown validation/read error does not automatically abort IndexedDB.
    // Explicitly roll back queued writes and consume the completion rejection.
    try { transaction?.abort(); } catch { /* already completed/aborted */ }
    if (done) await done.catch(() => {});
    throw error;
  } finally { db.close(); }
}

export async function listLocalFinanceRecords(ownerId, group) {
  validOwner(ownerId);
  if (!GROUPS.has(group)) throw new Error('Unsupported finance group');
  const db = await openHybridFinanceStore();
  try {
    const tx = db.transaction('records', 'readonly');
    const rows = await request(tx.objectStore('records').index('owner_group')
      .getAll(IDBKeyRange.only([ownerId, group])));
    return rows.map(item => item.record);
  } finally { db.close(); }
}
export async function listOwnerSyncOperations(ownerId) {
  validOwner(ownerId);
  const db = await openHybridFinanceStore();
  try {
    const tx = db.transaction('operations', 'readonly');
    return await request(tx.objectStore('operations').index('owner').getAll(IDBKeyRange.only(ownerId)));
  } finally { db.close(); }
}

/**
 * A claim is an expiring lease, not a permanent in-flight marker. All selection,
 * recovery and fencing updates occur atomically in one owner-scoped transaction.
 * Calling this is not permission to upload: the coordinator verifies identity
 * and entitlement and the server MUST enforce idempotency/CAS before launch.
 */
export async function claimHybridSyncBatch({
  ownerId, approvedOfflineIds = [], limit = 50, now = Date.now(), leaseMs = DEFAULT_LEASE_MS,
}) {
  validOwner(ownerId);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) throw new Error('Invalid sync batch limit');
  if (!Number.isSafeInteger(now) || now < 0 ||
      !Number.isSafeInteger(leaseMs) || leaseMs < 1000 || leaseMs > MAX_LEASE_MS ||
      !Number.isSafeInteger(now + leaseMs)) throw new Error('Invalid sync lease');
  const db = await openHybridFinanceStore();
  try {
    const tx = db.transaction('operations', 'readwrite');
    const done = completed(tx);
    const store = tx.objectStore('operations');
    const owned = await request(store.index('owner').getAll(IDBKeyRange.only(ownerId)));
    // Approval is durable for the complete explicit selection, even when an
    // earlier operation fails or another tab currently owns the lease.
    const approved = new Set(approvedOfflineIds);
    for (const op of owned) {
      if (op.origin === SyncOrigin.OFFLINE && approved.has(op.id) && !op.approvedAt) {
        op.approvedAt = new Date(now).toISOString();
        store.put(op);
      }
    }
    // Existing pre-sequence entries use revision/time as a conservative fallback.
    // Newly committed operations always have an atomic per-owner localSequence.
    // Multiple browser tabs can call this concurrently. Never issue a later
    // batch while an earlier worker still owns a live lease for this owner.
    if (owned.some(op => op.status === SyncStatus.IN_FLIGHT &&
      Number.isSafeInteger(op.leaseExpiresAt) && op.leaseExpiresAt > now)) {
      await done;
      return [];
    }
    const ordered = owned.sort((a, b) => {
      if (Number.isSafeInteger(a.localSequence) && Number.isSafeInteger(b.localSequence))
        return a.localSequence - b.localSequence;
      if (a.group === b.group && a.recordId === b.recordId && a.revision !== b.revision)
        return a.revision - b.revision;
      return Date.parse(a.createdAt) - Date.parse(b.createdAt) || String(a.id).localeCompare(String(b.id));
    });
    const blockedRecords = new Set();
    const claimed = [];
    for (const stored of ordered) {
      if (stored.status === SyncStatus.CONFIRMED) continue;
      const recordKey = String(stored.group) + ':' + String(stored.recordId);
      const dependencies = stored.group === 'transactions' ?
        [stored.payload?.account_id, stored.payload?.transfer_to_account_id].filter(Boolean)
          .map(id => 'financial_accounts:' + id) : [];
      if (blockedRecords.has(recordKey) || dependencies.some(id => blockedRecords.has(id))) {
        blockedRecords.add(recordKey);
        continue;
      }
      const expired = stored.status === SyncStatus.IN_FLIGHT &&
        (!Number.isSafeInteger(stored.leaseExpiresAt) || stored.leaseExpiresAt <= now);
      const candidate = expired ? { ...stored, status: SyncStatus.PENDING } : stored;
      if (!eligibleSyncOperations([candidate], { ownerId, approvedOfflineIds }).length) {
        // Never allow update/delete to bypass an earlier unconfirmed create/update
        // on the same record (even if that earlier operation is held offline).
        blockedRecords.add(recordKey);
        continue;
      }
      const claimGeneration = (Number.isSafeInteger(stored.claimGeneration) ? stored.claimGeneration : 0) + 1;
      if (!Number.isSafeInteger(claimGeneration)) throw new Error('Sync claim generation exhausted');
      const approvedAt = stored.approvedAt ||
        (stored.origin === SyncOrigin.OFFLINE ? new Date(now).toISOString() : null);
      const next = { ...candidate, status: SyncStatus.IN_FLIGHT,
        approvedAt, claimGeneration, leaseExpiresAt: now + leaseMs };
      store.put(next);
      claimed.push(next);
      if (claimed.length >= limit) break;
    }
    await done;
    return claimed;
  } finally { db.close(); }
}

/**
 * The claim generation fences off responses from a worker whose lease expired
 * and was reassigned to another worker. Never trust an operation ID alone.
 */
export async function finalizeHybridSyncOperation({ ownerId, operationId, confirmedRevision, claimGeneration }) {
  validOwner(ownerId);
  const db = await openHybridFinanceStore();
  try {
    const tx = db.transaction('operations', 'readwrite');
    const done = completed(tx);
    const store = tx.objectStore('operations');
    const op = await request(store.get(operationId));
    if (!op || op.ownerId !== ownerId || op.status !== SyncStatus.IN_FLIGHT ||
        !Number.isSafeInteger(claimGeneration) || op.claimGeneration !== claimGeneration ||
        !Number.isSafeInteger(confirmedRevision) || confirmedRevision < op.revision)
      throw new Error('Unverified or superseded sync operation acknowledgement');
    store.put({ ...op, status: SyncStatus.CONFIRMED, confirmedRevision, leaseExpiresAt: null });
    await done;
  } finally { db.close(); }
}

/** Requeue only a claim still owned by this worker. Never demote a newer claim. */
export async function requeueHybridSyncOperation({ ownerId, operationId, claimGeneration }) {
  validOwner(ownerId);
  const db = await openHybridFinanceStore();
  try {
    const tx = db.transaction('operations', 'readwrite');
    const done = completed(tx);
    const store = tx.objectStore('operations');
    const op = await request(store.get(operationId));
    if (!op || op.ownerId !== ownerId || op.status !== SyncStatus.IN_FLIGHT ||
        !Number.isSafeInteger(claimGeneration) || op.claimGeneration !== claimGeneration)
      throw new Error('Sync claim is no longer owned by this worker');
    store.put({ ...op, status: SyncStatus.PENDING, leaseExpiresAt: null });
    await done;
  } finally { db.close(); }
}
export async function countHeldOfflineOperations(ownerId) {
  return pendingOfflineSyncCount(await listOwnerSyncOperations(ownerId), ownerId);
}

/** Delete one verified identity's local finance records and operations on account deletion. */
export async function clearHybridOwner(ownerId) {
  validOwner(ownerId);
  const db = await openHybridFinanceStore();
  try {
    const tx = db.transaction(['records', 'operations', 'metadata'], 'readwrite');
    const done = completed(tx);
    const recordStore = tx.objectStore('records');
    const opStore = tx.objectStore('operations');
    for (const group of GROUPS) {
      const keys = await request(recordStore.index('owner_group').getAllKeys(IDBKeyRange.only([ownerId, group])));
      for (const recordKey of keys) recordStore.delete(recordKey);
    }
    const opKeys = await request(opStore.index('owner').getAllKeys(IDBKeyRange.only(ownerId)));
    for (const operationKey of opKeys) opStore.delete(operationKey);
    tx.objectStore('metadata').delete(ownerId);
    await done;
    return true;
  } finally { db.close(); }
}

/** A direct foreground write uses the same durable intent and verified server ACK. */
export async function acknowledgeDirectHybridWrite(ownerId, operationId, acknowledgement) {
  validOwner(ownerId);
  const db = await openHybridFinanceStore();
  let tx, done;
  try {
    tx = db.transaction(['operations', 'records'], 'readwrite');
    done = completed(tx); done.catch(() => {});
    const operations = tx.objectStore('operations');
    const op = await request(operations.get(operationId));
    if (!op || op.ownerId !== ownerId || acknowledgement?.ownerId !== ownerId ||
        acknowledgement.operationId !== operationId || acknowledgement.recordId !== op.recordId ||
        acknowledgement.revision !== op.revision + 1 || op.status === SyncStatus.IN_FLIGHT)
      throw new Error('Unverified direct write acknowledgement');
    const owned = await request(operations.index('owner').getAll(IDBKeyRange.only(ownerId)));
    const newer = owned.some(other => other.group === op.group && other.recordId === op.recordId && other.localSequence > op.localSequence);
    if (!newer && op.kind !== 'delete') {
      validRecord(op.group, acknowledgement.record, ownerId, 'update');
      tx.objectStore('records').put({ownerId,group:op.group,recordId:op.recordId,record:acknowledgement.record});
    }
    operations.put({...op,status:SyncStatus.CONFIRMED,acknowledgement,confirmedRevision:acknowledgement.revision});
    await done;
  } catch (error) {
    try { tx?.abort(); } catch { /* already complete */ }
    if (done) await done.catch(() => {});
    throw error;
  } finally { db.close(); }
}

/** One atomic migration, retaining the complete legacy snapshot for rollback/export. */
export async function migrateHybridWorkspace(ownerId, snapshot) {
  validOwner(ownerId);
  if (!snapshot || snapshot.owner !== ownerId || !snapshot.baseline || !snapshot.working)
    throw new Error('Verified legacy workspace required');
  for (const group of GROUPS) {
    if (!Array.isArray(snapshot.working[group]) || !Array.isArray(snapshot.baseline[group]))
      throw new Error('Incomplete legacy workspace');
    const ids = new Set();
    for (const row of snapshot.working[group]) {
      validRecord(group,row,ownerId,'create');
      if (ids.has(row.id)) throw new Error('Duplicate legacy record');
      ids.add(row.id);
    }
    for (const row of snapshot.baseline[group]) validRecord(group,row,ownerId,'create');
  }
  const db = await openHybridFinanceStore();
  let tx, done;
  try {
    tx = db.transaction(['records','operations','metadata'],'readwrite');
    done = completed(tx); done.catch(() => {});
    const metaStore=tx.objectStore('metadata');
    const meta=await request(metaStore.get(ownerId));
    if (meta?.legacyMigrationVersion === 1) { await done; return false; }
    const records=tx.objectStore('records');
    // Staged intents always win over the old materialized cache, including tombstones.
    const ops=await request(tx.objectStore('operations').index('owner').getAll(IDBKeyRange.only(ownerId)));
    const touched=new Set(ops.map(op=>op.group+':'+op.recordId));
    for (const group of GROUPS) for (const record of snapshot.working[group]) {
      if (!touched.has(group+':'+record.id)) records.put({ownerId,group,recordId:record.id,record:{...record,user_id:ownerId}});
    }
    metaStore.put({...meta,ownerId,legacyMigrationVersion:1,legacyBackup:snapshot,migratedAt:new Date().toISOString()});
    await done;
    return true;
  } catch (error) {
    try { tx?.abort(); } catch { /* already complete */ }
    if (done) await done.catch(() => {});
    throw error;
  } finally { db.close(); }
}

export async function readHybridMigrationBackup(ownerId) {
  validOwner(ownerId);
  const db=await openHybridFinanceStore();
  try {
    return (await request(db.transaction('metadata','readonly').objectStore('metadata').get(ownerId)))?.legacyBackup || null;
  } finally { db.close(); }
}

/** Retire only intents whose complete net row/tombstone was confirmed by a fresh cloud read. */
export async function acknowledgeReconciledWorkspace(ownerId, confirmed, expectedOperationIds) {
  validOwner(ownerId);
  const allowed=new Set(expectedOperationIds);
  const db=await openHybridFinanceStore();
  try {
    const tx=db.transaction('operations','readwrite');
    const done=completed(tx), store=tx.objectStore('operations');
    const ops=await request(store.index('owner').getAll(IDBKeyRange.only(ownerId)));
    const remoteMaps=new Map([...GROUPS].map(group=>[group,new Map((confirmed[group]||[]).map(row=>[row.id,row]))]));
    const grouped=new Map();
    for(const op of ops){
      const k=op.group+':'+op.recordId;
      if(!grouped.has(k))grouped.set(k,[]);
      grouped.get(k).push(op);
    }
    for(const rows of grouped.values()){
      rows.sort((a,b)=>a.localSequence-b.localSequence);
      const last=rows[rows.length-1];
      if(!allowed.has(last.id)||rows.some(op=>op.status===SyncStatus.IN_FLIGHT))continue;
      const remote=remoteMaps.get(last.group)?.get(last.recordId);
      const local=last.payload?.receipt_path?.startsWith?.('localreceipt:') &&
        remote?.receipt_path?.startsWith(ownerId+'/offline-'+last.recordId+'.')
        ? {...last.payload,receipt_path:remote.receipt_path} : last.payload;
      const matches=last.kind==='delete'?!remote:sameSyncedFinanceFields(local,remote,last.group);
      if(!matches)continue;
      for(const op of rows)if(allowed.has(op.id)&&op.status!==SyncStatus.CONFIRMED)
        store.put({...op,status:SyncStatus.CONFIRMED,reconciledAt:new Date().toISOString()});
    }
    await done;
  } finally {db.close();}
}

/** Confirmed server rejection is not a retryable local save. Keep audit, restore prior projection. */
export async function rejectDirectHybridWrite(ownerId, operationId, previousRecord) {
  validOwner(ownerId);
  const db=await openHybridFinanceStore();
  try {
    const tx=db.transaction(['operations','records'],'readwrite');
    const done=completed(tx), store=tx.objectStore('operations');
    const op=await request(store.get(operationId));
    if(op?.ownerId===ownerId&&op.status===SyncStatus.PENDING){
      store.put({...op,status:SyncStatus.FAILED});
      const all=await request(store.index('owner').getAll(IDBKeyRange.only(ownerId)));
      if(!all.some(other=>other.group===op.group&&other.recordId===op.recordId&&other.localSequence>op.localSequence)){
        if(previousRecord)tx.objectStore('records').put({ownerId,group:op.group,recordId:op.recordId,record:previousRecord});
        else tx.objectStore('records').delete(key(ownerId,op.group,op.recordId));
      }
    }
    await done;
  }finally{db.close();}
}

/** Multi-row imports and related local edits either persist entirely or not at all. */
export async function commitLocalFinanceBatch(ownerId, changes, origin='offline') {
  validOwner(ownerId);
  if(!Array.isArray(changes)||!changes.length)throw new Error('Financial changes required');
  const createdAt=new Date().toISOString();
  const inputs=changes.map(({group,kind,record,expectedUpdatedAt=null})=>{
    validRecord(group,record,ownerId,kind);
    return {...makeSyncOperation({id:globalThis.crypto.randomUUID(),ownerId,recordId:record.id,kind,origin,revision:0,createdAt}),
      group,payload:kind==='delete'?null:{...record,user_id:ownerId},expectedUpdatedAt};
  });
  const db=await openHybridFinanceStore();let tx,done;
  try{
    tx=db.transaction(['records','operations','metadata'],'readwrite');done=completed(tx);done.catch(()=>{});
    const metaStore=tx.objectStore('metadata'),meta=await request(metaStore.get(ownerId));
    const existing=await request(tx.objectStore('operations').index('owner').getAll(IDBKeyRange.only(ownerId)));
    let sequence=existing.reduce((n,op)=>Math.max(n,op.localSequence||0),meta?.lastOperationSequence||0);
    if(!Number.isSafeInteger(sequence+inputs.length))throw new Error('Local operation sequence exhausted');
    for(const op of inputs){
      tx.objectStore('operations').add({...op,localSequence:++sequence,claimGeneration:0});
      if(op.kind==='delete')tx.objectStore('records').delete(key(ownerId,op.group,op.recordId));
      else tx.objectStore('records').put({ownerId,group:op.group,recordId:op.recordId,record:op.payload,locallyUpdatedAt:createdAt});
    }
    metaStore.put({...meta,ownerId,lastOperationSequence:sequence});await done;
    return inputs.map(op=>op.id);
  }catch(error){try{tx?.abort();}catch{}if(done)await done.catch(()=>{});throw error;}
  finally{db.close();}
}

export async function approveHybridOperations(ownerId, operationIds) {
  validOwner(ownerId);const ids=new Set(operationIds),db=await openHybridFinanceStore();
  try{
    const tx=db.transaction('operations','readwrite'),done=completed(tx),store=tx.objectStore('operations');
    const ops=await request(store.index('owner').getAll(IDBKeyRange.only(ownerId)));
    for(const op of ops)if(ids.has(op.id)&&op.origin==='offline'&&!op.approvedAt)
      store.put({...op,approvedAt:new Date().toISOString()});
    await done;
  }finally{db.close();}
}
