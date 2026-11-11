import 'fake-indexeddb/auto';
import { webcrypto } from 'crypto';
import { saveOfflineWorkspace,loadOfflineWorkspace } from './offlineWorkspaceStore';
import { migrateHybridWorkspace,readHybridMigrationBackup,clearHybridOwner,commitLocalFinanceChange,
 listOwnerSyncOperations,acknowledgeReconciledWorkspace } from './hybridLocalStore';
import { persistHybridLocalRows,recoverHybridWorkspace } from './hybridWorkspaceRecovery';
if(typeof global.structuredClone!=='function')global.structuredClone=value=>JSON.parse(JSON.stringify(value));
Object.defineProperty(globalThis,'crypto',{value:webcrypto,configurable:true});
const owner='123e4567-e89b-42d3-a456-426614174000',account='123e4567-e89b-42d3-a456-426614174001',id='123e4567-e89b-42d3-a456-426614174002';
const bank={id:account,name:'Bank',account_type:'bank',currency:'PHP',opening_balance:100};
const row={id,account_id:account,transaction_type:'expense',amount:10,currency:'PHP',merchant:'Coffee',occurred_at:'2026-11-10T00:00:00Z'};
const groups={financial_accounts:[bank],transactions:[]};
const initial={version:2,owner,baseline:groups,working:groups,dirty:false};
beforeEach(async()=>{localStorage.clear();await clearHybridOwner(owner);saveOfflineWorkspace(owner,initial);});
test('migration is atomic, idempotent, owner-scoped and retains exact rollback backup',async()=>{
 expect(await migrateHybridWorkspace(owner,initial)).toBe(true);
 expect(await migrateHybridWorkspace(owner,initial)).toBe(false);
 expect(await readHybridMigrationBackup(owner)).toEqual(initial);
 await expect(migrateHybridWorkspace(account,initial)).rejects.toThrow('Verified');
 expect(loadOfflineWorkspace(owner).working).toEqual(groups);
});
test('restart recovers a durable intent after interruption before legacy projection',async()=>{
 await migrateHybridWorkspace(owner,initial);
 await commitLocalFinanceChange({ownerId:owner,group:'transactions',kind:'create',record:row,origin:'offline',operationId:crypto.randomUUID()});
 expect(loadOfflineWorkspace(owner).working.transactions).toHaveLength(0);
 await recoverHybridWorkspace(owner);
 expect(loadOfflineWorkspace(owner).working.transactions).toEqual([{...row,user_id:owner}]);
 expect(loadOfflineWorkspace(owner).requiresManualSync).toBe(true);
 await recoverHybridWorkspace(owner);
 expect(loadOfflineWorkspace(owner).working.transactions).toHaveLength(1);
});
test('delete/restore sequence recovers without stale tombstones or duplicates',async()=>{
 await persistHybridLocalRows(owner,'transactions',[row]);
 await persistHybridLocalRows(owner,'transactions',[row],'delete');
 expect(loadOfflineWorkspace(owner).working.transactions).toHaveLength(0);
 await persistHybridLocalRows(owner,'transactions',[row]);
 expect(loadOfflineWorkspace(owner).working.transactions).toHaveLength(1);
 expect(loadOfflineWorkspace(owner).pendingDeletions.transactions).toEqual([]);
});
test('only a captured, matching net result can retire replay intents',async()=>{
 await persistHybridLocalRows(owner,'transactions',[row]);
 const ids=(await listOwnerSyncOperations(owner)).map(op=>op.id);
 await acknowledgeReconciledWorkspace(owner,{...groups,transactions:[{...row,amount:99}]},ids);
 expect((await listOwnerSyncOperations(owner))[0].status).toBe('pending');
 await acknowledgeReconciledWorkspace(owner,{...groups,transactions:[row]},ids);
 expect((await listOwnerSyncOperations(owner))[0].status).toBe('confirmed');
});
test('concurrent newer changes cannot be retired by an older cloud response',async()=>{
 await persistHybridLocalRows(owner,'transactions',[row]);
 const ids=(await listOwnerSyncOperations(owner)).map(op=>op.id);
 await persistHybridLocalRows(owner,'transactions',[{...row,amount:11}]);
 await acknowledgeReconciledWorkspace(owner,{...groups,transactions:[row]},ids);
 expect((await listOwnerSyncOperations(owner)).every(op=>op.status==='pending')).toBe(true);
});

test('invalid row in a multi-record batch leaves no partial ledger or outbox',async()=>{
 await expect(persistHybridLocalRows(owner,'transactions',[row,{...row,id:account,amount:0.001}])).rejects.toThrow('exact positive cents');
 expect(await listOwnerSyncOperations(owner)).toEqual([]);
 expect(loadOfflineWorkspace(owner).working.transactions).toEqual([]);
});

test('missing materialized workspace cannot silently discard pending durable changes',async()=>{
 await persistHybridLocalRows(owner,'transactions',[row]);
 const backup = await readHybridMigrationBackup(owner);
 localStorage.clear();
 await expect(recoverHybridWorkspace(owner)).rejects.toThrow('Could not restore the durable device journal');
 expect((await listOwnerSyncOperations(owner))[0].status).toBe('pending');
 expect(await readHybridMigrationBackup(owner)).toEqual(backup);
});
