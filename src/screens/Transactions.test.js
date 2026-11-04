import { billingCycleOptions, sortList } from './Transactions';

describe('sortList', () => {
  test('sorts transfer rows by source and destination account names, not merchant text', () => {
    const rows = [
      { merchant: 'A transfer', accountName: 'Wallet', transferToAccountName: 'BPI' },
      { merchant: 'Z transfer', accountName: 'Bank', transferToAccountName: 'GCash' },
      { merchant: 'B transfer', accountName: 'Bank', transferToAccountName: 'BPI' },
    ];
    expect(sortList(rows, 'From/To').map(row => row.merchant))
      .toEqual(['B transfer', 'Z transfer', 'A transfer']);
  });

  test('merchant sort remains based on merchant name', () => {
    const rows = [
      { merchant: 'Zebra', accountName: 'Bank', transferToAccountName: 'BPI' },
      { merchant: 'Alpha', accountName: 'Wallet', transferToAccountName: 'GCash' },
    ];
    expect(sortList(rows, 'Merchant').map(row => row.merchant)).toEqual(['Alpha', 'Zebra']);
  });
});

describe('billingCycleOptions', () => {
  test('offers all cycles, labels the current month Present, and retains older months', () => {
    expect(billingCycleOptions(['2026-11', '2026-10', '2026-09'], '2026-11')).toEqual([
      { value: 'all', label: 'All' },
      { value: '2026-11', label: 'Present' },
      { value: '2026-10', label: 'Oct 2026' },
      { value: '2026-09', label: 'Sep 2026' },
    ]);
  });

  test('keeps the All option available when there is no transaction history', () => {
    expect(billingCycleOptions([], '2026-11')).toEqual([{ value: 'all', label: 'All' }]);
  });
});
