import { loadFinanceJson, saveFinanceJson } from './financeVault';
const TRANSACTIONS_KEY = 'movo.local.transactions.v1';
const ACCOUNTS_KEY = 'movo.local.accounts.v1';
const SAMPLES_KEY = 'movo.samples.enabled.v1'; // legacy flag, removed on Clear All

function storage() {
  try { return typeof window !== 'undefined' ? window.localStorage : null; } catch { return null; }
}
function readArray(key) {
  const value = loadFinanceJson(key);
  return Array.isArray(value) ? value : [];
}
function writeJson(key, value) {
  try {
    const store = storage();
    if (!store) return false;
    return saveFinanceJson(key, value);
  } catch { return false; }
}

/** The person's own records; legacy sample rows from older versions are dropped. */
export function loadLocalTransactions() {
  return readArray(TRANSACTIONS_KEY).filter(row => row && row.source !== 'Sample' && row.source !== 'demo');
}
export function saveLocalTransactions(rows, cloudMode = false) {
  if (cloudMode || !Array.isArray(rows)) return false;
  return writeJson(TRANSACTIONS_KEY, rows.filter(row => row && row.source !== 'Sample' && row.source !== 'demo'));
}
export function loadLocalAccounts() {
  return readArray(ACCOUNTS_KEY).filter(row => row && typeof row.id === 'string' && typeof row.name === 'string');
}
export function saveLocalAccounts(accounts) {
  if (!Array.isArray(accounts)) return false;
  return writeJson(ACCOUNTS_KEY, accounts);
}
export function clearLocalFinanceData() {
  const store = storage();
  if (!store) return false;
  let cleared = true;
  [TRANSACTIONS_KEY, ACCOUNTS_KEY, SAMPLES_KEY].forEach(key => {
    try { store.removeItem(key); } catch { cleared = false; }
  });
  return cleared;
}
