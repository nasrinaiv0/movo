import { sealFinance, unsealFinance, initialiseFinanceVault } from './financeVault';

const DB = 'movo.loan.requests.v1';
const STORE = 'pending';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const validLoanOwner = value => typeof value === 'string' && UUID.test(value);
function ownerKey(owner) {
  if (!validLoanOwner(owner)) throw new Error('loan_recovery_owner_required');
  return owner;
}
const scope = owner => 'loan-request:' + owner;
function validate(owner, payload) {
  if (!payload || payload.p_expected_user_id !== owner || !validLoanOwner(payload.p_request_id)
    || typeof payload.p_name !== 'string' || !Number.isFinite(payload.p_principal) || payload.p_principal <= 0)
    throw new Error('loan_recovery_invalid_payload');
  return payload;
}
function reveal(owner, entry) {
  if (!entry) return null;
  if (entry.owner !== owner || !entry.sealedData) throw new Error('loan_recovery_integrity_failed');
  return validate(owner, unsealFinance(entry.sealedData, scope(owner)));
}
async function open() {
  if (typeof indexedDB === 'undefined') throw new Error('loan_recovery_storage_unavailable');
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'owner' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('loan_recovery_storage_blocked'));
  });
}
async function transaction(owner, mode, action, { initialise = true } = {}) {
  ownerKey(owner);
  if (initialise) await initialiseFinanceVault();
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      let result, failure;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(failure || tx.error || new Error('loan_recovery_storage_failed'));
      tx.onerror = () => {};
      const read = store.get(owner);
      read.onsuccess = () => {
        try { result = action(store, read.result); }
        catch (error) { failure = error; tx.abort(); }
      };
    });
  } finally { db.close(); }
}
export function readPendingLoan(owner) {
  return transaction(owner, 'readonly', (_, entry) => reveal(owner, entry));
}
/** Reservation and comparison occur under one cross-tab IndexedDB write lock. */
export function reservePendingLoan(owner, payload) {
  validate(ownerKey(owner), payload);
  return transaction(owner, 'readwrite', (store, entry) => {
    const previous = reveal(owner, entry);
    if (previous) {
      if (JSON.stringify(previous) !== JSON.stringify(payload))
        throw new Error('loan_recovery_pending_request');
      return previous;
    }
    const sealedData = sealFinance(payload, scope(owner));
    store.add({ owner, sealedData });
    return payload;
  });
}
/** A stale response cannot clear a newer pending request. */
export function acknowledgePendingLoan(owner, requestId, row) {
  if (!row || row.user_id !== owner || !validLoanOwner(row.id)) throw new Error('loan_recovery_unverified_acknowledgement');
  return transaction(owner, 'readwrite', (store, entry) => {
    const previous = reveal(owner, entry);
    if (previous?.p_request_id === requestId) store.delete(owner);
    return row;
  });
}
/** Explicit device-data/account erasure, never normal sign-out or a failed request. */
export function clearPendingLoanOwner(owner) {
  return transaction(owner, 'readwrite', (store) => { store.delete(owner); return true; }, { initialise: false });
}
