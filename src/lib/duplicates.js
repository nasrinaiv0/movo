/*
 * Finds a record that is probably the same purchase as a new entry, so chat logs, receipt scans, manual entries and
 * bank-notification logs are not counted twice. A match needs the same direction and amount, a date within a day,
 * and a merchant that agrees (or no merchant to compare). Records on two different named accounts never match.
 */
const DAY = 86400000;
const STOP = new Set(['the', 'and', 'inc', 'corp', 'store', 'shop', 'payment', 'purchase', 'pos', 'ph', 'co', 'ltd']);
const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
const tokens = (s) => norm(s).split(' ').filter(w => w.length >= 3 && !STOP.has(w));

export function sameMerchant(a, b) {
  const x = norm(a); const y = norm(b);
  if (!x || !y) return true;
  if (x === y || x.includes(y) || y.includes(x)) return true;
  const tb = new Set(tokens(b));
  return tokens(a).some(w => tb.has(w));
}

/** Reference ID saved in a record's note ("… · Ref ABC123"). */
export const refOf = (record) => (String(record?.ref || record?.note || '').match(/\bRef[:\s]+([A-Z0-9-]{4,40})/i)?.[1] || '').toUpperCase();

/** entry: { amount, type, merchant, date, account_id?, ref? }; records: raw stored transactions. */
export function findDuplicate(entry, records = []) {
  const amount = Math.round(Number(entry?.amount) * 100);
  const when = new Date(entry?.date || entry?.occurred_at || Date.now()).getTime();
  if (!(amount > 0) || !Number.isFinite(when)) return null;
  const type = entry.type || entry.transaction_type || 'expense';
  const acct = entry.account_id && entry.account_id !== 'local' ? entry.account_id : '';
  const ref = String(entry?.ref || '').toUpperCase();
  // The same reference ID is the same payment, whatever the date or wording.
  if (ref) { const byRef = records.find(r => r && r.id !== entry.id && refOf(r) === ref); if (byRef) return byRef; }
  return records.find(r => {
    if (!r || r.id === entry.id) return false;
    if (ref && refOf(r) && refOf(r) !== ref) return false; // two different reference IDs are two payments
    if ((r.transaction_type || r.type) !== type) return false;
    if (Math.round(Number(r.amount) * 100) !== amount) return false;
    const t = new Date(r.occurred_at || r.date).getTime();
    if (!Number.isFinite(t) || Math.abs(t - when) > DAY) return false;
    if (acct && r.account_id && r.account_id !== 'local' && r.account_id !== acct) return false;
    return sameMerchant(entry.merchant, r.merchant);
  }) || null;
}
