/*
 * Credit cards: the limit is what the issuer lets you borrow; spending on the card is owed, not money taken from a
 * bank account. A credit card's balance is its own (negative = owed), never a linked bank account's balance; the
 * issuing bank, if chosen, is only a label/link (`issuerBankId`).
 */
export const isCreditCard = (a) => a?.account_type === 'card' && a?.cardKind === 'credit';

/** Limit, amount owed and available credit for a credit card with a limit; null otherwise. */
export function creditInfo(a) {
  if (!isCreditCard(a)) return null;
  const limit = Number(a.creditLimit);
  if (!Number.isFinite(limit) || limit <= 0) return null;
  const balance = Number(a.balance) || 0;
  const owed = Math.max(0, -balance);
  const round = (v) => Math.round(v * 100) / 100;
  return { limit: round(limit), owed: round(owed), available: round(limit + balance), usedPercent: Math.min(100, Math.round((owed / limit) * 100)) };
}

/** Summarize recorded payments by total and distinct calendar months. */
export function creditCardPaymentSummary(payments = []) {
  const valid = payments.filter(p => {
    const month = String(p.month || '');
    const date = String(p.date || '');
    if (!Number.isFinite(Number(p.amount)) || Number(p.amount) <= 0) return false;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date.slice(0, 7) !== month) return false;
    const parsed = new Date(\`${date}T00:00:00.000Z\`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
  });
  return { totalPaid: Math.round(valid.reduce((sum, p) => sum + Number(p.amount), 0) * 100) / 100, monthsPaid: new Set(valid.map(p => p.month)).size, payments: valid.slice().sort((a, b) => b.date.localeCompare(a.date)) };
}
