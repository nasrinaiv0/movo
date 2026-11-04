import { walletAssetTotal, walletTypePercentage } from './walletTotals';

test('wallet asset total excludes archived accounts and all cards', () => {
  const accounts = [
    { account_type: 'bank', balance: 1000, currency: 'PHP' },
    { account_type: 'e_wallet', balance: 250, currency: 'PHP' },
    { account_type: 'cash', balance: 50, currency: 'PHP' },
    { account_type: 'card', balance: 9000, currency: 'PHP' },
    { account_type: 'bank', balance: 500, currency: 'PHP', is_archived: true },
  ];
  expect(walletAssetTotal(accounts)).toBe(1300);
});

test('wallet asset total converts currencies and ignores malformed amounts', () => {
  const accounts = [
    { account_type: 'bank', balance: 100, currency: 'USD' },
    { account_type: 'bank', balance: 'bad', currency: 'PHP' },
  ];
  expect(walletAssetTotal(accounts, (amount, currency) => currency === 'USD' ? amount * 56 : amount)).toBe(5600);
});

test('wallet type percentage uses non-card total and stays within 0–100', () => {
  expect(walletTypePercentage(250, 1300)).toBe(19);
  expect(walletTypePercentage(0, 1300)).toBe(0);
  expect(walletTypePercentage(250, 0)).toBe(0);
  expect(walletTypePercentage(2000, 1300)).toBe(100);
});
