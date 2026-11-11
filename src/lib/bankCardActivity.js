/** Read-only account and card activity helpers. Never change ledger ownership or balances. */
export function linkedBankIdForCard(card, prefs = {}) {
  if (!card || card.account_type !== 'card') return '';
  const style = prefs.accountStyles?.[card.id] || {};
  const issuer = style.issuerBankId || card.issuerBankId || '';
  const debitLink = prefs.cardBankLinks?.[card.id] || card.linkedAccountId || '';
  return (style.cardKind || card.cardKind) === 'credit' ? (issuer || debitLink) : (debitLink || issuer);
}

export function linkedCardsForBank(bank, accounts = [], prefs = {}) {
  if (!bank || bank.account_type !== 'bank') return [];
  return accounts.filter(card => card?.account_type === 'card' && !card.is_archived && card.id !== bank.id && linkedBankIdForCard(card, prefs) === bank.id);
}

export function accountActivityRows(transactions = [], accountIds = []) {
  const allowed = new Set(accountIds.filter(Boolean));
  const seen = new Set();
  const timestamp = item => {
    const value = Date.parse(item.date || item.occurred_at || item.created_at || '');
    return Number.isFinite(value) ? value : 0;
  };
  return transactions.filter(item => {
    if (!item || (!allowed.has(item.account_id) && !allowed.has(item.transfer_to_account_id))) return false;
    if (item.id != null && item.id !== '') {
      const id = String(item.id);
      if (seen.has(id)) return false;
      seen.add(id);
    }
    return true;
  }).sort((a, b) => timestamp(b) - timestamp(a));
}
