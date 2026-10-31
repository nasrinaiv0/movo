/**
 * Canonical transaction routing and balance math for MOVO.
 * Transactions are stored as positive amounts; direction comes only from type + account role.
 */
export function transactionEffect(transaction, accountId) {
  if (!transaction || !accountId) return 0;
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
    if (transaction.account_id === accountId) return -amount;
    if (transaction.transfer_to_account_id === accountId) return amount;
  }
  return 0;
}

/** Convert the transaction's positive amount into the target account currency before applying its direction. */
export function accountTransactionDelta(account, transactions, convertAmount = (amount) => amount) {
  if (!account?.id || !Array.isArray(transactions)) return 0;
  return transactions.reduce((sum, transaction) => {
    const effect = transactionEffect(transaction, account.id);
    if (!effect) return sum;
    const currency = transaction.origCurrency || transaction.currency || account.currency || 'PHP';
    const amount = Math.abs(effect);
    const converted = Number(convertAmount(amount, currency, account.currency || 'PHP'));
    if (!Number.isFinite(converted)) return sum;
    return sum + Math.sign(effect) * converted;
  }, 0);
}

/** Opening balance plus posted ledger effects; archived accounts are still calculable for history. */
export function accountBalance(account, transactions, convertAmount = (amount) => amount, openingBalance) {
  const opening = Number(openingBalance ?? account?.opening_balance ?? account?.balance ?? 0);
  return (Number.isFinite(opening) ? opening : 0) + accountTransactionDelta(account, transactions, convertAmount);
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
  const amount = Number(transaction?.amount);
  if (!Number.isFinite(amount)) return 0;
  const type = transaction.transaction_type || transaction.type;
  if (type === 'income') return amount;
  if (type === 'expense') return -amount;
  return 0;
}
