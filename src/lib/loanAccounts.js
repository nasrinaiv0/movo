/** Payment methods keep the chosen card visible, while linked debit cards post to their bank ledger. */
export function loanPaymentMethods(accounts = [], currency) {
  return accounts.filter(account => !account.is_archived && account.currency === currency &&
    ['bank', 'e_wallet', 'cash', 'card'].includes(account.account_type) &&
    (account.account_type !== 'card' || account.cardKind === 'credit' || account.cardKind === 'debit') &&
    (!account.linkedAccountId || account.cardKind === 'credit' || accounts.some(bank =>
      bank.id === account.linkedAccountId && !bank.is_archived && bank.account_type === 'bank' && bank.currency === currency)));
}

export function loanPaymentLedger(accounts, selectedId, currency) {
  const account = loanPaymentMethods(accounts, currency).find(item => item.id === selectedId);
  if (!account) return '';
  return account.account_type === 'card' && account.cardKind === 'debit' && account.linkedAccountId
    ? account.linkedAccountId : account.id;
}
