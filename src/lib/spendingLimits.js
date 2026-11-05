const normalizeMerchant = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function spendingLimitProgress(limits = [], monthTransactions = [], accounts = []) {
  const accountNames = new Map((accounts || []).map(a => [a.id, a.name]));
  return (limits || []).map(limit => {
    const scope = limit.scope === 'account' ? 'account' : 'merchant';
    const merchantKey = normalizeMerchant(limit.merchant);
    const accountId = limit.account_id || '';
    const spent = (monthTransactions || []).filter(tx => {
      if (tx.type !== 'expense') return false;
      if (scope === 'account') return String(tx.account_id || tx.accountId || '') === String(accountId);
      return !!merchantKey && normalizeMerchant(tx.merchant) === merchantKey;
    }).reduce((sum, tx) => sum + Math.max(0, Number(tx.amount) || 0), 0);
    const monthlyLimit = Math.max(0, Number(limit.monthly_limit) || 0);
    const percent = monthlyLimit > 0 ? Math.min(999, Math.round((spent / monthlyLimit) * 100)) : 0;
    return {
      ...limit,
      scope,
      account_name: accountNames.get(accountId) || limit.account_name || '',
      spent,
      left: monthlyLimit - spent,
      percent,
      level: percent >= 100 ? 'over' : percent >= Math.max(1, Number(limit.alert_percent) || 80) ? 'warn' : 'ok',
    };
  });
}

export { normalizeMerchant };
