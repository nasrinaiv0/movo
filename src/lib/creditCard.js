import { roundMoney, sumMoney } from './moneyMath';
import { isPostedTransaction } from './financeCalculations';

/*
 * Credit cards: the limit is what the issuer lets you borrow; spending on the card is owed, not money taken from a
 * bank account. A credit card's balance is its own (negative = owed), never a linked bank account's balance; the
 * issuing bank, if chosen, is only a label/link (`issuerBankId`).
 */
export const isCreditCard = (a) => a?.account_type === 'card' && a?.cardKind === 'credit';

/** Limit, amount owed and available credit for a credit card with a limit; null otherwise. */
export function creditInfo(a) {
  if (!isCreditCard(a)) return null;
  const rawLimit = a.creditLimit;
  const rawBalance = a.balance;
  if (rawLimit === null || rawLimit === undefined || rawLimit === '') return null;
  if (rawBalance === null || rawBalance === undefined || rawBalance === '') return null;
  const limit = Number(rawLimit);
  const balance = Number(rawBalance);
  if (!Number.isFinite(limit) || limit <= 0 || !Number.isFinite(balance)) return null;
  const owed = Math.max(0, -balance);
  const round = (v) => Math.round(v * 100) / 100;
  return { limit: round(limit), owed: round(owed), available: round(limit + balance), usedPercent: Math.min(100, Math.round((owed / limit) * 100)) };
}

/** Summarize recorded payments by total and distinct calendar months. */
export function creditCardPaymentSummary(payments = []) {
  const seen = new Set();
  const valid = (Array.isArray(payments) ? payments : []).filter(p => {
    if (!p || typeof p !== 'object' || !isPostedTransaction(p)) return false;
    const month = String(p.month || '');
    const date = String(p.date || '');
    const amount = Number(p.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount >= 1e16) return false;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date.slice(0, 7) !== month) return false;
    const parsed = new Date(date + 'T00:00:00.000Z');
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return false;
    if (p.id !== undefined && p.id !== null && String(p.id)) {
      const id = String(p.id);
      if (seen.has(id)) return false;
      seen.add(id);
    }
    return true;
  });
  const totalPaid = sumMoney(valid.map(p => p.amount));
  return { totalPaid, monthsPaid: new Set(valid.map(p => p.month)).size, payments: valid.slice().sort((a, b) => b.date.localeCompare(a.date)) };
}



/** Payments linked to ledger transactions are already reflected in the balance. */
export function unpostedCardPayments(payments = []) {
  return sumMoney(creditCardPaymentSummary(payments).payments
    .filter(payment => !payment.transaction_id && !payment.transactionId)
    .map(payment => payment.amount));
}

export function applyCardPayments(card, payments = []) {
  if (!isCreditCard(card) || card.recordedPaymentsApplied) return card;
  const balance = Number(card.balance);
  if (!Number.isFinite(balance)) return card;
  return { ...card, balance: roundMoney(balance + unpostedCardPayments(payments)), recordedPaymentsApplied: true };
}

/** Fixed-payment estimate with a rounded final instalment and explicit input validation. */
export function creditRepaymentEstimate(principal, annualRate, months) {
  const amount = Number(principal), rate = Number(annualRate), count = Number(months);
  if (!Number.isFinite(amount) || amount <= 0 || amount >= 1e12 || annualRate === '' || annualRate == null
    || !Number.isFinite(rate) || rate < 0 || rate > 100 || !Number.isInteger(count) || count < 1 || count > 600) return null;
  const monthlyRate = rate / 1200;
  const payment = monthlyRate > 0 ? amount * monthlyRate / -Math.expm1(-count * Math.log1p(monthlyRate)) : amount / count;
  const monthlyPayment = roundMoney(payment);
  let balance = roundMoney(amount), interest = 0, total = 0, finalPayment = 0;
  for (let month = 1; month <= count; month += 1) {
    const charge = roundMoney(balance * monthlyRate);
    const due = roundMoney(balance + charge);
    finalPayment = month === count ? due : Math.min(due, monthlyPayment);
    balance = roundMoney(due - finalPayment);
    interest = roundMoney(interest + charge);
    total = roundMoney(total + finalPayment);
  }
  return { monthlyPayment, finalPayment, total, interest, months: count };
}

/* Credit-card planning figures: card-routed spend, estimated monthly APR interest and post-payment balance. */
export function creditCardPlanningMetrics({ card, transactions = [], payments = [], annualInterestRate = 0, statementBalance, convertAmount = amount => amount } = {}) {
  const round = roundMoney;
  const rate = Number(annualInterestRate); const apr = Number.isFinite(rate) && rate >= 0 && rate <= 100 ? rate : 0;
  const currency = card?.currency || 'PHP';
  const seenTransactions = new Set();
  let creditTransactionCount = 0;
  const excludedStatuses = new Set(['deleted', 'reversed', 'void', 'voided', 'cancelled', 'canceled', 'archived', 'refunded']);
  const amountSpent = round((Array.isArray(transactions) ? transactions : []).reduce((sum, item) => {
    if (!isPostedTransaction(item) || String(item.account_id) !== String(card?.id) || (item.transaction_type || item.type) !== 'expense') return sum;
    const status = String(item.status || item.transaction_status || '').toLowerCase();
    if (excludedStatuses.has(status) || item.is_deleted || item.deleted_at || item.deletedAt
      || item.is_reversed || item.reversed_at || item.reversedAt || item.is_voided || item.voided_at || item.voidedAt
      || item.is_archived || item.archived_at) return sum;
    if (item.id !== undefined && item.id !== null && String(item.id)) {
      const id = String(item.id);
      if (seenTransactions.has(id)) return sum;
      seenTransactions.add(id);
    }
    const raw = Number(item.origAmount ?? item.amount);
    if (!Number.isFinite(raw) || raw <= 0 || raw >= 1e16) return sum;
    let converted;
    try { converted = Number(convertAmount(raw, item.origCurrency || item.currency || currency, currency)); }
    catch (_) { return sum; }
    if (!Number.isFinite(converted) || converted <= 0) return sum;
    creditTransactionCount += 1;
    return sum + converted;
  }, 0));
  const limitValue = Number(card?.creditLimit); const limit = Number.isFinite(limitValue) && limitValue > 0 ? round(limitValue) : 0;
  // accountsView.balance is the authoritative card ledger: opening balance plus every
  // posted card transaction. Prefer it over legacy liability_balance snapshots, which
  // can become stale after additional credit logs.
  const hasLedgerBalance = card?.balance !== undefined && card?.balance !== null && card?.balance !== '';
  const balanceValue = Number(hasLedgerBalance ? card.balance : card?.liability_balance ?? 0);
  const outstanding = hasLedgerBalance
    ? (Number.isFinite(balanceValue) ? round(Math.max(0, -balanceValue)) : 0)
    : (Number.isFinite(balanceValue) ? round(Math.max(0, balanceValue)) : 0);
  const summary = creditCardPaymentSummary(payments);
  const statementValue = statementBalance === undefined || statementBalance === null || String(statementBalance).trim() === '' ? NaN : Number(statementBalance);
  const outstandingAfterPayments = round(Math.max(0, outstanding - (card?.recordedPaymentsApplied ? 0 : unpostedCardPayments(payments))));
  const interestPrincipal = Number.isFinite(statementValue) && statementValue >= 0 ? statementValue : outstandingAfterPayments;
  const estimatedMonthlyInterest = round(interestPrincipal * apr / 1200);
  const amountAfterInterest = round(outstandingAfterPayments + estimatedMonthlyInterest);
  const spentLimitPercent = limit > 0 ? round(amountSpent / limit * 100) : null;
  return { amountSpent, estimatedMonthlyInterest, amountAfterInterest, outstandingAfterPayments, totalPayments: summary.totalPaid, monthsPaid: summary.monthsPaid, paymentCount: summary.payments.length, payments: summary.payments, creditTransactionCount, limit, spentLimitPercent, annualInterestRate: apr };
}