import 'fake-indexeddb/auto';
if (typeof global.structuredClone !== 'function') global.structuredClone = value => JSON.parse(JSON.stringify(value));
import { commitLocalFinanceChange, listOwnerSyncOperations, clearHybridOwner } from './hybridLocalStore';
import { synchronizeHybridBatch } from './hybridSyncCoordinator';

const owner='1f47d603-5af3-4bbf-8374-4cf4a98b5c01';
const other='2f47d603-5af3-4bbf-8374-4cf4a98b5c01';
const account='3f47d603-5af3-4bbf-8374-4cf4a98b5c01';
const online='4f47d603-5af3-4bbf-8374-4cf4a98b5c01';
const offline='5f47d603-5af3-4bbf-8374-4cf4a98b5c01';
const id1='6f47d603-5af3-4bbf-8374-4cf4a98b5c01';
const id2='7f47d603-5af3-4bbf-8374-4cf4a98b5c01';
const write=(recordId,operationId,origin)=>commitLocalFinanceChange({
 ownerId:owner,group:'transactions',kind:'create',origin,operationId,
 record:{id:recordId,account_id:account,amount:3.50,currency:'PHP',transaction_type:'expense'},
});
const verifyOwner=jest.fn(async id=>{if(id!==owner)throw Error('not owner');});
const verifyCloudWrite=jest.fn(async()=>true);
const ack=jest.fn(async op=>({ownerId:owner,operationId:op.id,recordId:op.recordId,revision:op.revision}));
beforeEach(async()=>{
 await clearHybridOwner(owner);
 verifyOwner.mockReset().mockImplementation(async id=>{if(id!==owner)throw Error('not owner');});
 verifyCloudWrite.mockReset().mockResolvedValue(true);
 ack.mockReset().mockImplementation(async op=>({ownerId:owner,operationId:op.id,recordId:op.recordId,revision:op.revision}));
});
afterEach(async()=>{ await clearHybridOwner(owner); });

test('new online operation uploads while prior offline operation awaits approval',async()=>{
 await write(id1,offline,'offline');await write(id2,online,'online');
 const first=await synchronizeHybridBatch({ownerId:owner,verifyOwner,verifyCloudWrite,applyOperation:ack});
 expect(first.confirmed).toBe(1);
 expect(ack).toHaveBeenCalledWith(expect.objectContaining({id:online}));
 expect((await listOwnerSyncOperations(owner)).find(x=>x.id===offline).status).toBe('pending');
 const second=await synchronizeHybridBatch({ownerId:owner,approvedOfflineIds:[offline],verifyOwner,verifyCloudWrite,applyOperation:ack});
 expect(second.confirmed).toBe(1);
});

test('invalid entitlement fails before claiming or transmitting records',async()=>{
 await write(id1,offline,'offline');
 verifyCloudWrite.mockResolvedValue(false);
 await expect(synchronizeHybridBatch({ownerId:owner,approvedOfflineIds:[offline],verifyOwner,verifyCloudWrite,applyOperation:ack})).rejects.toThrow('entitlement');
 expect(ack).not.toHaveBeenCalled();
 expect((await listOwnerSyncOperations(owner))[0].status).toBe('pending');
});

test('lost acknowledgement is requeued using the same stable operation ID',async()=>{
 await write(id1,online,'online');
 ack.mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce({ownerId:owner,operationId:online,recordId:id1,revision:0});
 let result=await synchronizeHybridBatch({ownerId:owner,verifyOwner,verifyCloudWrite,applyOperation:ack});
 expect(result.pending).toBe(1);
 result=await synchronizeHybridBatch({ownerId:owner,verifyOwner,verifyCloudWrite,applyOperation:ack});
 expect(result.confirmed).toBe(1);
 expect(ack.mock.calls[0][0].id).toBe(ack.mock.calls[1][0].id);
});

test('cross-owner and stale acknowledgements never mark a record confirmed',async()=>{
 await write(id1,online,'online');
 const bad=async op=>({ownerId:other,operationId:op.id,recordId:op.recordId,revision:0});
 const result=await synchronizeHybridBatch({ownerId:owner,verifyOwner,verifyCloudWrite,applyOperation:bad});
 expect(result.pending).toBe(1);
 expect((await listOwnerSyncOperations(owner))[0].status).toBe('pending');
});

test('sync stops on failed earlier write instead of applying later financial mutations', async () => {
 const createId = 'f1111111-1111-4111-8111-111111111111';
 const deleteId = 'a1111111-1111-4111-8111-111111111111';
 await commitLocalFinanceChange({ownerId:owner,group:'transactions',kind:'create',origin:'online',
  operationId:createId,record:{id:id1,account_id:account,amount:3.50,transaction_type:'expense'},revision:1});
 await commitLocalFinanceChange({ownerId:owner,group:'transactions',kind:'delete',origin:'online',
  operationId:deleteId,record:{id:id1},revision:2});
 ack.mockRejectedValueOnce(new Error('server offline'));
 const first=await synchronizeHybridBatch({ownerId:owner,verifyOwner,verifyCloudWrite,applyOperation:ack});
 expect(first.pending).toBe(1);
 expect(first.confirmed).toBe(0);
 expect(ack).toHaveBeenCalledTimes(1);
 expect(ack.mock.calls[0][0].id).toBe(createId);
 const remaining=await listOwnerSyncOperations(owner);
 expect(remaining.find(x=>x.id===deleteId).status).toBe('pending');
 const second=await synchronizeHybridBatch({ownerId:owner,verifyOwner,verifyCloudWrite,applyOperation:ack});
 expect(second.confirmed).toBe(2);
 expect(ack.mock.calls.slice(1).map(x=>x[0].id)).toEqual([createId,deleteId]);
});

test('incomplete worker lease can recover with stable operation ID after expiry',async()=>{
 await write(id1,online,'online');
 const {claimHybridSyncBatch}=require('./hybridLocalStore');
 const first=(await claimHybridSyncBatch({ownerId:owner,now:10_000,leaseMs:1000}))[0];
 expect(first.id).toBe(online);
 // The stranded in-flight operation has no live worker; next sync claims expired lease.
 const second=await synchronizeHybridBatch({ownerId:owner,verifyOwner,verifyCloudWrite,applyOperation:ack});
 expect(second.confirmed).toBe(1);
 expect(ack.mock.calls[0][0].id).toBe(online);
 expect(ack.mock.calls[0][0].claimGeneration).toBe(2);
});
