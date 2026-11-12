/**
 * Crash-safe, atomic encryption upgrade of MOVO's existing IndexedDB ledger.
 * All row/order/status metadata and unacknowledged intents stay in place. Only
 * sensitive record, payload, acknowledgement, and legacyBackup are replaced by
 * authenticated ciphertext in ONE readwrite transaction across all stores.
 */
import { secureHybridEntry } from './financeVault';
import { openHybridFinanceStore } from './hybridLocalStore';

export async function migrateHybridFinanceEncryption({ failAfter = -1 } = {}) {
  const db = await openHybridFinanceStore();
  const storeNames = ['records', 'operations', 'metadata'];
  let transaction, count = 0;
  try {
    return await new Promise((resolve, reject) => {
      try { transaction = db.transaction(storeNames, 'readwrite'); }
      catch (e) { reject(e); return; }
      let cause;
      // No awaits or new transactions within cursor callbacks. A thrown error
      // explicitly aborts the WHOLE upgrade, including earlier cursor.update().
      for (const storeName of storeNames) {
        const cursorRequest = transaction.objectStore(storeName).openCursor();
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (!cursor) return;
          try {
            const original = cursor.value;
            const encrypted = secureHybridEntry(original);
            if (Object.keys(original).some(k => original[k] !== encrypted[k])) {
              if (process.env.NODE_ENV === 'test' && failAfter >= 0 && count >= failAfter)
                throw new Error('test_injected_migration_interruption');
              cursor.update(encrypted);
              count += 1;
            }
            cursor.continue();
          } catch (error) {
            cause = error;
            try { transaction.abort(); } catch {}
          }
        };
        cursorRequest.onerror = () => { cause = cursorRequest.error; try { transaction.abort(); } catch {} };
      }
      transaction.oncomplete = () => resolve({ upgraded: count });
      transaction.onabort = () => reject(cause || transaction.error || new Error('financial_migration_transaction_aborted'));
      transaction.onerror = () => { /* abort is the single failure owner */ };
    });
  } finally { db.close(); }
}
