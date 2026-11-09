import { sumMoney } from './moneyMath';
import { isCreditCard, unpostedCardPayments } from './creditCard';
import { dayKey } from './format';

/*
 * Total balance: what the person's accounts hold together, in the home currency.
 * - Open accounts only (archived accounts are hidden everywhere else and stay out of the total).
 * - A debit card linked to its bank shows the bank's balance, so it is counted once, through the bank.
 * - A credit card counts as what is owed (negative).
 * - A card payment recorded without a transaction lowers what the card owes but takes the money from no account;
 *   a payment never creates money, so the total leaves it out. Payments recorded as a transfer from an account
 *   are ordinary ledger rows and already balance out.
 * - An account whose balance cannot be converted (no exchange rate) is listed in `excluded` instead of turning the
 *   whole total into NaN.
 */
export function totalBalance(accounts, toBase = amount => amount, cardPayments = {}) {
  // Each converted balance is rounded to cents and summed as whole cents, so float drift never reaches the total.
  const parts = [];
  const excluded = [];
  for (const account of Array.isArray(accounts) ? accounts : []) {
    if (!account || account.is_archived || account.linkedAccountId) continue;
    let balance = Number(account.balance);
    if (account.recordedPaymentsApplied && isCreditCard(account)) balance -= unpostedCardPayments(cardPayments?.[account.id] || []);
    const converted = Number.isFinite(balance) ? Number(toBase(balance, account.currency || 'PHP')) : NaN;
    if (!Number.isFinite(converted)) { excluded.push(account.id); continue; }
    parts.push(converted);
  }
  return { total: sumMoney(parts), excluded };
}

/** Income minus expenses (home currency) recorded after `endDay` (YYYY-MM-DD); transfers stay inside the total. */
export function netAfter(transactions, endDay) {
  const parts = [];
  for (const t of Array.isArray(transactions) ? transactions : []) {
    if (!t || dayKey(t.date) <= endDay) continue;
    const amount = Number(t.amount);
    if (!Number.isFinite(amount)) continue;
    if (t.type === 'income') parts.push(amount);
    else if (t.type === 'expense') parts.push(-amount);
  }
  return sumMoney(parts);
}

/** The total at the end of a past day: today's total with everything recorded after that day undone. */
export const balanceAsOf = (currentTotal, transactions, endDay) => sumMoney([currentTotal, -netAfter(transactions, endDay)]);
