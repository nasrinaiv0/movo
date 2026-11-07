const TRANSACTIONS_KEY = 'movo.local.transactions.v1';
const ACCOUNTS_KEY = 'movo.local.accounts.v1';
const SAMPLES_KEY = 'movo.samples.enabled.v1'; // legacy flag, removed on Clear All

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
  try {
    const store = storage();
    if (!store) return false;
    store.setItem(key, JSON.stringify(value));
    return true;
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
  [TRANSACTIONS_KEY, ACCOUNTS_KEY, SAMPLES_KEY, ...Object.keys(store).filter(key => key.startsWith(WORKSPACE_PREFIX))].forEach(key => {
    try { store.removeItem(key); } catch { cleared = false; }
  });
  return cleared;
}


/** Device-only, account-scoped offline workspace. Never mix a signed-in
 * person's cloud snapshot with legacy guest records. This single-key write
 * is atomic at the browser-storage level: a failed write keeps the prior
 * complete version rather than half-copying accounts and transactions.
 * Browser localStorage is not encrypted; do not describe it as a secure vault.
 */
const WORKSPACE_PREFIX = 'movo.local.workspace.v1.';
const ownerKey = id => /^[a-z0-9-]{1,100}$/i.test(String(id || '')) ? WORKSPACE_PREFIX + String(id) : '';
export function loadUserLocalWorkspace(ownerId) {
  const key = ownerKey(ownerId);
  if (!key) return null;
  try {
    const value = JSON.parse(storage()?.getItem(key) || 'null');
    if (value?.version !== 1 || value.owner !== ownerId
      || !Array.isArray(value.accounts) || !Array.isArray(value.transactions)
      || !Array.isArray(value.postings) || !Array.isArray(value.activities)) return null;
    return {
      accounts: value.accounts.filter(row => row && typeof row.id === 'string' && typeof row.name === 'string'),
      transactions: value.transactions.filter(row => row && row.source !== 'Sample' && row.source !== 'demo'),
      postings: value.postings, activities: value.activities,
      bills: Array.isArray(value.bills) ? value.bills : [],
      billOccurrences: Array.isArray(value.billOccurrences) ? value.billOccurrences : [],
      budgets: Array.isArray(value.budgets) ? value.budgets : [],
      updatedAt: value.updatedAt || '', dirty: value.dirty === true,
    };
  } catch { return null; }
}
export function saveUserLocalWorkspace(ownerId, data) {
  const key = ownerKey(ownerId);
  if (!key || !data || !Array.isArray(data.accounts) || !Array.isArray(data.transactions)
    || !Array.isArray(data.postings) || !Array.isArray(data.activities)) return false;
  const value = { version:1, owner:ownerId, updatedAt:new Date().toISOString(),
    accounts:data.accounts, transactions:data.transactions.filter(row => row && row.source !== 'Sample' && row.source !== 'demo'),
    postings:data.postings, activities:data.activities,
    bills:Array.isArray(data.bills) ? data.bills : [],
    billOccurrences:Array.isArray(data.billOccurrences) ? data.billOccurrences : [],
    budgets:Array.isArray(data.budgets) ? data.budgets : [], dirty: data.dirty === true,
  };
  return writeJson(key, value);
}
