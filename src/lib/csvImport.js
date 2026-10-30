const aliases = {
  date: ['date', 'transactiondate', 'occurredat', 'timestamp'],
  merchant: ['description', 'merchant', 'payee', 'title', 'details'],
  category: ['category', 'subcategory'],
  type: ['type', 'transactiontype', 'direction'],
  amount: ['amount', 'value', 'transactionamount'],
  currency: ['currency', 'ccy'],
  account: ['account', 'accountname', 'fromaccount', 'sourceaccount', 'paymentmethod'],
  destination: ['toaccount', 'destinationaccount', 'transferdestination'],
  note: ['note', 'memo', 'remarks'],
};
const normalizeHeader = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

export function parseCsvRows(input) {
  const text = String(input || '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = []; let field = ''; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"' && quoted && text[i + 1] === '"') { field += '"'; i += 1; }
    else if (ch === '"') quoted = !quoted;
    else if (ch === ',' && !quoted) { row.push(field); field = ''; }
    else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      if (row.some(value => value.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field.length || row.length) {
    row.push(field);
    if (row.some(value => value.trim() !== '')) rows.push(row);
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field.');
  return rows;
}

function columnIndex(headers, keys) {
  return headers.findIndex(header => keys.includes(normalizeHeader(header)));
}
function normalizeType(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (['income', 'credit', 'deposit', 'received'].includes(value)) return 'income';
  if (['expense', 'debit', 'purchase', 'payment', 'withdrawal'].includes(value)) return 'expense';
  if (['transfer', 'internal transfer'].includes(value)) return 'transfer';
  return null;
}
function normalizeDate(raw) {
  const value = String(raw || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T12:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return null;
    return parsed.toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
export function transactionFingerprint(transaction) {
  const date = transaction?.occurred_at || transaction?.date || '';
  const dateKey = String(date).slice(0, 10);
  const source = [
    String(transaction?.account_id || transaction?.account_name || '').trim().toLowerCase(),
    String(transaction?.transaction_type || transaction?.type || '').trim().toLowerCase(),
    Number(transaction?.amount || 0).toFixed(2),
    String(transaction?.merchant || '').trim().toLowerCase().replace(/\s+/g, ' '),
    dateKey,
  ].join('|');
  // Compact stable fingerprint fits the database's 200-character external-reference limit.
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `movo-csv-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

/** Parses common bank-export CSVs without uploading or sending the file anywhere. */
export function parseCsvTransactions(input) {
  const rawRows = parseCsvRows(input);
  if (!rawRows.length) return { transactions: [], errors: [{ line: 1, message: 'The CSV file is empty.' }] };
  const headers = rawRows[0];
  const indexes = Object.fromEntries(Object.entries(aliases).map(([key, keys]) => [key, columnIndex(headers, keys)]));
  const required = ['date', 'merchant', 'amount', 'type'];
  const missing = required.filter(key => indexes[key] < 0);
  if (missing.length) return { transactions: [], errors: [{ line: 1, message: `Missing required columns: ${missing.join(', ')}.` }] };
  const transactions = []; const errors = [];
  rawRows.slice(1).forEach((cells, offset) => {
    const line = offset + 2;
    const get = (key) => indexes[key] < 0 ? '' : String(cells[indexes[key]] || '').trim();
    const merchant = get('merchant').slice(0, 160);
    const rawAmount = get('amount').replace(/[₱$€£,\s]/g, '');
    const amount = Math.abs(Number(rawAmount));
    const type = normalizeType(get('type'));
    const occurred_at = normalizeDate(get('date'));
    if (!merchant) { errors.push({ line, message: 'Description is required.' }); return; }
    if (!Number.isFinite(amount) || amount <= 0 || amount >= 1e17) { errors.push({ line, message: 'Amount must be a positive number.' }); return; }
    if (!type) { errors.push({ line, message: 'Type must be income, expense, or transfer.' }); return; }
    if (!occurred_at) { errors.push({ line, message: 'Date is invalid.' }); return; }
    const rawCurrency = get('currency').toUpperCase();
    if (rawCurrency && !/^[A-Z]{3}$/.test(rawCurrency)) {
      errors.push({ line, message: 'Currency must be a three-letter code, for example PHP or USD.' });
      return;
    }
    const currency = rawCurrency || 'PHP';
    const category = type === 'income' ? 'Income' : type === 'transfer' ? 'Transfer' : (get('category').slice(0, 60) || 'Other');
    transactions.push({
      merchant, amount: Math.round(amount * 100) / 100, transaction_type: type, type, category,
      occurred_at, date: occurred_at, currency,
      account_name: get('account').slice(0, 100), to_account_name: get('destination').slice(0, 100),
      note: get('note').slice(0, 1000), source: 'csv_import',
    });
  });
  return { transactions, errors };
}
