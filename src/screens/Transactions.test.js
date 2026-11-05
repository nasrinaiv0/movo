import { billingCycleOptions, sortList } from './Transactions';
import { chipLabel, signed, money } from '../lib/format';

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
  test('offers All, marks the active month Present, and keeps historical labels compact', () => {
    expect(billingCycleOptions(['2026-11', '2026-10', '2026-09'], '2026-11')).toEqual([
      { value: 'all', label: 'All' },
      { value: '2026-11', label: 'Present' },
      { value: '2026-10', label: 'Oct' },
      { value: '2026-09', label: 'Sep' },
    ]);
  });

  test('disambiguates repeated month names across years', () => {
    expect(billingCycleOptions(['2026-11', '2025-11', '2025-09'], '2026-11')).toEqual([
      { value: 'all', label: 'All' },
      { value: '2026-11', label: 'Present' },
      { value: '2025-11', label: 'Nov 2025' },
      { value: '2025-09', label: 'Sep' },
    ]);
  });

  test('keeps the All option available when there is no transaction history', () => {
    expect(billingCycleOptions([], '2026-11')).toEqual([{ value: 'all', label: 'All' }]);
  });
});


test('allocation activities have a neutral amount and explicit allocation labels', () => {
  expect(chipLabel({ type: 'allocation', event_type: 'allocated' })).toBe('Allocation');
  expect(chipLabel({ type: 'allocation', event_type: 'auto_released' })).toBe('Released');
  expect(signed('allocation', 250, 'PHP')).toBe(money(250, 'PHP'));
});
