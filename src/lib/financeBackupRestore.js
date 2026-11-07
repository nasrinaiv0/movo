import { normalizeAccount, normalizeTransaction, planImport } from './dataImport';
import { transactionEffect } from './financeCalculations';

/**
 * Plan a safe *additive* replay of exported accounts and transactions. The
 * uploaded file can never select an owner: all server writes use the session
 * owner and new IDs. Never replay old foreign keys or user preferences.
 */
export function prepareFinanceBackupRestore(backup, existing, { base = 'PHP', newId, fingerprint }) {
  const originalAccounts = Array.isArray(backup?.tables?.financial_accounts) && backup.tables.financial_accounts.length
    ? backup.tables.financial_accounts : (backup?.accounts || []);
  const originalTransactions = Array.isArray(backup?.tables?.transactions) && backup.tables.transactions.length
    ? backup.tables.transactions : (backup?.transactions || []);
  if (originalAccounts.length > 20000 || originalTransactions.length > 20000) throw new Error('A single restore supports up to 20,000 accounts or transactions.');
  // The generic planner maps transaction accounts by display name. Refuse an
  // ambiguous name before any write so two different cards/banks cannot be
  // silently combined into a single ledger.
  const normalizedName = value => String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
  const sourceNames = new Set();
  for (const account of originalAccounts) {
    const name = normalizedName(account?.name);
    if (!name || sourceNames.has(name)) throw new Error('This backup contains missing or duplicate account names. Rename each account uniquely before importing.');
    sourceNames.add(name);
    const matching = (existing?.accounts || []).filter(row => normalizedName(row?.name) === name);
    if (matching.length > 1) throw new Error('Multiple existing accounts share a name. Resolve duplicate account names before importing.');
    if (matching.length) {
      const current = matching[0];
      const expectedType = String(account.account_type || account.type || 'other').toLowerCase();
      if ((current.account_type && expectedType !== 'other' && current.account_type !== expectedType)
        || (current.currency && account.currency && String(current.currency).toUpperCase() !== String(account.currency).toUpperCase())) {
        throw new Error('An existing account has the same name but a different type or currency. Rename the imported account before saving.');
      }
    }
  }
  const names = new Map(originalAccounts.filter(a => a?.id && typeof a.name === 'string').map(a => [String(a.id), a.name]));
  const candidateAccounts = originalAccounts.map(account => {
    if (!account || typeof account !== 'object') return null;
    let opening = Number(account.opening_balance);
    if (!Number.isFinite(opening)) {
      const current = Number(account.balance);
      if (!Number.isFinite(current)) return null;
      const posted = originalTransactions.reduce((total, row) => total + transactionEffect(row, account.id), 0);
      opening = current - posted;
    }
    return normalizeAccount({
      name: account.name, account_type: account.account_type || account.type,
      institution_name: account.institution_name, currency: account.currency,
      balance: opening, mask: account.mask || account.last4,
    });
  }).filter(Boolean);
  if (candidateAccounts.length !== originalAccounts.length) throw new Error('Some accounts lack valid balances or identifiers. Import stopped without changes.');
  const candidateTransactions = originalTransactions.map(row => {
    if (!row || typeof row !== 'object') return null;
    if (row.account_id && row.account_id !== 'local'
        && !names.has(String(row.account_id)) && !row.account_name && !row.accountName) {
      throw new Error('A transaction references an account not included in the backup. Import stopped without changes.');
    }
    if (row.transfer_to_account_id && !names.has(String(row.transfer_to_account_id))
        && !row.to_account_name) {
      throw new Error('A transfer references a missing destination account. Import stopped without changes.');
    }
    const sourceName = names.get(String(row.account_id)) || row.account_name || row.accountName || '';
    const targetName = names.get(String(row.transfer_to_account_id)) || row.to_account_name || '';
    const value = normalizeTransaction({
      merchant: row.merchant, amount: row.origAmount ?? row.amount,
      transaction_type: row.transaction_type || row.type,
      occurred_at: row.occurred_at || row.date,
      currency: row.origCurrency || row.currency,
      account_name: sourceName, to_account_name: targetName,
      category: row.category, note: row.note,
    });
    // Keep full timestamp rather than silently rewriting a transaction to noon.
    if (value && Number.isFinite(Date.parse(row.occurred_at || row.date))) {
      value.occurred_at = new Date(row.occurred_at || row.date).toISOString();
    }
    return value;
  }).filter(Boolean);
  if (candidateTransactions.length !== originalTransactions.length) {
    throw new Error('Some transactions have missing amounts, dates or descriptions. No records were saved.');
  }
  const planned = planImport({
    accounts: candidateAccounts, transactions: candidateTransactions,
    subscriptions: [], budgets: [], plans: [], loans: [], receivables: [], bills: [], skipped: 0, errors: [],
  }, existing, {
    base, newId, batchId: 'backup-' + Date.now().toString(36), fingerprint,
  });
  return {
    accounts: planned.accounts, transactions: planned.transactions, skipped: planned.skipped,
    unsupported: Object.keys(backup?.tables || {}).filter(name => !['local_preferences','financial_accounts','transactions'].includes(name)
      && Array.isArray(backup.tables[name]) && backup.tables[name].length > 0),
  };
}
