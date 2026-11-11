/** Wallet filter taxonomy: non-cash rewards are shown only in All and Others. */
export const WALLET_FILTERS = Object.freeze(['All', 'Cards', 'Bank Accounts', 'E-Wallets', 'Others']);

const OTHER_ACCOUNT_TYPES = Object.freeze(['cash', 'investment', 'coupon', 'gift_card', 'other']);

export const WALLET_ACCOUNT_TYPES = Object.freeze({
  // E-wallets are card-shaped wallet assets too; keep the dedicated E-Wallets filter intact.
  Cards: ['card', 'e_wallet'],
  'Bank Accounts': ['bank'],
  'E-Wallets': ['e_wallet'],
  Others: OTHER_ACCOUNT_TYPES,
  // Legacy locally saved filter name; do not drop previously selected wallet filters.
  'Cash & Other': OTHER_ACCOUNT_TYPES,
});

export const includesWalletLoyalty = filter => filter === 'All' || filter === 'Others' || filter === 'Cash & Other';

export function matchesWalletAccountFilter(account, filter) {
  if (!account || account.is_archived) return false;
  if (filter === 'All') return true;
  return (WALLET_ACCOUNT_TYPES[filter] || []).includes(account.account_type);
}
