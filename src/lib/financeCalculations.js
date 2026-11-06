import { roundMoney, sumMoney } from './moneyMath';

const inactiveStatuses = new Set(['deleted', 'reversed', 'void', 'voided', 'cancelled', 'canceled', 'archived', 'refunded', 'pending', 'scheduled', 'failed']);
export const isPostedTransaction = row => !!row && !inactiveStatuses.has(String(row.status || row.transaction_status || '').toLowerCase())
  && !['is_deleted', 'deleted_at', 'deletedAt', 'is_reversed', 'reversed_at', 'reversedAt', 'is_voided', 'voided_at', 'voidedAt', 'is_archived', 'archived_at'].some(key => row[key]);

export function postedTransactions(rows = []) {
  const seen = new Set();
  return (Array.isArray(rows) ? rows : []).filter(row => {
    if (!isPostedTransaction(row)) return false;
    if (row.id == null || row.id === '') return true;
    const key = `${row.transaction_type || row.type}:${row.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Canonical transaction routing and balance math for MOVO.
 * Transactions are stored as positive amounts; direction comes only from type + account role.
 */
export function transactionEffect(transaction, accountId) {
  if (!isPostedTransaction(transaction) || !accountId) return 0;
  const type = transaction.transaction_type || transaction.type;
  if (type === 'accounting_posting') {
    const signed = Number(transaction.signed_amount);
    return transaction.account_id === accountId && Number.isFinite(signed) ? signed : 0;
  }
  const amount = Number(transaction.origAmount ?? transaction.amount);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  if (type === 'income') return transaction.account_id === accountId ? amount : 0;
  if (type === 'expense') return transaction.account_id === accountId ? -amount : 0;
  if (type === 'transfer') {
    // Bank and linked debit-card IDs are normalized to the same ledger account.
    if (transaction.account_id === transaction.transfer_to_account_id) return 0;
    if (transaction.account_id === accountId) return -amount;
    if (transaction.transfer_to_account_id === accountId) return amount;
  }
  return 0;
}

/** Convert the transaction's positive amount into the target account currency before applying its direction. */
export function accountTransactionDelta(account, transactions, convertAmount = (amount) => amount) {
  if (!account?.id || !Array.isArray(transactions)) return 0;
  return sumMoney(postedTransactions(transactions).map(transaction => {
    const effect = transactionEffect(transaction, account.id);
    if (!effect) return 0;
    const currency = transaction.origCurrency || transaction.currency || account.currency || 'PHP';
    const amount = Math.abs(effect);
    const converted = Number(convertAmount(amount, currency, account.currency || 'PHP'));
    if (!Number.isFinite(converted) || converted < 0) return 0;
    return Math.sign(effect) * converted;
  }));
}

/** Opening balance plus posted ledger effects; archived accounts are still calculable for history. */
export function accountBalance(account, transactions, convertAmount = (amount) => amount, openingBalance) {
  const opening = Number(openingBalance ?? account?.opening_balance ?? account?.balance ?? 0);
  return roundMoney((Number.isFinite(opening) ? opening : 0) + accountTransactionDelta(account, transactions, convertAmount));
}

/**
 * Savings is the value held outside physical cash. Credit-card accounts are excluded because a card limit
 * is not savings; an unclassified card is also excluded until its debit/credit kind is known.
 */
export function savingsBalance(accounts, convertToHome = (amount) => amount, accountStyles = {}) {
  if (!Array.isArray(accounts)) return 0;
  return accounts.reduce((sum, account) => {
    if (!account || account.is_archived || account.account_type === 'cash' || account.linkedAccountId) return sum;
    if (account.account_type === 'card' && (accountStyles[account.id]?.cardKind || account.cardKind) !== 'debit') return sum;
    const balance = Number(account.balance);
    if (!Number.isFinite(balance)) return sum;
    const converted = Number(convertToHome(balance, account.currency || 'PHP'));
    return sum + (Number.isFinite(converted) ? converted : 0);
  }, 0);
}

/** Signed transaction amount for activity summaries. Transfers move money between accounts, not into/out of the ledger. */
export function activityNetAmount(transaction) {
  if (!isPostedTransaction(transaction)) return 0;
  const amount = Number(transaction?.amount);
  if (!Number.isFinite(amount)) return 0;
  const type = transaction.transaction_type || transaction.type;
  if (type === 'income') return amount;
  if (type === 'expense') return -amount;
  return 0;
}
