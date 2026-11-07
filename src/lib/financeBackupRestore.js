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
  const candidateTransactions = originalTransactions.map(row => {
    if (!row || typeof row !== 'object') return null;
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
