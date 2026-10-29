const TRANSACTIONS_KEY = 'movo.local.transactions.v1';
const ACCOUNTS_KEY = 'movo.local.accounts.v1';
const SAMPLES_KEY = 'movo.samples.enabled.v1';

function storage() {
  try { return typeof window !== 'undefined' ? window.localStorage : null; } catch { return null; }
}
function readArray(key) {
  try {
    const raw = storage()?.getItem(key);
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}
function writeJson(key, value) {
  try { storage()?.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

/** Sample rows are passed in from the demo fixture and are never persisted as user data. */
export function loadLocalTransactions(sampleRows = [], samplesEnabled = areSamplesEnabled()) {
  const stored = readArray(TRANSACTIONS_KEY).filter(row => row && row.source !== 'Sample');
  const storedIds = new Set(stored.map(row => row.id));
  return [...(samplesEnabled ? sampleRows.filter(row => !storedIds.has(row.id)) : []), ...stored];
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
export function areSamplesEnabled() {
  try { return storage()?.getItem(SAMPLES_KEY) !== 'false'; } catch { return true; }
}
export function setSamplesEnabled(enabled) {
  try { storage()?.setItem(SAMPLES_KEY, enabled ? 'true' : 'false'); return true; } catch { return false; }
}
export function clearLocalFinanceData() {
  try {
    const store = storage();
    store?.removeItem(TRANSACTIONS_KEY);
    store?.removeItem(ACCOUNTS_KEY);
    store?.removeItem(SAMPLES_KEY);
    return true;
  } catch { return false; }
}
