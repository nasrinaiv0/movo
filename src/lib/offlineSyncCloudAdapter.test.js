import { insertOfflineTransaction, insertOfflineAccount, updateOfflineAccountCAS, fetchOfflineSyncCloud } from './offlineSyncCloudAdapter';
import { supabase } from './supabaseClient';
import { getCurrentSession, listAccounts, listTransactions } from './financeRepository';
jest.mock('./supabaseClient',()=>({supabase:{from:jest.fn()}}));
jest.mock('./financeRepository',()=>({getCurrentSession:jest.fn(),listAccounts:jest.fn(),listTransactions:jest.fn()}));
const O='123e4567-e89b-42d3-a456-426614174000';
const A='123e4567-e89b-42d3-a456-426614174002';
const T='123e4567-e89b-42d3-a456-426614174003';
const tx={id:T,account_id:A,merchant:'Coffee',amount:'1.23',transaction_type:'expense',occurred_at:'2026-11-08T00:00:00Z',currency:'PHP',category:'Food',source:'CSV Import'};
const bank={id:A,account_type:'bank',name:'Savings',currency:'PHP',opening_balance:'120.50'};
function repo(){
 const single=jest.fn(async()=>({data:{id:T},error:null}));
 const maybeSingle=jest.fn(async()=>({data:{id:A},error:null}));
 const selection={single,maybeSingle};
 const eq=jest.fn(()=>({eq,select:()=>selection}));
 const select=jest.fn(()=>selection);
 const insert=jest.fn(()=>({select}));
 const update=jest.fn(()=>({eq}));
 supabase.from.mockImplementation(()=>({insert,update}));
 return {single,insert,update,eq,select,maybeSingle};
}
beforeEach(()=>{jest.resetAllMocks();getCurrentSession.mockResolvedValue({user:{id:O},access_token:'test-token'});});
test('validated offline CSV transaction is inserted with exact two cents and allowed source',async()=>{
 const r=repo();await insertOfflineTransaction(tx,O);
 const inserted=r.insert.mock.calls[0][0];
 expect(inserted).toEqual(expect.objectContaining({id:T,user_id:O,amount:1.23,source:'csv_import',account_id:A}));
 expect(inserted.receipt_path).toBeNull();
});
test.each([{...tx,amount:'0.001'},{...tx,account_id:'local'},{...tx,receipt_path:'localreceipt:local-path'},{...tx,transaction_type:'transfer',transfer_to_account_id:A}])('rejects unsafe sync transaction without cloud write: %p',async row=>{
 repo();await expect(insertOfflineTransaction(row,O)).rejects.toThrow();
 expect(supabase.from).not.toHaveBeenCalled();
});
test('account creation retains local UUID and exact two decimals',async()=>{
 const r=repo();await insertOfflineAccount(bank,O);
 expect(r.insert.mock.calls[0][0]).toEqual(expect.objectContaining({id:A,user_id:O,opening_balance:120.5,currency:'PHP'}));
});
test('cloud CAS never overwrites a missing expected version',async()=>{
 repo();await expect(updateOfflineAccountCAS(bank,'',O)).rejects.toThrow('revision');
 expect(supabase.from).not.toHaveBeenCalled();
});
test('cloud fetch verifies currently signed-in owner before RLS reads',async()=>{
 listAccounts.mockResolvedValue([bank]);listTransactions.mockResolvedValue([tx]);
 await expect(fetchOfflineSyncCloud(O)).resolves.toHaveProperty('transactions');
 getCurrentSession.mockResolvedValue({user:{id:'different'},access_token:'test-token'});
 await expect(fetchOfflineSyncCloud(O)).rejects.toThrow('sign-in changed');
 expect(listAccounts).toHaveBeenCalledTimes(1);
});
