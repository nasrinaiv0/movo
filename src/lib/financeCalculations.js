import { dayKey, monthKey } from './format';

const toCents = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) : 0;
};
const fromCents = (value) => value / 100;
const transactionType = (row) => row?.transaction_type || row?.type;
const transactionDate = (row) => row?.occurred_at || row?.date;
const isPending = (row) => row?.is_pending === true || row?.is_pending === 'true';

/**
 * Apply one transaction to an account in integer cents. Transfers debit the
 * source and credit the destination; they never change overall net worth.
 * Pending transactions are intentionally excluded from account balances.
 */
export function transactionAccountDeltaCents(transaction, accountId) {
  if (!transaction || !accountId || isPending(transaction)) return 0;
  const amount = Math.abs(toCents(transaction.amount));
  const type = transactionType(transaction);
  if (transaction.account_id === accountId) {
    if (type === 'income') return amount;
    if (type === 'expense' || type === 'transfer') return -amount;
  }
  if (type === 'transfer' && transaction.transfer_to_account_id === accountId) return amount;
  return 0;
}

/** Return account rows with balances derived from opening balances + ledger entries. */
export function calculateAccountBalances(accounts = [], transactions = []) {
  return accounts.map((account) => {
    const opening = account.opening_balance ?? account.balance ?? 0;
    const accountCurrency = account.currency || 'PHP';
    const relevantTransactions = transactions.filter((transaction) => {
      const source = accounts.find((row) => row.id === transaction.account_id);
      const target = accounts.find((row) => row.id === transaction.transfer_to_account_id);
      const transactionCurrency = transaction.currency || source?.currency || 'PHP';
      if (transactionCurrency !== accountCurrency) return false;
      // A transfer between different currencies has no valid ledger effect
      // until MOVO supports an explicit FX rate and conversion record.
      if (transactionType(transaction) === 'transfer') {
        if (!source || !target) return false;
        if ((source.currency || 'PHP') !== (target.currency || 'PHP')) return false;
      }
      return true;
    });
    const balanceCents = toCents(opening) + relevantTransactions.reduce(
      (total, transaction) => total + transactionAccountDeltaCents(transaction, account.id), 0,
    );
    return {
      ...account,
      balance: fromCents(balanceCents),
      currency: accountCurrency,
    };
  });
}

/** Sum monetary values without floating-point drift. */
export function sumMoneyValues(values = []) {
  return fromCents(values.reduce((total, value) => total + toCents(value), 0));
}

/** Calculate net cash movement across a ledger; transfers cancel out globally. */
export function calculateLedgerNet(transactions = [], currency = 'PHP') {
  let cents = 0;
  transactions.forEach((transaction) => {
    if (isPending(transaction) || (transaction.currency || 'PHP') !== currency) return;
    const amount = Math.abs(toCents(transaction.amount));
    const type = transactionType(transaction);
    if (type === 'income') cents += amount;
    else if (type === 'expense') cents -= amount;
  });
  return fromCents(cents);
}

/** Single source of truth for month-to-date income, spending, net savings and chart bars. */
export function calculateMonthlyStats(transactions = [], key, currency = 'PHP') {
  const list = transactions.filter((transaction) => {
    const date = transactionDate(transaction);
    return date && Number.isFinite(new Date(date).getTime())
      && monthKey(date) === key
      && (transaction.currency || 'PHP') === currency;
  });
  const totalFor = (type) => fromCents(list
    .filter((transaction) => transactionType(transaction) === type && !isPending(transaction))
    .reduce((total, transaction) => total + Math.abs(toCents(transaction.amount)), 0));
  const [year, month] = key.split('-').map(Number);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const barsCents = Array(12).fill(0);
  list.filter((transaction) => transactionType(transaction) === 'expense' && !isPending(transaction)).forEach((transaction) => {
    const day = Number(dayKey(transactionDate(transaction)).slice(8, 10));
    barsCents[Math.min(11, Math.floor(((day - 1) / days) * 12))] += Math.abs(toCents(transaction.amount));
  });
  const income = totalFor('income');
  const expenses = totalFor('expense');
  const transfers = totalFor('transfer');
  return {
    currency,
    income,
    expenses,
    transfers,
    transferCount: list.filter((transaction) => transactionType(transaction) === 'transfer').length,
    incomeCount: list.filter((transaction) => transactionType(transaction) === 'income').length,
    net: fromCents(toCents(income) - toCents(expenses)),
    days,
    bars: barsCents.map(fromCents),
    count: list.length,
    list,
  };
}

/** Aggregate category expenses in cents so donut segments sum to the displayed total. */
export function calculateExpenseCategoryTotals(transactions = [], bucketOf) {
  const centsByCategory = {};
  transactions.forEach((transaction) => {
    if (transactionType(transaction) !== 'expense' || isPending(transaction)) return;
    const bucket = bucketOf(transaction.category);
    centsByCategory[bucket] = (centsByCategory[bucket] || 0) + Math.abs(toCents(transaction.amount));
  });
  return Object.fromEntries(Object.entries(centsByCategory).map(([key, cents]) => [key, fromCents(cents)]));
}
