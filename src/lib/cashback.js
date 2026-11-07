export const roundCashback = value => Math.round((Number(value) || 0) * 100) / 100;

const positive = value => {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const normalized = text => String(text || '').trim().toLocaleLowerCase();

export function estimateCashback(transactions = [], accounts = [], rules = {}) {
  const accountById = new Map(accounts.map(account => [account.id, account]));
  const usedByMonth = new Map();
  // Stable chronological allocation is necessary for a monthly cap.
  return [...transactions].sort((a,b) => String(a.occurred_at || a.date || '').localeCompare(String(b.occurred_at || b.date || ''))
    || String(a.id || '').localeCompare(String(b.id || ''))).flatMap(transaction => {
    const account = accountById.get(transaction.account_id);
    const rule = rules[transaction.account_id];
    const type = transaction.type || transaction.transaction_type;
    const spent = Number(transaction.amount);
    if (type !== 'expense' || !Number.isFinite(spent) || spent <= 0 || !account || account.is_archived ||
        !['bank', 'e_wallet', 'card'].includes(account.account_type) || !rule?.enabled) return [];
    // A reference program is never evidence of an actual posted rebate.
    if (rule.presetId && (!rule.verified || rule.manualOnly)) return [];
    const rate = positive(rule.rate);
    if (rate == null || rate > 100) return [];
    if (rule.currency && String(transaction.currency || account.currency).toUpperCase() !== String(rule.currency).toUpperCase()) return [];
    if (rule.presetId && String(account.currency || 'PHP').toUpperCase() !== 'PHP') return [];
    const category = normalized(rule.scopeCategory);
    if (category && category !== normalized(transaction.category)) return [];
    const keyword = normalized(rule.merchantContains);
    if (keyword && (keyword.length < 2 || !normalized(transaction.merchant).includes(keyword))) return [];
    if (rule.presetId && rule.conditions && !category && !keyword && rule.presetId !== 'amex-bdo') return [];
    const minSpend = positive(rule.minSpend);
    if (rule.minSpend !== '' && rule.minSpend != null && minSpend == null) return [];
    if (minSpend != null && spent < minSpend) return [];
    const step = positive(rule.fullSpendStep);
    if (rule.fullSpendStep !== '' && rule.fullSpendStep != null && step == null) return [];
    if (step != null && (!Number.isFinite(step) || step > 1000000)) return [];
    const qualifyingSpend = step ? Math.floor((spent+1e-9) / step) * step : spent;
    let amount = roundCashback(qualifyingSpend * rate / 100);
    const txnCap = positive(rule.cap);
    if (rule.cap !== '' && rule.cap != null && txnCap == null) return [];
    if (txnCap != null) amount = Math.min(amount,txnCap);
    const monthlyCap = positive(rule.monthlyCap);
    if (rule.monthlyCap !== '' && rule.monthlyCap != null && monthlyCap == null) return [];
    if (monthlyCap != null) {
      const date = String(transaction.date || transaction.occurred_at || '');
      if (!/^\d{4}-\d{2}-\d{2}/.test(date)) return [];
      const key = [account.id,account.currency,date.slice(0,7)].join('|');
      const already = usedByMonth.get(key) || 0;
      amount = Math.max(0, Math.min(amount, roundCashback(monthlyCap-already)));
      usedByMonth.set(key,roundCashback(already+amount));
    }
    if (amount <= 0) return [];
    return [{
      id: 'auto-'+transaction.id,
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
