import { matchesConfirmedOfflineHandoff } from './offlineHandoffSafety';
const OWNER='123e4567-e89b-42d3-a456-426614174000';
const OTHER='123e4567-e89b-42d3-a456-426614174001';
const A='123e4567-e89b-42d3-a456-426614174002';
const T='123e4567-e89b-42d3-a456-426614174003';
const account={id:A,user_id:OWNER,account_type:'cash',name:'Cash',currency:'PHP',opening_balance:'100.25'};
const tx={id:T,user_id:OWNER,account_id:A,transaction_type:'expense',amount:'12.34',currency:'PHP',merchant:'Milk',occurred_at:'2026-11-08T01:00:00Z'};
const rows={financial_accounts:[account],transactions:[tx]};
const ws={version:2,owner:OWNER,dirty:false,lastConfirmedAt:'2026-11-08T01:01:00Z',baseline:rows,working:rows};
test('accepts exact verified account and transaction snapshot regardless of display row order',()=>{
  expect(matchesConfirmedOfflineHandoff(OWNER,ws,rows)).toBe(true);
  expect(matchesConfirmedOfflineHandoff(OWNER,ws,{financial_accounts:[{...account,opening_balance:100.25}],transactions:[{...tx,amount:12.34}]})).toBe(true);
});
test.each([
  ['missing cloud row',{financial_accounts:[account],transactions:[]}],
  ['stale amount',{financial_accounts:[account],transactions:[{...tx,amount:'12.33'}]}],
  ['stale account',{financial_accounts:[{...account,name:'Altered'}],transactions:[tx]}],
  ['wrong owner',{financial_accounts:[account],transactions:[{...tx,user_id:OTHER}]}],
  ['duplicate transaction',{financial_accounts:[account],transactions:[tx,tx]}],
  ['invalid collection',{financial_accounts:null,transactions:[tx]}],
])('fails closed for %s',(_name,input)=>{
  expect(matchesConfirmedOfflineHandoff(OWNER,ws,input)).toBe(false);
});
test('requires confirmed owner baseline with no outstanding offline changes',()=>{
  expect(matchesConfirmedOfflineHandoff(OTHER,ws,rows)).toBe(false);
  expect(matchesConfirmedOfflineHandoff(OWNER,{...ws,dirty:true},rows)).toBe(false);
  expect(matchesConfirmedOfflineHandoff(OWNER,{...ws,lastConfirmedAt:''},rows)).toBe(false);
  expect(matchesConfirmedOfflineHandoff(OWNER,null,rows)).toBe(false);
});
