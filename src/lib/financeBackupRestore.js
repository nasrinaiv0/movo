import { normalizeAccount, normalizeTransaction } from './dataImport';
import { transactionEffect } from './financeCalculations';

const normalizedName = value => String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
const sourceKey = value => value === null || value === undefined || value === '' ? '' : String(value);
const compatible = (current, incoming) => {
  const expected = String(incoming.account_type || incoming.type || 'other').toLowerCase();
  return (!current.account_type || expected === 'other' || current.account_type === expected)
    && (!current.currency || !incoming.currency || String(current.currency).toUpperCase() === String(incoming.currency).toUpperCase());
};

/**
 * Additive, local-only replay of MOVO backup accounts and transactions.
 * Source IDs are untrusted references, never reused as local owner identities.
 * Identically named accounts must be kept separate and transactions are mapped
 * by their source IDs, never by the first bank with that display name.
 */
export function prepareFinanceBackupRestore(backup, existing, { base = 'PHP', newId, fingerprint }) {
  const accountsIn = Array.isArray(backup?.tables?.financial_accounts) && backup.tables.financial_accounts.length
    ? backup.tables.financial_accounts : (backup?.accounts || []);
  const transactionsIn = Array.isArray(backup?.tables?.transactions) && backup.tables.transactions.length
    ? backup.tables.transactions : (backup?.transactions || []);
  if (!Array.isArray(accountsIn) || !Array.isArray(transactionsIn)
    || accountsIn.length > 20000 || transactionsIn.length > 20000)
    throw new Error('A single restore supports up to 20,000 accounts or transactions.');

  const namesCount = new Map();
  const sourceIds = new Set();
  const sources = accountsIn.map(row => {
    if (!row || typeof row !== 'object' || !normalizedName(row.name))
      throw new Error('This backup contains an account without a valid name. No records were changed.');
    const name = normalizedName(row.name);
    namesCount.set(name, (namesCount.get(name) || 0) + 1);
    const key = sourceKey(row.id);
    if (key && sourceIds.has(key))
      throw new Error('This backup has duplicate account identifiers. No records were changed.');
    if (key) sourceIds.add(key);
    const directOpening = row.opening_balance === null || row.opening_balance === '' || row.opening_balance === undefined
      ? NaN : Number(row.opening_balance);
    const existingBalance = row.balance === null || row.balance === '' || row.balance === undefined
      ? NaN : Number(row.balance);
    const opening = Number.isFinite(directOpening) ? directOpening
      : existingBalance - transactionsIn.reduce((sum, item) => sum + transactionEffect(item, row.id), 0);
    if (!Number.isFinite(opening))
      throw new Error('Some accounts lack valid balances or identifiers. Import stopped without changes.');
    const normalized = normalizeAccount({
      name: row.name, account_type: row.account_type || row.type,
      institution_name: row.institution_name, currency: row.currency,
      balance: opening, mask: row.mask || row.last4,
    });
    if (!normalized)
      throw new Error('Some accounts lack valid balances or identifiers. Import stopped without changes.');
    return { row, key, name, normalized };
  });
  if (sources.some(({ key, name }) => namesCount.get(name) > 1 && !key))
    throw new Error('Same-name accounts in this backup need distinct identifiers to keep their transactions separate.');

  const current = [...(existing?.accounts || [])];
  const accounts = [];
  const bySourceId = new Map();
  const byName = new Map();
  const skipped = { duplicates: 0, conflicts: 0 };
  const batchId = 'backup-' + Date.now().toString(36);
  let index = 0;
  const makeId = prefix => newId?.() || prefix + '-' + batchId + '-' + (++index);
  const register = (name, id) => {
    if (!byName.has(name)) byName.set(name, new Set());
    byName.get(name).add(id);
  };

  for (const item of sources) {
    const { row, key, name, normalized } = item;
    let match = key ? current.find(a => (sourceKey(a.id) === key || sourceKey(a.import_source_account_id) === key)
      && normalizedName(a.name) === name) : null;
    // Legacy name fallback is only safe when the name is unique on both sides.
    if (!match && namesCount.get(name) === 1) {
      const sameName = current.filter(a => normalizedName(a.name) === name);
      if (sameName.length > 1) throw new Error('Multiple existing accounts share a name. Resolve duplicate account names before importing.');
      match = sameName[0] || null;
    }
    if (match && !compatible(match, row))
      throw new Error('An existing account has the same name but a different type or currency. Rename the imported account before saving.');
    if (!match) {
      match = {
        id: makeId('local-account'), name: normalized.name, account_type: normalized.account_type,
        institution_name: normalized.institution_name, currency: normalized.currency || base,
        opening_balance: normalized.opening_balance, balance: normalized.opening_balance,
        is_archived: false, mask: normalized.mask, brand: 'blue',
        source: 'File Import', import_batch: batchId,
        ...(key ? { import_source_account_id: key } : {}),
      };
      if (current.some(a => String(a.id) === String(match.id)))
        throw new Error('New account identifiers collided with local records. No records were changed.');
      accounts.push(match); current.push(match);
    } else {
      skipped.duplicates += 1;
    }
    if (key) bySourceId.set(key, match.id);
    register(name, match.id);
  }

  const resolveName = value => {
    const name = normalizedName(value);
    if (!name) return '';
    const candidates = new Set([...(byName.get(name) || []),
      ...current.filter(a => normalizedName(a.name) === name).map(a => a.id)]);
    if (candidates.size > 1)
      throw new Error('The backup refers to an ambiguous account name. Use account identifiers to distinguish accounts before importing.');
    return [...candidates][0] || '';
  };
  const resolveAccount = (id, name, destination = false) => {
    const key = sourceKey(id);
    if (key && key !== 'local') {
      if (!bySourceId.has(key))
        throw new Error(destination
          ? 'A transfer references a missing destination account. Import stopped without changes.'
          : 'A transaction references an account not included in the backup. Import stopped without changes.');
      return bySourceId.get(key);
    }
    return resolveName(name) || (destination ? '' : 'local');
  };

  const knownFingerprints = new Set((existing?.transactions || []).map(fingerprint));
  const transactions = [];
  for (const row of transactionsIn) {
    if (!row || typeof row !== 'object')
      throw new Error('Some transactions have missing amounts, dates or descriptions. No records were saved.');
    // Cloud accounting activity (allocations and similar) is not a transaction: never replay it as an expense.
    const rowType = String(row.transaction_type || row.type || '').toLowerCase();
    if (rowType && !['income', 'expense', 'transfer'].includes(rowType)) { skipped.accounting = (skipped.accounting || 0) + 1; continue; }
    const normalized = normalizeTransaction({
      merchant: row.merchant, amount: row.origAmount ?? row.amount,
      transaction_type: row.transaction_type || row.type,
      occurred_at: row.occurred_at || row.date, currency: row.origCurrency || row.currency,
      category: row.category, note: row.note,
    });
    if (!normalized)
      throw new Error('Some transactions have missing amounts, dates or descriptions. No records were saved.');
    const originalTime = row.occurred_at || row.date;
    if (!Number.isFinite(Date.parse(originalTime)))
      throw new Error('Some transactions have missing amounts, dates or descriptions. No records were saved.');
    normalized.occurred_at = new Date(originalTime).toISOString();
    const from = resolveAccount(row.account_id, row.account_name || row.accountName);
    const to = normalized.transaction_type === 'transfer'
      ? resolveAccount(row.transfer_to_account_id, row.to_account_name, true) : undefined;
    if (normalized.transaction_type === 'transfer' && (!to || to === from)) {
      skipped.conflicts += 1;
      continue;
    }
    const fp = fingerprint({ ...normalized, account_id: from, transfer_to_account_id: to });
    if (knownFingerprints.has(fp)) { skipped.duplicates += 1; continue; }
    knownFingerprints.add(fp);
    // Keep the record's own category (stable id or custom text), not the importer's generic "Income".
    const ownCategory = typeof (row.categoryId || row.category) === 'string' ? String(row.categoryId || row.category).trim().slice(0, 60) : '';
    const text = (value, max) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null);
    transactions.push({
      id: makeId('import'), merchant: normalized.merchant, amount: normalized.amount,
      currency: normalized.currency || base, transaction_type: normalized.transaction_type,
      category: normalized.transaction_type === 'transfer' ? 'Transfer' : (ownCategory || normalized.category),
      account_id: from, transfer_to_account_id: to,
      occurred_at: normalized.occurred_at, note: normalized.note,
      payment_reference: text(row.payment_reference, 120), receipt_note: text(row.receipt_note, 500),
      // The receipt image travels as a backup attachment under this path; the app stores it on this device.
      ...(text(row.receipt_path, 500) ? { receipt_source_path: text(row.receipt_path, 500) } : {}),
      source: 'File Import', import_batch: batchId, external_reference: fp,
    });
  }
  return {
    accounts, transactions, skipped, accountIdMap: Object.fromEntries(bySourceId),
    unsupported: Object.keys(backup?.tables || {}).filter(name => !['local_preferences', 'user_preferences', 'financial_accounts', 'transactions'].includes(name)
      && Array.isArray(backup.tables[name]) && backup.tables[name].length > 0),
  };
}
