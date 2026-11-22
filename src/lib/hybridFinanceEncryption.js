import { secureHybridEntry } from './financeVault';

const DB_NAME = 'movo.hybrid.finance.v1';
const DB_VERSION = 2;

function ensureSchema(db) {
  if (!db.objectStoreNames.contains('records')) {
    const records = db.createObjectStore('records', { keyPath: ['ownerId', 'group', 'recordId'] });
    records.createIndex('owner_group', ['ownerId', 'group']);
  }
  if (!db.objectStoreNames.contains('operations')) {
    const operations = db.createObjectStore('operations', { keyPath: 'id' });
    operations.createIndex('owner', 'ownerId');
  }
  if (!db.objectStoreNames.contains('metadata')) db.createObjectStore('metadata', { keyPath: 'ownerId' });
}

/**
 * Advance the database version and encrypt existing rows in one transaction.
 * An interrupted upgrade keeps the entire v1 journal readable on retry.
 * Once v2 commits, a previous app tab opening the database at v1 cannot write
 * plaintext or overwrite the pending operations it cannot decode.
 */
function openEncryptedHybridFinanceStore({ failAfter = -1 } = {}) {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('Secure local database unavailable'));
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open(DB_NAME, DB_VERSION);
    let blocked = false;
    let cause;
    let upgraded = 0;

    opening.onupgradeneeded = () => {
      const tx = opening.transaction;
      const abort = error => {
        if (cause) return;
        cause = error;
        try { tx.abort(); } catch { /* transaction may already be aborting */ }
      };
      if (blocked) {
        abort(new Error('A prior local finance database connection must close before upgrading'));
        return;
      }
      try {
        ensureSchema(opening.result);
        // Transform the durable payloads without changing operation IDs,
        // order, approvals, leases or acknowledgement state.
        for (const name of ['records', 'operations', 'metadata']) {
          const request = tx.objectStore(name).openCursor();
          request.onsuccess = () => {
            const cursor = request.result;
            if (!cursor) return;
            try {
              const original = cursor.value;
              const encrypted = secureHybridEntry(original);
              if (Object.keys(original).some(key => original[key] !== encrypted[key])) {
                if (process.env.NODE_ENV === 'test' && failAfter >= 0 && upgraded >= failAfter) {
                  throw new Error('test_injected_migration_interruption');
                }
                const write = cursor.update(encrypted);
                write.onerror = () => abort(write.error);
                upgraded += 1;
              }
              cursor.continue();
            } catch (error) { abort(error); }
          };
          request.onerror = () => abort(request.error);
        }
      } catch (error) { abort(error); }
    };
    opening.onsuccess = () => {
      const db = opening.result;
      db.onversionchange = () => db.close();
      if (blocked) {
        db.close();
        return;
      }
      resolve({ db, upgraded });
    };
    opening.onerror = () => reject(cause || opening.error || new Error('Unable to open local finance database'));
    opening.onblocked = () => {
      blocked = true;
      reject(new Error('A prior local finance database connection must close before upgrading'));
    };
  });
}

export async function openHybridFinanceStore() {
  const { db } = await openEncryptedHybridFinanceStore();
  return db;
}

export async function migrateHybridFinanceEncryption(options) {
  const { db, upgraded } = await openEncryptedHybridFinanceStore(options);
  db.close();
  return { upgraded };
}
