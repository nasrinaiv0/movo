/*
 * A transfer stores one amount in the sending account's currency. Between accounts in different currencies the
 * receiving balance would be re-converted at every day's exchange rate, so MOVO keeps transfers within one
 * currency (audit 2026-11-23). Automated transfers already enforce this on the server (transfer_currency_mismatch).
 */
const currencyOf = (accounts, id) => {
  const account = (Array.isArray(accounts) ? accounts : []).find(a => a && a.id === id);
  return account ? (account.currency || 'PHP') : '';
};

/** True when both accounts use the same currency, or when either is not chosen yet. */
export function sameTransferCurrency(accounts, fromId, toId) {
  if (!fromId || !toId) return true;
  const from = currencyOf(accounts, fromId), to = currencyOf(accounts, toId);
  return !from || !to || from === to;
}

/** Accounts a transfer from `fromId` can go to: any other account in the same currency. */
export function transferTargets(accounts, fromId) {
  return (Array.isArray(accounts) ? accounts : []).filter(a => a && a.id !== fromId && sameTransferCurrency(accounts, fromId, a.id));
}
