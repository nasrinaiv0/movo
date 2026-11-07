import { cashbackTotals, estimateCashback } from './cashback';

const accounts = [
  { id: 'wallet', name: 'Wallet', account_type: 'e_wallet', currency: 'PHP' },
  { id: 'bank', name: 'Bank', institution_name: 'Example Bank', account_type: 'bank', currency: 'USD' },
  { id: 'card', name: 'Card', account_type: 'card', currency: 'PHP' },
];

test('estimates cashback from expenses using the selected account rate and currency', () => {
  expect(estimateCashback([{ id: 'tx1', type: 'expense', amount: 1000, account_id: 'wallet', merchant: 'Groceries' }], accounts, { wallet: { enabled: true, rate: 2 } }))
    .toEqual([{ id: 'auto-tx1', transactionId: 'tx1', date: '', source: 'Groceries', account: 'Wallet', accountId: 'wallet', amount: 20, currency: 'PHP', rate: 2, status: 'Estimated' }]);
});

test('applies a per-transaction cap and ignores disabled, invalid, and archived rules', () => {
  const txs = [
    { id: 'a', type: 'expense', amount: 1000, account_id: 'wallet' },
    { id: 'b', type: 'expense', amount: 1000, account_id: 'bank' },
    { id: 'c', type: 'expense', amount: 1000, account_id: 'card' },
    { id: 'd', type: 'income', amount: 1000, account_id: 'wallet' },
  ];
  expect(estimateCashback(txs, accounts, {
    wallet: { enabled: true, rate: 5, cap: 10 },
    bank: { enabled: true, rate: 101 },
    card: { enabled: false, rate: 5 },
  })).toHaveLength(1);
  expect(estimateCashback(txs, accounts, { wallet: { enabled: true, rate: 5, cap: 10 } })[0].amount).toBe(10);
});

test('groups totals by currency instead of adding unlike currencies', () => {
  expect(cashbackTotals([{ amount: 10, currency: 'PHP' }, { amount: 2.5, currency: 'PHP' }, { amount: 3, currency: 'USD' }]))
    .toEqual({ PHP: 12.5, USD: 3 });
});
test('an opt-in eligible credit-card preset applies category filtering and a monthly cap in chronological order', () => {
  const account={id:'cc',name:'Credit',account_type:'card',currency:'PHP'};
  const transactions=[
    {id:'t2',type:'expense',account_id:'cc',amount:10000,date:'2026-11-20',category:'Dining',merchant:'Diner',currency:'PHP'},
    {id:'t1',type:'expense',account_id:'cc',amount:10000,date:'2026-11-01',category:'Dining',merchant:'Coffee',currency:'PHP'},
    {id:'t3',type:'expense',account_id:'cc',amount:1000,date:'2026-11-22',category:'Fuel',merchant:'Gas',currency:'PHP'},
    {id:'t4',type:'income',account_id:'cc',amount:200,date:'2026-11-23',category:'Dining',currency:'PHP'},
  ];
  const rule={cc:{presetId:'eastwest-visa',verified:true,enabled:true,rate:'8.88',scopeCategory:'Dining',monthlyCap:'1250',conditions:'Dining only'}};
  const actual=estimateCashback(transactions,[account],rule);
  expect(actual.map(t=>[t.id,t.amount])).toEqual([['auto-t1',888],['auto-t2',362]]);
  expect(actual.reduce((sum,row)=>sum+row.amount,0)).toBe(1250);
});
test('source terms need confirmation; per-receipt steps and minimums never round up', () => {
  const card={id:'c',name:'Amore',account_type:'card',currency:'PHP'};
  const tx=[{id:'p',type:'expense',account_id:'c',amount:1950,date:'2026-11-08',category:'Groceries',currency:'PHP'}];
  const base={c:{presetId:'bpi-amore',enabled:true,verified:false,rate:'4',scopeCategory:'Groceries',fullSpendStep:'1000',conditions:'Full receipt blocks'}};
  expect(estimateCashback(tx,[card],base)).toHaveLength(0);
  expect(estimateCashback(tx,[card],{c:{...base.c,verified:true}})[0].amount).toBe(40);
  expect(estimateCashback(tx,[card],{c:{...base.c,verified:true,manualOnly:true}})).toHaveLength(0);
});
test('conditional percentage without a category or merchant is not applied to every expense', () => {
  const card={id:'c',name:'Bank card',account_type:'card',currency:'PHP'};
  const tx=[{id:'x',type:'expense',account_id:'c',amount:1000,date:'2026-11-08'}];
  expect(estimateCashback(tx,[card],{c:{presetId:'eastwest-visa',enabled:true,verified:true,rate:'8.88',conditions:'Some eligible categories'}})).toEqual([]);
});
