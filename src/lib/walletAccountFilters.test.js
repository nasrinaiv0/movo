import { WALLET_FILTERS, includesWalletLoyalty, matchesWalletAccountFilter } from './walletAccountFilters';

const account = account_type => ({ id: account_type, account_type });
test('five compact visible filters have one combined Others chip', () => {
  expect(WALLET_FILTERS).toEqual(['All', 'Cards', 'Bank Accounts', 'E-Wallets', 'Others']);
});
test('cash and other account types show only under Others, not Cards or Banks', () => {
  ['cash', 'investment', 'other', 'coupon', 'gift_card'].forEach(type => {
    expect(matchesWalletAccountFilter(account(type), 'Others')).toBe(true);
    expect(matchesWalletAccountFilter(account(type), 'Cards')).toBe(false);
    expect(matchesWalletAccountFilter(account(type), 'Bank Accounts')).toBe(false);
  });
  expect(matchesWalletAccountFilter(account('card'), 'Others')).toBe(false);
  expect(matchesWalletAccountFilter(account('bank'), 'Others')).toBe(false);
  expect(matchesWalletAccountFilter(account('e_wallet'), 'Others')).toBe(false);
});
test('rewards join All and Others; legacy Cash & Other remains readable', () => {
  expect(includesWalletLoyalty('All')).toBe(true);
  expect(includesWalletLoyalty('Others')).toBe(true);
  expect(includesWalletLoyalty('Cash & Other')).toBe(true);
  expect(includesWalletLoyalty('Cards')).toBe(false);
  expect(matchesWalletAccountFilter(account('cash'), 'Cash & Other')).toBe(true);
  expect(matchesWalletAccountFilter({ ...account('cash'), is_archived: true }, 'Others')).toBe(false);
});

test('e-wallets appear in both the Cards carousel filter and the dedicated E-Wallets filter', () => {
  expect(matchesWalletAccountFilter(account('e_wallet'), 'Cards')).toBe(true);
  expect(matchesWalletAccountFilter(account('e_wallet'), 'E-Wallets')).toBe(true);
  expect(matchesWalletAccountFilter(account('card'), 'E-Wallets')).toBe(false);
  expect(matchesWalletAccountFilter({ ...account('e_wallet'), is_archived: true }, 'Cards')).toBe(false);
  expect(matchesWalletAccountFilter(account('bank'), 'Cards')).toBe(false);
});
