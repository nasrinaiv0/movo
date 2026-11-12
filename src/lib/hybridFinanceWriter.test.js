import 'fake-indexeddb/auto';
import { webcrypto } from 'crypto';
import { TextEncoder } from 'util';
import { supabase } from './supabaseClient';
import { writeHybridFinance } from './hybridFinanceWriter';
import { saveOfflineWorkspace,loadOfflineWorkspace } from './offlineWorkspaceStore';
import { clearHybridOwner,listOwnerSyncOperations,listLocalFinanceRecords } from './hybridLocalStore';
import { recoverHybridWorkspace } from './hybridWorkspaceRecovery';
jest.mock('./supabaseClient',()=>({supabase:{auth:{getSession:jest.fn()},rpc:jest.fn()}}));
if(typeof global.structuredClone!=='function')global.structuredClone=value=>JSON.parse(JSON.stringify(value));
Object.defineProperty(globalThis,'crypto',{value:webcrypto,configurable:true});globalThis.TextEncoder=TextEncoder;
const ownerId='123e4567-e89b-42d3-a456-426614174000',recordId='123e4567-e89b-42d3-a456-426614174001';
const payload={name:'Cash',account_type:'cash',currency:'PHP',opening_balance:100};
const op={ownerId,recordId,group:'financial_accounts',kind:'create',payload};
beforeEach(async()=>{
 jest.clearAllMocks();localStorage.clear();await clearHybridOwner(ownerId);
 const empty={financial_accounts:[],transactions:[]};
 saveOfflineWorkspace(ownerId,{owner:ownerId,baseline:empty,working:empty,dirty:false});
 supabase.auth.getSession.mockResolvedValue({data:{session:{user:{id:ownerId},access_token:'test'}}});
 supabase.rpc.mockImplementation(async(name,args)=>({data:{ownerId,recordId,operationId:args.p_operation_id,
  revision:1,record:{...payload,id:recordId,user_id:ownerId,updated_at:'2026-11-10T00:00:00Z'}}}));
});
test('local intent exists before transport and ACK/cache exist before returning success',async()=>{
 const impl=supabase.rpc.getMockImplementation();
 supabase.rpc.mockImplementation(async(...args)=>{
  expect((await listOwnerSyncOperations(ownerId))[0].status).toBe('pending');
  expect(await listLocalFinanceRecords(ownerId,'financial_accounts')).toHaveLength(1);
  return impl(...args);
 });
 await writeHybridFinance(op);
 expect((await listOwnerSyncOperations(ownerId))[0].status).toBe('confirmed');
 expect(loadOfflineWorkspace(ownerId).baseline.financial_accounts).toHaveLength(1);
});
test('lost cloud response keeps one recoverable intent and retry identity',async()=>{
 const impl=supabase.rpc.getMockImplementation();supabase.rpc.mockRejectedValueOnce(new TypeError('Failed to fetch'));
 await expect(writeHybridFinance(op)).rejects.toThrow('fetch');
 expect((await listOwnerSyncOperations(ownerId))[0].status).toBe('pending');
 await recoverHybridWorkspace(ownerId);
 expect(loadOfflineWorkspace(ownerId).working.financial_accounts).toHaveLength(1);
 supabase.rpc.mockImplementation(impl);
 await writeHybridFinance(op);
 expect(supabase.rpc.mock.calls[0][1].p_operation_id).toBe(supabase.rpc.mock.calls[1][1].p_operation_id);
 expect(await listOwnerSyncOperations(ownerId)).toHaveLength(1);
});
test('explicit SQL rejection is not resurrected as a successful local save',async()=>{
 supabase.rpc.mockResolvedValue({error:{code:'42501',message:'forbidden'}});
 await expect(writeHybridFinance(op)).rejects.toMatchObject({code:'42501'});
 expect((await listOwnerSyncOperations(ownerId))[0].status).toBe('failed');
 await recoverHybridWorkspace(ownerId);
 expect(loadOfflineWorkspace(ownerId).working.financial_accounts).toHaveLength(0);
});

// Local first (owner, 2026-11-12): the app may show the change as soon as it is safe on this device.
test('onLocal fires after the device commit and before the cloud call, with the record to show', async()=>{
 const order=[];
 const impl=supabase.rpc.getMockImplementation();
 supabase.rpc.mockImplementation(async(...args)=>{order.push('cloud');return impl(...args);});
 const onLocal=jest.fn(async()=>{});
 const shown=[];
 await writeHybridFinance({...op,onLocal:record=>{
  order.push('local');shown.push(record);
  return listOwnerSyncOperations(ownerId).then(ops=>{expect(ops[0].status).toBe('pending');onLocal();});
 }});
 expect(order).toEqual(['local','cloud']);
 expect(shown[0]).toMatchObject({...payload,id:recordId});
 expect((await listOwnerSyncOperations(ownerId))[0].status).toBe('confirmed');
});
test('a failing onLocal display never breaks or skips the durable write', async()=>{
 const record=await writeHybridFinance({...op,onLocal:()=>{throw new Error('render failed');}});
 expect(record.id).toBe(recordId);
 expect((await listOwnerSyncOperations(ownerId))[0].status).toBe('confirmed');
});
test('validation that stops before the device commit never calls onLocal', async()=>{
 supabase.auth.getSession.mockResolvedValue({data:{session:null}});
 const onLocal=jest.fn();
 await expect(writeHybridFinance({...op,onLocal})).rejects.toThrow('Cloud sign-in changed or expired');
 expect(onLocal).not.toHaveBeenCalled();
 expect(await listOwnerSyncOperations(ownerId)).toHaveLength(0);
});
test('a lost connection after onLocal keeps the shown change pending on this device', async()=>{
 supabase.rpc.mockRejectedValueOnce(new TypeError('Failed to fetch'));
 const onLocal=jest.fn();
 await expect(writeHybridFinance({...op,onLocal})).rejects.toThrow('fetch');
 expect(onLocal).toHaveBeenCalledTimes(1);
 expect((await listOwnerSyncOperations(ownerId))[0].status).toBe('pending');
 await recoverHybridWorkspace(ownerId);
 expect(loadOfflineWorkspace(ownerId).working.financial_accounts).toHaveLength(1);
});
