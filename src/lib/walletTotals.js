/** Returns the total of live non-card balances in the selected home currency. */
export function walletAssetTotal(accounts, toBase = (_amount, _currency) => _amount) {
  return (Array.isArray(accounts) ? accounts : [])
    .filter(account => account && !account.is_archived && account.account_type !== 'card')
    .reduce((sum, account) => {
      const amount = Number(account.balance);
      if (!Number.isFinite(amount)) return sum;
      const converted = Number(toBase(amount, account.currency));
      return sum + (Number.isFinite(converted) ? converted : 0);
    }, 0);
}

/** A type's share of liquid/deposit balances, rounded for a compact wallet tile. */
export function walletTypePercentage(amount, total) {
  const value = Number(amount);
  const denominator = Number(total);
  if (!Number.isFinite(value) || !Number.isFinite(denominator) || denominator <= 0 || value <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / denominator) * 100)));
}
