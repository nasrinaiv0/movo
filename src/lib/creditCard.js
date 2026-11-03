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
