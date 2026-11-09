import { insertOfflineTransaction, insertOfflineAccount, updateOfflineAccountCAS, fetchOfflineSyncCloud, updateOfflineTransactionCAS, deleteOfflineTransactionCAS, uploadOfflineReceipt } from './offlineSyncCloudAdapter';
import { getLocalAttachment } from './localAttachments';
import { supabase } from './supabaseClient';
import { getCurrentSession, listAccounts, listTransactions } from './financeRepository';
jest.mock('./supabaseClient',()=>({supabase:{from:jest.fn(),rpc:jest.fn(),storage:{from:jest.fn()}}}));
jest.mock('./localAttachments',()=>({getLocalAttachment:jest.fn()}));
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

test('an offline edit updates only editable fields and only at the checked revision',async()=>{
 const r=repo();
 await updateOfflineTransactionCAS({...tx,source:'applepay',external_reference:'ref-1'},'2026-11-08T01:00:00.123456+00:00',O);
 const update=r.update.mock.calls[0][0];
 expect(update).toEqual(expect.objectContaining({amount:1.23,merchant:'Coffee',account_id:A}));
 ['id','user_id','source','external_reference','schedule_id'].forEach(key=>expect(update).not.toHaveProperty(key));
 expect(r.eq.mock.calls).toEqual([['id',T],['user_id',O],['updated_at','2026-11-08T01:00:00.123456+00:00']]);
});
test('an offline edit that finds no row at the checked revision fails instead of overwriting',async()=>{
 const r=repo();r.maybeSingle.mockResolvedValue({data:null,error:null});
 await expect(updateOfflineTransactionCAS(tx,'2026-11-08T01:00:00Z',O)).rejects.toThrow('updated elsewhere');
 await expect(updateOfflineTransactionCAS(tx,'',O)).rejects.toThrow('revision');
});
function readRow(row){
 const maybeSingle=jest.fn(async()=>({data:row,error:null}));
 const eq=jest.fn(()=>({eq,maybeSingle}));
 supabase.from.mockImplementation(()=>({select:()=>({eq})}));
}
test('an offline deletion uses the reversing server procedure only while the row is unchanged',async()=>{
 readRow({id:T,updated_at:'r1'});supabase.rpc.mockResolvedValue({error:null});
 await expect(deleteOfflineTransactionCAS(T,'r1',O)).resolves.toBe(true);
 expect(supabase.rpc).toHaveBeenCalledWith('delete_transaction_with_reversals',{p_transaction_id:T});
 readRow({id:T,updated_at:'r2'});supabase.rpc.mockClear();
 await expect(deleteOfflineTransactionCAS(T,'r1',O)).rejects.toThrow('updated elsewhere');
 expect(supabase.rpc).not.toHaveBeenCalled();
 readRow(null);
 await expect(deleteOfflineTransactionCAS(T,'r1',O)).resolves.toBe(false);
 expect(supabase.rpc).not.toHaveBeenCalled();
});
test('a device receipt uploads to a fixed path in the owner folder',async()=>{
 const upload=jest.fn(async()=>({error:null}));supabase.storage.from.mockReturnValue({upload});
 const file={type:'image/png',size:2048};getLocalAttachment.mockResolvedValue(file);
 await expect(uploadOfflineReceipt('localreceipt:x',T,O)).resolves.toBe(O+'/offline-'+T+'.png');
 expect(supabase.storage.from).toHaveBeenCalledWith('movo-receipts');
 expect(upload).toHaveBeenCalledWith(O+'/offline-'+T+'.png',file,{contentType:'image/png',upsert:true});
 getLocalAttachment.mockResolvedValue(null);
 await expect(uploadOfflineReceipt('localreceipt:x',T,O)).rejects.toThrow('missing');
 await expect(uploadOfflineReceipt('https://elsewhere',T,O)).rejects.toThrow('Only receipts');
});
test('records are checked for upload without any network call',async()=>{
 const { offlineUploadProblem } = await import('./offlineSyncCloudAdapter');
 expect(offlineUploadProblem('transactions',tx,O)).toBe('');
 expect(offlineUploadProblem('transactions',{...tx,receipt_path:'localreceipt:x'},O)).toBe('');
 expect(offlineUploadProblem('transactions',{...tx,account_id:'local'},O)).toMatch(/account UUID/);
 expect(offlineUploadProblem('financial_accounts',bank,O)).toBe('');
 expect(offlineUploadProblem('financial_accounts',{...bank,account_type:'crypto'},O)).toMatch(/invalid name or type/);
 expect(offlineUploadProblem('budgets',{},O)).toMatch(/not yet verified/);
 expect(supabase.from).not.toHaveBeenCalled();
});
