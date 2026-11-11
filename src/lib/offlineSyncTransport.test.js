import { reconcileAndCommitOfflineWorkspace } from './offlineSyncTransport';
const OWNER='123e4567-e89b-42d3-a456-426614174000',A='123e4567-e89b-42d3-a456-426614174012',
 T='123e4567-e89b-42d3-a456-426614174013',N='123e4567-e89b-42d3-a456-426614174014';
const account={id:A,user_id:OWNER,name:'Main',account_type:'bank',currency:'PHP',opening_balance:100,updated_at:'2026-11-08T00:00:00Z'};
const tx={id:T,user_id:OWNER,account_id:A,transaction_type:'expense',amount:8,merchant:'Food',category:'Other',currency:'PHP',occurred_at:'2026-11-08T01:00:00Z'};
const rows=(accounts=[],transactions=[])=>({financial_accounts:accounts,transactions});
const ws=(base,working)=>({version:2,owner:OWNER,baseline:base,working,dirty:true});
function deps(initial){let remote=JSON.parse(JSON.stringify(initial));const owner=jest.fn(async()=>{}),created=jest.fn(async row=>{remote.transactions.push({...row,user_id:OWNER,updated_at:'t1'})}),accountCreated=jest.fn(async row=>{remote.financial_accounts.push({...row,user_id:OWNER})}),updated=jest.fn(async row=>{remote.financial_accounts=remote.financial_accounts.map(x=>x.id===row.id?{...row,updated_at:'fresh'}:x)});
 const txUpdated=jest.fn(async(row,rev)=>{const cur=remote.transactions.find(x=>x.id===row.id);if(!cur||cur.updated_at!==rev)throw Error('Cloud transaction was updated elsewhere.');remote.transactions=remote.transactions.map(x=>x.id===row.id?{...x,...row,updated_at:'fresh'}:x)});
 const txDeleted=jest.fn(async(id,rev)=>{const cur=remote.transactions.find(x=>x.id===id);if(!cur)return false;if(cur.updated_at!==rev)throw Error('Cloud transaction was updated elsewhere.');remote.transactions=remote.transactions.filter(x=>x.id!==id);return true;});
 const receipt=jest.fn(async(local,id)=>OWNER+'/offline-'+id+'.jpg');
 return {fetchRemote:async()=>JSON.parse(JSON.stringify(remote)),insertAccount:accountCreated,updateAccountCAS:updated,insertTransaction:created,assertOwner:owner,
       updateTransactionCAS:txUpdated,deleteTransactionCAS:txDeleted,uploadReceipt:receipt,
       getCalls:()=>({owner,created,accountCreated,updated,txUpdated,txDeleted,receipt}),getRemote:()=>remote,setRemote:next=>{remote=next;}};}
test('new offline transaction uploads idempotent stable UUID, existing server transaction survives',async()=>{
 const newTx={...tx,id:N,amount:14};
 const env=deps(rows([account],[tx]));
 const result=await reconcileAndCommitOfflineWorkspace({ownerId:OWNER,workspace:ws(rows([account],[tx]),rows([account],[tx,newTx])),...env});
 expect(result.ok).toBe(true);expect(result.uploaded).toBe(1);
 expect(env.getRemote().transactions.map(x=>x.id)).toEqual([T,N]);
 expect(result.workspace.dirty).toBe(false);
});
test('cloud addition while device unchanged downloads to confirmed local snapshot',async()=>{
 const env=deps(rows([account],[tx]));
 const result=await reconcileAndCommitOfflineWorkspace({ownerId:OWNER,workspace:ws(rows([account],[]),rows([account],[])),...env});
 expect(result.ok).toBe(true);expect(result.downloaded).toBe(1);
 expect(result.workspace.working.transactions).toHaveLength(1);
});
test('concurrent conflicting transaction edits are not uploaded or overwritten',async()=>{
 const env=deps(rows([account],[{...tx,amount:12}]));
 const result=await reconcileAndCommitOfflineWorkspace({ownerId:OWNER,workspace:ws(rows([account],[tx]),rows([account],[{...tx,amount:10}])),...env});
 expect(result.ok).toBe(false);expect(result.plan.conflicts).toHaveLength(1);
 expect(env.getCalls().created).not.toHaveBeenCalled();
});
test('a transaction edited offline uploads with the cloud revision it was checked against',async()=>{
 const cloudTx={...tx,updated_at:'r1'};
 const env=deps(rows([account],[cloudTx]));
 const edited={...tx,merchant:'Changed',amount:9.5};
 const result=await reconcileAndCommitOfflineWorkspace({ownerId:OWNER,workspace:ws(rows([account],[cloudTx]),rows([account],[edited])),...env});
 expect(result.ok).toBe(true);expect(result.uploaded).toBe(1);
 expect(env.getCalls().txUpdated).toHaveBeenCalledWith(edited,'r1',OWNER);
 expect(env.getRemote().transactions[0]).toEqual(expect.objectContaining({merchant:'Changed',amount:9.5}));
 expect(result.workspace.dirty).toBe(false);
});
test('an offline edit never overwrites a cloud edit made in the meantime',async()=>{
 const env=deps(rows([account],[{...tx,merchant:'Cloud edit',updated_at:'r2'}]));
 const result=await reconcileAndCommitOfflineWorkspace({ownerId:OWNER,workspace:ws(rows([account],[{...tx,updated_at:'r1'}]),rows([account],[{...tx,merchant:'Device edit'}])),...env});
 expect(result.ok).toBe(false);expect(result.plan.conflicts[0].reason).toBe('concurrent_divergent_edits');
 expect(env.getCalls().txUpdated).not.toHaveBeenCalled();
});
test('a transaction deleted offline is removed with the server procedure only while unchanged',async()=>{
 const cloudTx={...tx,updated_at:'r1'};
 const env=deps(rows([account],[cloudTx]));
 const work={...ws(rows([account],[cloudTx]),rows([account],[])),pendingDeletions:{transactions:[T]},deletedRows:{transactions:{[T]:cloudTx}}};
 const result=await reconcileAndCommitOfflineWorkspace({ownerId:OWNER,workspace:work,...env});
 expect(result.ok).toBe(true);
 expect(env.getCalls().txDeleted).toHaveBeenCalledWith(T,'r1',OWNER);
 expect(env.getRemote().transactions).toHaveLength(0);
 expect(result.workspace.pendingDeletions).toEqual({});
});
test('a deletion is not applied to a row that changed in the cloud',async()=>{
 const env=deps(rows([account],[{...tx,amount:50,updated_at:'r2'}]));
 const work={...ws(rows([account],[{...tx,updated_at:'r1'}]),rows([account],[])),pendingDeletions:{transactions:[T]}};
 const result=await reconcileAndCommitOfflineWorkspace({ownerId:OWNER,workspace:work,...env});
 expect(result.ok).toBe(false);expect(result.plan.conflicts[0].reason).toBe('deleted_locally_changed_remotely');
 expect(env.getCalls().txDeleted).not.toHaveBeenCalled();
 expect(env.getRemote().transactions).toHaveLength(1);
});
test('a retry after a lost acknowledgment converges: the deletion and edit already applied are not repeated',async()=>{
 const cloudTx={...tx,updated_at:'r1'},other={...tx,id:N,merchant:'Other',updated_at:'r1'};
 const edited={...other,merchant:'Edited'};
 const env=deps(rows([account],[{...edited,updated_at:'r9'}])); // both writes already reached the cloud
 const work={...ws(rows([account],[cloudTx,other]),rows([account],[edited])),pendingDeletions:{transactions:[T]}};
 const result=await reconcileAndCommitOfflineWorkspace({ownerId:OWNER,workspace:work,...env});
 expect(result.ok).toBe(true);expect(result.uploaded).toBe(0);
 expect(env.getCalls().txDeleted).not.toHaveBeenCalled();expect(env.getCalls().txUpdated).not.toHaveBeenCalled();
});
test('a receipt kept on the device is uploaded first and the verified row points at the cloud copy',async()=>{
 const env=deps(rows([account],[]));
 const newTx={...tx,id:N,receipt_path:'localreceipt:abc'};
 const result=await reconcileAndCommitOfflineWorkspace({ownerId:OWNER,workspace:ws(rows([account],[]),rows([account],[newTx])),...env});
 expect(result.ok).toBe(true);
 expect(env.getCalls().receipt).toHaveBeenCalledWith('localreceipt:abc',N,OWNER);
 expect(env.getCalls().created.mock.calls[0][0].receipt_path).toBe(OWNER+'/offline-'+N+'.jpg');
 expect(result.workspace.working.transactions[0].receipt_path).toBe(OWNER+'/offline-'+N+'.jpg');
});
test('edits, deletions and receipts fail closed when the transport for them is missing',async()=>{
 const cloudTx={...tx,updated_at:'r1'};
 const env=deps(rows([account],[cloudTx]));delete env.updateTransactionCAS;
 await expect(reconcileAndCommitOfflineWorkspace({ownerId:OWNER,workspace:ws(rows([account],[cloudTx]),rows([account],[{...tx,merchant:'Changed'}])),...env})).rejects.toThrow('edited transactions is unavailable');
 const env2=deps(rows([account],[]));delete env2.uploadReceipt;
 await expect(reconcileAndCommitOfflineWorkspace({ownerId:OWNER,workspace:ws(rows([account],[]),rows([account],[{...tx,id:N,receipt_path:'localreceipt:x'}])),...env2})).rejects.toThrow('receipts is unavailable');
 expect(env2.getCalls().created).not.toHaveBeenCalled();
});
test('a missing cloud revision refuses to update or delete',async()=>{
 const env=deps(rows([account],[tx]));
 await expect(reconcileAndCommitOfflineWorkspace({ownerId:OWNER,workspace:ws(rows([account],[tx]),rows([account],[{...tx,merchant:'Changed'}])),...env})).rejects.toThrow('revision is missing');
 expect(env.getCalls().txUpdated).not.toHaveBeenCalled();
});
test('missing local account FK refuses automatic remote insertion',async()=>{
 const env=deps(rows([account],[]));
 await expect(reconcileAndCommitOfflineWorkspace({ownerId:OWNER,workspace:ws(rows([account],[]),rows([account],[{...tx,id:N,account_id:'local'}])),...env})).rejects.toThrow('does not reference a synced wallet account');
 expect(env.getCalls().created).not.toHaveBeenCalled();
});
test('account and transaction creations are ordered by referential dependency',async()=>{
 const secondAccount={...account,id:'123e4567-e89b-42d3-a456-426614174015',name:'Savings'};
 const newTx={...tx,id:N,account_id:secondAccount.id};
 const env=deps(rows([account],[]));
 const result=await reconcileAndCommitOfflineWorkspace({ownerId:OWNER,workspace:ws(rows([account],[]),rows([account,secondAccount],[newTx])),...env});
 expect(result.ok).toBe(true);
 expect(env.getCalls().accountCreated).toHaveBeenCalledTimes(1);
 expect(env.getCalls().created).toHaveBeenCalledTimes(1);
});
test('owner mismatch refuses even a no-op sync',async()=>{
 const env=deps(rows([account],[]));
 await expect(reconcileAndCommitOfflineWorkspace({ownerId:'other',workspace:ws(rows(),rows()),...env})).rejects.toThrow('Verified owner-scoped');
});
test('failed cloud insertion never clears device journal',async()=>{
 const env=deps(rows([account],[]));env.insertTransaction=jest.fn(async()=>{throw Error('network failed')});
 const work=ws(rows([account],[]),rows([account],[{...tx,id:N}]));
 await expect(reconcileAndCommitOfflineWorkspace({ownerId:OWNER,workspace:work,...env})).rejects.toThrow('network failed');
 expect(work.dirty).toBe(true);
});

test('cloud-generated defaults on a successfully inserted account do not leave a permanent false conflict',async()=>{
 const newAcc={...account,id:N,name:'Offline savings'};
 const env=deps(rows([account],[]));
 env.insertAccount=jest.fn(async row=>{
   env.getRemote().financial_accounts.push({...row,user_id:OWNER,is_archived:false,display_order:0,created_at:'2026-11-08T02:00:00Z'});
 });
 const result=await reconcileAndCommitOfflineWorkspace({
   ownerId:OWNER,workspace:ws(rows([account],[]),rows([account,newAcc],[])),...env,
 });
 expect(result.ok).toBe(true);
 expect(result.workspace.working.financial_accounts).toHaveLength(2);
});

test('cloud switch-off during reconciliation stops remaining server writes',async()=>{
 const env=deps(rows([account],[]));
 const newTx={...tx,id:N};
 let active=true;
 env.insertTransaction=jest.fn(async row=>{active=false;}); // one already in flight cannot be revoked
 const later={...tx,id:'123e4567-e89b-42d3-a456-426614174099'};
 const workspace=ws(rows([account],[]),rows([account],[newTx,later]));
 await expect(reconcileAndCommitOfflineWorkspace({
   ownerId:OWNER,workspace,shouldContinue:()=>active,...env,
 })).rejects.toThrow('cancelled');
 expect(env.insertTransaction).toHaveBeenCalledTimes(1);
 expect(workspace.dirty).toBe(true);
});

test('lost response after server commit retries by matching stable fields without a second write',async()=>{
 const pending={...tx,id:N,source:'Manual',amount:'12.34'};
 const cloudAccepted={...pending,source:'manual',amount:12.34,
   transfer_to_account_id:null,created_at:'2026-11-08T00:00:00Z'};
 const env=deps(rows([account],[tx,cloudAccepted]));
 const result=await reconcileAndCommitOfflineWorkspace({
   ownerId:OWNER,workspace:ws(rows([account],[tx]),rows([account],[tx,pending])),...env,
 });
 expect(result.ok).toBe(true);
 expect(result.uploaded).toBe(0);
 expect(env.getCalls().created).not.toHaveBeenCalled();
 expect(result.workspace.working.transactions).toHaveLength(2);
});
