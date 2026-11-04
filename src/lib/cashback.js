export const roundCashback = value => Math.round((Number(value) || 0) * 100) / 100;

export function estimateCashback(transactions = [], accounts = [], rules = {}) {
  const accountById = new Map(accounts.map(account => [account.id, account]));
  return transactions.flatMap(transaction => {
    const account = accountById.get(transaction.account_id);
    const rule = rules[transaction.account_id];
    if (transaction.type !== 'expense' || !(Number(transaction.amount) > 0) || !account || account.is_archived ||
        !['bank', 'e_wallet'].includes(account.account_type) || !rule?.enabled) return [];
    const rate = Number(rule.rate);
    if (!Number.isFinite(rate) || rate <= 0 || rate > 100) return [];
    const cap = Number(rule.cap);
    const estimate = roundCashback(Number(transaction.amount) * rate / 100);
    const amount = Number.isFinite(cap) && cap > 0 ? Math.min(estimate, cap) : estimate;
    if (amount <= 0) return [];
    return [{
      id: `auto-${transaction.id}`,
      transactionId: transaction.id,
      date: transaction.date || transaction.occurred_at || '',
      source: transaction.merchant || transaction.category || 'Purchase',
      account: account.institution_name || account.name || '',
      accountId: account.id,
      amount,
      currency: account.currency || 'PHP',
      rate,
      status: 'Estimated',
    }];
  });
}

export function cashbackTotals(entries = []) {
  return entries.reduce((totals, entry) => {
    const currency = entry.currency || 'PHP';
    totals[currency] = roundCashback((totals[currency] || 0) + Number(entry.amount || 0));
    return totals;
  }, {});
}
