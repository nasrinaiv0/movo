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

test('Total Spent billing-cycle chart renders twelve months with no chart leak when balances hidden', () => {
  const React = require('react');
  const {createRoot}=require('react-dom/client');
  const {act}=require('react');
  const {BillingCycleChart}=require('./Transactions');
  global.IS_REACT_ACT_ENVIRONMENT=true;
  const host=document.createElement('div');document.body.append(host);
  const root=createRoot(host);
  try {
    const cycles=Array.from({length:12},(_,i)=>({key:'2026-'+String(i+1).padStart(2,'0'),amount:(i+1)*100.50}));
    act(()=>root.render(React.createElement(BillingCycleChart,{cycles,visible:true})));
    expect(host.querySelectorAll('.billing-cycle-chart-bar')).toHaveLength(12);
    expect(host.textContent).toContain('Billing cycles');
    expect(host.textContent).toContain('Jan');
    expect(host.textContent).toContain('Dec');
    const [first,last]=host.querySelectorAll('.billing-cycle-chart-bar');
    expect(parseFloat(first.style.height)).toBeLessThan(parseFloat(last.style.height));
    act(()=>root.render(React.createElement(BillingCycleChart,{cycles,visible:false})));
    expect([...host.querySelectorAll('.billing-cycle-chart-bar')].every(b=>b.style.height==='5%')).toBe(true);
  } finally {act(()=>root.unmount());host.remove()}
});

test('the graph follows the filter: a month shows its days, and the filter control is an icon with the cycle in its name', () => {
  const React = require('react');
  const { createRoot } = require('react-dom/client');
  const { act } = require('react');
  const { BillingCycleChart } = require('./Transactions');
  const { dailyCycleSpending } = require('../lib/billingCycleSpending');
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  try {
    const rows = dailyCycleSpending([{ type: 'expense', amount: 47, date: '2026-11-10T04:41:00Z' }], '2026-11');
    act(() => root.render(React.createElement(BillingCycleChart, { cycles: rows, visible: true, title: 'Nov 2026', selectedKey: '2026-11-10' })));
    expect(host.querySelectorAll('.billing-cycle-chart-bar')).toHaveLength(30);
    expect(host.querySelector('.billing-cycle-chart-plot').className).toContain('dense');
    expect(host.querySelector('.billing-cycle-chart-title').textContent).toBe('Nov 2026');
    const axis = host.querySelectorAll('.billing-cycle-chart-axis span');
    expect(axis[0].textContent).toBe('Nov 1');
    expect(axis[1].textContent).toBe('Nov 30');
    const columns = [...host.querySelectorAll('.billing-cycle-chart-column')];
    expect(columns.findIndex(c => c.classList.contains('selected'))).toBe(9);
    expect(columns[9].firstChild.style.height).toBe('100%');
    // A past cycle marks no single day.
    act(() => root.render(React.createElement(BillingCycleChart, { cycles: rows, visible: true, title: 'Nov 2026', selectedKey: '' })));
    expect(host.querySelector('.billing-cycle-chart-column.selected')).toBeNull();
  } finally { act(() => root.unmount()); host.remove(); }
  const source = require('fs').readFileSync(require('path').join(__dirname, 'Transactions.js'), 'utf8');
  expect(source).toContain('<Icon name="sliders" size={18} />');
  expect(source).not.toContain('tx-period-filter-value');
});
