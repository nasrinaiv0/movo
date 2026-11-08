import { reconcileAndCommitOfflineWorkspace } from './offlineSyncTransport';
const OWNER='123e4567-e89b-42d3-a456-426614174000',A='123e4567-e89b-42d3-a456-426614174012',
 T='123e4567-e89b-42d3-a456-426614174013',N='123e4567-e89b-42d3-a456-426614174014';
const account={id:A,user_id:OWNER,name:'Main',account_type:'bank',currency:'PHP',opening_balance:100,updated_at:'2026-11-08T00:00:00Z'};
const tx={id:T,user_id:OWNER,account_id:A,transaction_type:'expense',amount:8,merchant:'Food',category:'Other',currency:'PHP',occurred_at:'2026-11-08T01:00:00Z'};
const rows=(accounts=[],transactions=[])=>({financial_accounts:accounts,transactions});
const ws=(base,working)=>({version:2,owner:OWNER,baseline:base,working,dirty:true});
function deps(initial){let remote=JSON.parse(JSON.stringify(initial));const owner=jest.fn(async()=>{}),created=jest.fn(async row=>{remote.transactions.push({...row,user_id:OWNER})}),accountCreated=jest.fn(async row=>{remote.financial_accounts.push({...row,user_id:OWNER})}),updated=jest.fn(async row=>{remote.financial_accounts=remote.financial_accounts.map(x=>x.id===row.id?{...row,updated_at:'fresh'}:x)});
 return {fetchRemote:async()=>JSON.parse(JSON.stringify(remote)),insertAccount:accountCreated,updateAccountCAS:updated,insertTransaction:created,assertOwner:owner,
       getCalls:()=>({owner,created,accountCreated,updated}),getRemote:()=>remote};}
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
test('edited transactions deliberately fail closed until accounting reversal support',async()=>{
 const env=deps(rows([account],[tx]));
 await expect(reconcileAndCommitOfflineWorkspace({ownerId:OWNER,workspace:ws(rows([account],[tx]),rows([account],[{...tx,merchant:'Changed'}])),...env})).rejects.toThrow('reversal/accounting reconciliation');
 expect(env.getCalls().created).not.toHaveBeenCalled();
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
