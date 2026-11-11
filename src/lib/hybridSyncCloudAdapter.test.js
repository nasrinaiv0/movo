import { webcrypto } from 'crypto';
import { TextEncoder } from 'util';
import { applyHybridCloudOperation, syncRequestId } from './hybridSyncCloudAdapter';
import { supabase } from './supabaseClient';
jest.mock('./supabaseClient', () => ({supabase:{auth:{getSession:jest.fn()},rpc:jest.fn()}}));
const ownerId='123e4567-e89b-42d3-a456-426614174000';
const recordId='123e4567-e89b-42d3-a456-426614174001';
const op={ownerId,recordId,group:'financial_accounts',kind:'create',payload:{name:'Cash'}};
beforeAll(()=>{Object.defineProperty(globalThis,'crypto',{value:webcrypto,configurable:true});globalThis.TextEncoder=TextEncoder;});
beforeEach(()=>{
 jest.clearAllMocks();
 supabase.auth.getSession.mockResolvedValue({data:{session:{user:{id:ownerId},access_token:'test'}}});
 supabase.rpc.mockImplementation(async(_name,args)=>({data:{ownerId,recordId,operationId:args.p_operation_id,
  revision:1,record:{id:recordId,user_id:ownerId,name:'Cash'}}}));
});
test('same immutable request has same identity across key order, retries and reloads',async()=>{
 expect(await syncRequestId({a:1,b:2})).toBe(await syncRequestId({b:2,a:1}));
 await applyHybridCloudOperation(op);await applyHybridCloudOperation({...op});
 expect(supabase.rpc.mock.calls[0]).toEqual(supabase.rpc.mock.calls[1]);
 expect(await syncRequestId({...op,expectedUpdatedAt:'2026-01-01'})).not.toBe(await syncRequestId(op));
});
test('identity switch prevents sending another owner operation',async()=>{
 supabase.auth.getSession.mockResolvedValue({data:{session:{user:{id:recordId},access_token:'test'}}});
 await expect(applyHybridCloudOperation(op)).rejects.toThrow('sign-in changed');
 expect(supabase.rpc).not.toHaveBeenCalled();
});
test.each([{ownerId:recordId},{recordId:ownerId},{revision:0},{revision:2},{record:{id:recordId,user_id:recordId}}])('rejects mismatched acknowledgement %p',async patch=>{
 supabase.rpc.mockImplementation(async(_name,args)=>({data:{ownerId,recordId,operationId:args.p_operation_id,
  revision:1,record:{id:recordId,user_id:ownerId},...patch}}));
 await expect(applyHybridCloudOperation(op)).rejects.toThrow('unverified');
});
test('server conflict is preserved and never retried under a new identity',async()=>{
 supabase.rpc.mockResolvedValue({error:new Error('sync_revision_conflict')});
 await expect(applyHybridCloudOperation({...op,kind:'update',expectedUpdatedAt:'2026-01-01T00:00:00Z'})).rejects.toThrow('conflict');
 expect(supabase.rpc).toHaveBeenCalledTimes(1);
});
