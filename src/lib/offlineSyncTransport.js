import { planOfflineReconciliation, sameFinanceRecord } from './offlineReconciliation';

/**
 * Apply additive/account-field changes after three-way comparison with the
 * last confirmed cloud snapshot. Transport methods are server-owner scoped.
 * No auto hard-deletes, no rewriting transaction amounts/history, no blind
 * client clock 'last write wins', no snapshot cleared on partial failure.
 *
 * NOTE: Only accounts and transactions are enabled until all other financial
 * groups have audited server-side reversible accounting procedures.
 */
export const SUPPORTED_SYNC_GROUPS=['financial_accounts','transactions'];
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function assertStableId(row){
 if(!UUID.test(String(row?.id||'')))throw new Error('Sync requires a stable UUID for every new account and transaction. Review records before retrying.');
}
function plain(value) { return JSON.parse(JSON.stringify(value)); }
function updatedAccountFieldsChanged(base,row){
 return !sameFinanceRecord(
 {name:base.name,account_type:base.account_type,institution_name:base.institution_name,currency:base.currency,opening_balance:base.opening_balance,is_archived:base.is_archived,display_order:base.display_order},
 {name:row.name,account_type:row.account_type,institution_name:row.institution_name,currency:row.currency,opening_balance:row.opening_balance,is_archived:row.is_archived,display_order:row.display_order});
}
function supportedAction(action){
 if(!SUPPORTED_SYNC_GROUPS.includes(action.group))throw Error('Cloud syncing this financial category is not yet verified. Local changes remain on this device.');
 assertStableId(action.record);
 if(action.group==='transactions'){
   if(action.change!=='create')throw Error('Edited offline transactions require verified reversal/accounting reconciliation before uploading. Local data was preserved.');
   if(!UUID.test(String(action.record.account_id||'')) || (action.record.transaction_type==='transfer'&&!UUID.test(String(action.record.transfer_to_account_id||''))))
      throw Error('A local transaction does not reference a synced wallet account. Connect the correct wallet before reconciling.');
 }
 if(action.group==='financial_accounts' && action.change==='update'){
   if(!action.expected?.updated_at)throw Error('Cloud account revision is missing. Refusing to overwrite a concurrent edit.');
   if(!updatedAccountFieldsChanged(action.expected,action.record))return;
 }
}
// Confirm relevant stable fields, not provider-populated timestamps.
const ACCOUNT_FIELDS=['id','name','account_type','institution_name','currency','opening_balance','is_archived'];
const TRANSACTION_FIELDS=['id','account_id','transfer_to_account_id','transaction_type','amount','currency','merchant','category','note','occurred_at'];
function matchesSaved(local,remote,group){
 const fields=group==='financial_accounts'?ACCOUNT_FIELDS:TRANSACTION_FIELDS;
 const safe=(row)=>Object.fromEntries(fields.map(k=>{
   let value=row?.[k];
   if(k==='is_archived')value=value===true;
   if(k==='institution_name'||k==='note'||k==='transfer_to_account_id')value=value||null;
   if(k==='currency')value=value||'PHP';
   if(k==='category')value=value||'Other';
   if(k==='opening_balance')value=value??row?.balance??0;
   return [k,value??null];
 }));
 return !!remote && sameFinanceRecord(safe(local),safe(remote));
}
function fromRemoteAfter(remote){
 return {financial_accounts:plain(remote.financial_accounts),transactions:plain(remote.transactions)};
}
export async function reconcileAndCommitOfflineWorkspace({
 ownerId, workspace, fetchRemote, insertAccount, updateAccountCAS, insertTransaction, assertOwner,
 shouldContinue = () => true,
}){
 if(!UUID.test(String(ownerId||''))||workspace?.owner!==ownerId||workspace.version!==2)
   throw Error('Verified owner-scoped workspace is required to sync.');
 if(!workspace.baseline || !workspace.working)throw Error('Missing confirmed cloud baseline.');
 if(typeof fetchRemote!=='function'||typeof assertOwner!=='function')
   throw Error('Cloud sync requires verified authorization and complete cloud reads.');
 if(!shouldContinue())throw Error('Cloud sync was cancelled. Local changes remain pending.');
 await assertOwner(ownerId);
 const remote=await fetchRemote(ownerId);
 const plan=planOfflineReconciliation({
  ownerId,base:workspace.baseline,local:workspace.working,cloud:remote,
  groups:SUPPORTED_SYNC_GROUPS,localDeletions:workspace.pendingDeletions,
 });
 if(!plan.ok)return {ok:false,reason:'review_required',plan,workspace};
 // Verify whole batch before any remote write.
 for(const action of plan.upload)supportedAction(action);
 const ordered=[...plan.upload.filter(x=>x.group==='financial_accounts'),
                ...plan.upload.filter(x=>x.group==='transactions')];
 for(const action of ordered){
  if(!shouldContinue())throw Error('Cloud sync was cancelled. Local changes remain pending.');
  // Re-check auth before EVERY server mutation; RLS is the final authority.
  await assertOwner(ownerId);
  if(action.group==='financial_accounts'){
   if(action.change==='create')await insertAccount(action.record,ownerId);
   else await updateAccountCAS(action.record,action.expected.updated_at,ownerId);
  }else if(action.change==='create')await insertTransaction(action.record,ownerId);
 }
 // A timed-out response or subsequent server change may leave some successful
 // writes. We never delete the device journal until refetch verifies them all.
 if(!shouldContinue())throw Error('Cloud sync was cancelled. Local changes remain pending.');
 await assertOwner(ownerId);
 const confirmed=await fetchRemote(ownerId);
 for(const action of plan.upload){
  const record=confirmed[action.group]?.find(row=>row.id===action.id);
  if(!matchesSaved(action.record,record,action.group))throw Error('Cloud confirmation did not match device records; local changes remain pending.');
 }
 const remaining=planOfflineReconciliation({ownerId,base:workspace.baseline,
   local:workspace.working,cloud:confirmed,groups:SUPPORTED_SYNC_GROUPS,
   localDeletions:workspace.pendingDeletions});
 // Our own successful, separately verified uploads can appear as diverged
 // because cloud adds defaults/timestamps not present in the offline row.
 // Allow exactly those verified writes, but never ignore any unrelated row.
 const uploadedKeys=new Set(plan.upload.map(action=>action.group+':'+action.id));
 const unrelatedConflicts=remaining.conflicts.filter(item=>{
   if(!uploadedKeys.has(item.group+':'+item.id))return true;
   const original=plan.upload.find(action=>action.group===item.group&&action.id===item.id);
   return !matchesSaved(original.record,confirmed[item.group]?.find(x=>x.id===item.id),item.group);
 });
 if(unrelatedConflicts.length||remaining.issues.length||remaining.deletions.length)
   return {ok:false,reason:'late_concurrent_conflict',plan:remaining,workspace};
 return {ok:true,uploaded:plan.upload.length,downloaded:plan.download.length,
  workspace:{version:2,owner:ownerId,baseline:fromRemoteAfter(confirmed),
    working:fromRemoteAfter(confirmed),dirty:false,lastConfirmedAt:new Date().toISOString(),
    pendingDeletions:{}}};
}
