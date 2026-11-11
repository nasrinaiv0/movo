import { applyHybridCloudOperation } from './hybridSyncCloudAdapter';
jest.mock('./hybridSyncCloudAdapter',()=>({applyHybridCloudOperation:jest.fn()}));
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
beforeEach(()=>{jest.resetAllMocks();getCurrentSession.mockResolvedValue({user:{id:O},access_token:'test-token'});applyHybridCloudOperation.mockResolvedValue({record:{id:T}});});
test('validated offline CSV transaction is inserted with exact two cents and allowed source',async()=>{
 await insertOfflineTransaction(tx,O);
 const inserted=applyHybridCloudOperation.mock.calls[0][0].payload;
 expect(inserted).toEqual(expect.objectContaining({id:T,user_id:O,amount:1.23,source:'csv_import',account_id:A}));
 expect(inserted.receipt_path).toBeNull();
});
test.each([{...tx,amount:'0.001'},{...tx,account_id:'local'},{...tx,receipt_path:'localreceipt:local-path'},{...tx,transaction_type:'transfer',transfer_to_account_id:A}])('rejects unsafe sync transaction without cloud write: %p',async row=>{
 await expect(insertOfflineTransaction(row,O)).rejects.toThrow();
 expect(supabase.from).not.toHaveBeenCalled();
});
test('account creation retains local UUID and exact two decimals',async()=>{
 await insertOfflineAccount(bank,O);
 expect(applyHybridCloudOperation.mock.calls[0][0].payload).toEqual(expect.objectContaining({id:A,user_id:O,opening_balance:120.5,currency:'PHP'}));
});
test('cloud CAS never overwrites a missing expected version',async()=>{
 await expect(updateOfflineAccountCAS(bank,'',O)).rejects.toThrow('revision');
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
 await updateOfflineTransactionCAS({...tx,source:'applepay',external_reference:'ref-1'},'2026-11-08T01:00:00.123456+00:00',O);
 const update=applyHybridCloudOperation.mock.calls[0][0].payload;
 expect(update).toEqual(expect.objectContaining({amount:1.23,merchant:'Coffee',account_id:A}));
 ['id','user_id','source','external_reference','schedule_id'].forEach(key=>expect(update).not.toHaveProperty(key));
 expect(applyHybridCloudOperation.mock.calls[0][0]).toMatchObject({recordId:T,ownerId:O,expectedUpdatedAt:'2026-11-08T01:00:00.123456+00:00'});
});
test('an offline edit that finds no row at the checked revision fails instead of overwriting',async()=>{
 applyHybridCloudOperation.mockRejectedValue(new Error('updated elsewhere'));
 await expect(updateOfflineTransactionCAS(tx,'2026-11-08T01:00:00Z',O)).rejects.toThrow('updated elsewhere');
 await expect(updateOfflineTransactionCAS(tx,'',O)).rejects.toThrow('revision');
});
test('deletion sends expected revision to one atomic reversing RPC without a check/delete race',async()=>{
 await expect(deleteOfflineTransactionCAS(T,'2026-11-08T01:00:00Z',O)).resolves.toBe(true);
 expect(applyHybridCloudOperation).toHaveBeenCalledWith({ownerId:O,group:'transactions',kind:'delete',recordId:T,payload:null,expectedUpdatedAt:'2026-11-08T01:00:00Z'});
 expect(supabase.from).not.toHaveBeenCalled();
 applyHybridCloudOperation.mockRejectedValue(new Error('sync_revision_conflict'));
 await expect(deleteOfflineTransactionCAS(T,'2026-11-08T01:00:00Z',O)).rejects.toThrow('conflict');
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
