import { parseCsvRows, parseCsvTransactions } from './csvImport';

/* Reads a person's own CSV or JSON file in the browser (nothing is uploaded) and
 * returns MOVO-shaped accounts (incl. cards and balances), transactions,
 * subscriptions, budgets and savings plans. Every value is checked and trimmed;
 * unknown fields are ignored. */

export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 20000;
const ACCOUNT_TYPES = ['bank', 'card', 'e_wallet', 'cash', 'investment', 'other'];
const CYCLES = ['weekly', 'monthly', 'quarterly', 'yearly'];

const key = (v) => String(v || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const text = (v, n) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim().slice(0, n) : '');
const num = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) && Math.abs(v) < 1e17 ? Math.round(v * 100) / 100 : null;
  const s = String(v ?? '').trim().replace(/[₱$€£¥,\s]/g, '');
  if (!s) return null;
  const n = Number(/^\(.*\)$/.test(s) ? '-' + s.slice(1, -1) : s);
  return Number.isFinite(n) && Math.abs(n) < 1e17 ? Math.round(n * 100) / 100 : null;
};
const currency = (v) => (/^[A-Z]{3}$/.test(String(v || '').trim().toUpperCase()) ? String(v).trim().toUpperCase() : '');
const day = (v) => {
  const s = String(v || '').trim();
  if (!s) return '';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T12:00:00Z`) : new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};
/* First value whose field name matches one of the names (case and punctuation ignored). */
const pick = (obj, names) => {
  for (const [k, v] of Object.entries(obj || {})) if (names.includes(key(k)) && v !== null && v !== undefined && v !== '') return v;
  return undefined;
};

function accountType(raw, hint) {
  const v = key(raw);
  if (ACCOUNT_TYPES.includes(v)) return v;
  if (v === 'ewallet' || v === 'wallet') return 'e_wallet';
  if (/card|credit|debit/.test(v) || hint === 'card') return 'card';
  if (/bank|savings|checking|current/.test(v)) return 'bank';
  if (/cash/.test(v)) return 'cash';
  if (/invest|stock|fund|crypto|broker/.test(v)) return 'investment';
  return 'other';
}

export function normalizeAccount(raw, hint) {
  if (!raw || typeof raw !== 'object') return null;
  const name = text(pick(raw, ['name', 'accountname', 'account', 'title', 'label', 'cardname']), 100);
  if (!name) return null;
  const balance = num(pick(raw, ['balance', 'currentbalance', 'openingbalance', 'amount', 'available', 'availablebalance']));
  const digits = String(pick(raw, ['mask', 'last4', 'lastfour', 'cardnumber', 'number']) ?? '').replace(/\D/g, '');
  return {
    name, account_type: accountType(pick(raw, ['type', 'accounttype', 'kind', 'category']), hint),
    institution_name: text(pick(raw, ['institution', 'institutionname', 'bank', 'issuer', 'provider']), 100),
    currency: currency(pick(raw, ['currency', 'ccy'])), opening_balance: balance ?? 0,
    mask: digits.length >= 4 ? digits.slice(-4) : '',
  };
}

export function normalizeTransaction(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const merchant = text(pick(raw, ['merchant', 'description', 'payee', 'title', 'name', 'details']), 160);
  const signed = num(pick(raw, ['amount', 'value', 'transactionamount']));
  const date = day(pick(raw, ['date', 'occurredat', 'transactiondate', 'timestamp', 'createdat']));
  if (!merchant || signed === null || signed === 0 || !date) return null;
  const t = key(pick(raw, ['type', 'transactiontype', 'direction', 'kind']));
  const type = ['income', 'credit', 'deposit', 'received'].includes(t) ? 'income'
    : ['transfer', 'internaltransfer'].includes(t) ? 'transfer'
      : ['expense', 'debit', 'purchase', 'payment', 'withdrawal'].includes(t) ? 'expense'
        : signed > 0 && !t ? 'income' : 'expense';
  return {
    merchant, amount: Math.abs(signed), transaction_type: type,
    category: type === 'income' ? 'Income' : type === 'transfer' ? 'Transfer' : (text(pick(raw, ['category', 'subcategory']), 60) || 'Other'),
    occurred_at: `${date}T12:00:00.000Z`, currency: currency(pick(raw, ['currency', 'ccy'])) || 'PHP',
    account_name: text(pick(raw, ['account', 'accountname', 'fromaccount', 'paymentmethod', 'card']), 100),
    to_account_name: text(pick(raw, ['toaccount', 'destinationaccount', 'transferto']), 100),
    note: text(pick(raw, ['note', 'memo', 'remarks']), 1000), source: 'file_import',
  };
}

export function normalizeSubscription(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = text(pick(raw, ['name', 'service', 'title', 'merchant']), 60);
  const amount = num(pick(raw, ['amount', 'price', 'cost', 'fee']));
  if (!name || amount === null || amount <= 0) return null;
  const c = key(pick(raw, ['cycle', 'billingcycle', 'frequency', 'interval', 'period']));
  const cycle = CYCLES.includes(c) ? c : /week/.test(c) ? 'weekly' : /year|annual/.test(c) ? 'yearly' : /quarter|3month/.test(c) ? 'quarterly' : 'monthly';
  return {
    name, amount: Math.abs(amount), currency: currency(pick(raw, ['currency', 'ccy'])), cycle,
    start: day(pick(raw, ['start', 'nextbillingdate', 'nextbilling', 'renewal', 'renewaldate', 'nextpayment', 'startdate', 'due'])) || new Date().toISOString().slice(0, 10),
    category: text(pick(raw, ['category']), 40) || 'Other', status: key(pick(raw, ['status'])) === 'paused' ? 'paused' : 'active',
  };
}

export function normalizeBudget(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const category = text(pick(raw, ['category', 'name']), 60);
  const limit = num(pick(raw, ['monthlylimit', 'limit', 'amount', 'budget']));
  return category && limit !== null && limit > 0 ? { category, monthly_limit: limit } : null;
}

export function normalizePlan(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = text(pick(raw, ['name', 'goal', 'title']), 60);
  const target = num(pick(raw, ['target', 'targetamount', 'goalamount', 'amount']));
  if (!name || target === null || target <= 0) return null;
  return { name, target, saved: Math.max(0, num(pick(raw, ['saved', 'savedamount', 'current', 'progress'])) ?? 0), due: day(pick(raw, ['due', 'deadline', 'targetdate', 'date'])) };
}

const LISTS = {
  accounts: ['accounts', 'wallets', 'balances'],
  cards: ['cards', 'creditcards', 'debitcards'],
  transactions: ['transactions', 'records', 'entries', 'expenses', 'history'],
  subscriptions: ['subscriptions', 'subs', 'recurring'],
  budgets: ['budgets', 'limits'],
  plans: ['plans', 'goals', 'savings', 'savingsgoals'],
};

function collect(list, fn, hint) {
  const out = [];
  let skipped = 0;
  for (const raw of (Array.isArray(list) ? list : []).slice(0, MAX_ROWS)) { const row = fn(raw, hint); if (row) out.push(row); else skipped += 1; }
  return { out, skipped };
}

/** Parses a JSON export: a MOVO backup, another app's export, or a plain list of transactions. */
export function parseJsonData(input) {
  let data;
  try { data = JSON.parse(String(input || '')); } catch { return { ...empty(), errors: ['This JSON file could not be read.'] }; }
  const result = empty();
  const root = data && typeof data === 'object' && !Array.isArray(data) && data.data && typeof data.data === 'object' ? data.data : data;
  if (Array.isArray(root)) {
    const r = collect(root, normalizeTransaction); result.transactions = r.out; result.skipped += r.skipped;
    return finish(result);
  }
  if (!root || typeof root !== 'object') return { ...result, errors: ['This JSON file has no MOVO data.'] };
  const fields = Object.fromEntries(Object.entries(root).map(([k, v]) => [key(k), v]));
  const list = (names) => names.flatMap(n => (Array.isArray(fields[n]) ? fields[n] : []));
  const add = (target, names, fn, hint) => { const r = collect(list(names), fn, hint); result[target].push(...r.out); result.skipped += r.skipped; };
  add('accounts', LISTS.accounts, normalizeAccount);
  add('accounts', LISTS.cards, normalizeAccount, 'card');
  add('transactions', LISTS.transactions, normalizeTransaction);
  add('subscriptions', LISTS.subscriptions, normalizeSubscription);
  add('budgets', LISTS.budgets, normalizeBudget);
  add('plans', LISTS.plans, normalizePlan);
  return finish(result);
}

/** Parses a CSV of transactions, accounts/cards/balances or subscriptions (detected from its columns). */
export function parseCsvData(input) {
  const rows = parseCsvRows(input);
  if (!rows.length) return { ...empty(), errors: ['The file is empty.'] };
  const headers = rows[0].map(key);
  const has = (...names) => names.some(n => headers.includes(n));
  const objects = () => rows.slice(1, MAX_ROWS + 1).filter(cells => cells.some(c => String(c).trim())).map(cells => Object.fromEntries(rows[0].map((h, i) => [h, cells[i]])));
  const result = empty();
  if (has('date', 'transactiondate', 'occurredat', 'timestamp')) {
    const parsed = parseCsvTransactions(input);
    if (parsed.transactions.length || !parsed.errors.some(e => e.line === 1)) {
      result.transactions = parsed.transactions.map(t => ({ ...t, source: 'file_import' }));
      result.skipped = parsed.errors.length;
      return finish(result);
    }
    const r = collect(objects(), normalizeTransaction); result.transactions = r.out; result.skipped = r.skipped;
  } else if (has('cycle', 'billingcycle', 'frequency', 'nextbillingdate', 'renewal', 'renewaldate')) {
    const r = collect(objects(), normalizeSubscription); result.subscriptions = r.out; result.skipped = r.skipped;
  } else if (has('balance', 'currentbalance', 'openingbalance', 'accounttype', 'last4')) {
    const r = collect(objects(), normalizeAccount); result.accounts = r.out; result.skipped = r.skipped;
  } else if (has('target', 'targetamount', 'goal')) {
    const r = collect(objects(), normalizePlan); result.plans = r.out; result.skipped = r.skipped;
  } else if (has('limit', 'monthlylimit')) {
    const r = collect(objects(), normalizeBudget); result.budgets = r.out; result.skipped = r.skipped;
  } else return { ...result, errors: ['MOVO could not tell what this CSV holds. Use columns like Date, Description, Amount and Type.'] };
  return finish(result);
}

export function parseImportFile(name, content) {
  return /\.json$/i.test(String(name || '')) || /^\s*[[{]/.test(String(content || '')) ? parseJsonData(content) : parseCsvData(content);
}

function empty() { return { accounts: [], transactions: [], subscriptions: [], budgets: [], plans: [], skipped: 0, errors: [] }; }
function finish(result) {
  const total = ['accounts', 'transactions', 'subscriptions', 'budgets', 'plans'].reduce((s, k) => s + result[k].length, 0);
  return total ? result : { ...result, errors: result.errors.length ? result.errors : ['No accounts, transactions, subscriptions, budgets or plans were found in this file.'] };
}

/** Counts per kind, for "Imported 3 accounts, 120 transactions…". */
export const importCounts = (r) => ({ accounts: r.accounts.length, transactions: r.transactions.length, subscriptions: r.subscriptions.length, budgets: r.budgets.length, plans: r.plans.length });

const sameName = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

/** Merges parsed file data into what is already on this device without overwriting anything.
 *  Returns only the new rows to add, plus how many were skipped as duplicates or conflicts. */
export function planImport(parsed, existing, { base = 'PHP', newId, batchId, fingerprint }) {
  const id = (prefix) => newId?.() || `${prefix}-${batchId}-${Math.random().toString(36).slice(2, 10)}`;
  const skipped = { duplicates: 0, conflicts: 0 };
  const accounts = [];
  const known = [...(existing.accounts || [])];
  for (const a of parsed.accounts) {
    if (known.some(k => sameName(k.name, a.name))) { skipped.duplicates += 1; continue; }
    const row = {
      id: id('local-account'), name: a.name, account_type: a.account_type, institution_name: a.institution_name,
      currency: a.currency || base, opening_balance: a.opening_balance, balance: a.opening_balance, is_archived: false,
      mask: a.mask, brand: 'blue', source: 'File Import', import_batch: batchId,
    };
    accounts.push(row); known.push(row);
  }
  const accountId = (name) => (name ? known.find(k => sameName(k.name, name))?.id : '') || '';
  const seen = new Set((existing.transactions || []).map(fingerprint));
  const transactions = [];
  for (const t of parsed.transactions) {
    const from = accountId(t.account_name) || 'local';
    const to = t.transaction_type === 'transfer' ? accountId(t.to_account_name) : undefined;
    if (t.transaction_type === 'transfer' && (!to || to === from)) { skipped.conflicts += 1; continue; }
    const fp = fingerprint({ ...t, account_id: from });
    if (seen.has(fp)) { skipped.duplicates += 1; continue; }
    seen.add(fp);
    transactions.push({
      id: id('import'), merchant: t.merchant, amount: t.amount, currency: t.currency || base, transaction_type: t.transaction_type,
      category: t.category, account_id: from, transfer_to_account_id: to, occurred_at: t.occurred_at, note: t.note,
      source: 'File Import', import_batch: batchId, external_reference: fp,
    });
  }
  const fresh = (list, rows, same) => rows.filter(r => { const dup = list.some(x => same(x, r)); if (dup) skipped.duplicates += 1; return !dup; });
  const subscriptions = fresh(existing.subscriptions || [], parsed.subscriptions, (x, r) => sameName(x.name, r.name))
    .map(s => ({ ...s, currency: s.currency || base, id: id('sub'), import_batch: batchId }));
  const budgets = fresh(existing.budgets || [], parsed.budgets, (x, r) => sameName(x.category, r.category))
    .map(b => ({ ...b, currency: base, id: id('budget'), import_batch: batchId }));
  const plans = fresh(existing.plans || [], parsed.plans, (x, r) => sameName(x.name, r.name))
    .map(p => ({ ...p, currency: base, id: id('plan'), import_batch: batchId }));
  return { accounts, transactions, subscriptions, budgets, plans, skipped: { ...skipped, invalid: parsed.skipped || 0 } };
}
