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
  test('offers all cycles, marks the active month Present, and labels older months compactly', () => {
    expect(billingCycleOptions(['2026-11', '2026-09', '2026-08'], '2026-11')).toEqual([
      { value: 'all', label: 'All' },
      { value: '2026-11', label: 'Present' },
      { value: '2026-09', label: 'Sep' },
      { value: '2026-08', label: 'Aug' },
    ]);
  });
});
