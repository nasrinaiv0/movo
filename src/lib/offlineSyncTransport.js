import { planOfflineReconciliation, sameFinanceRecord, sameSyncedFinanceFields } from './offlineReconciliation';

/**
 * Apply device changes after a three-way comparison with the last confirmed cloud snapshot: new accounts and
 * transactions, account edits, transaction edits and transaction deletions. Every update and delete is
 * compare-and-swap on the cloud row's revision, so a row changed elsewhere is never overwritten or removed.
 * Transport methods are server-owner scoped. No blind client-clock "last write wins", no snapshot cleared on
 * partial failure, and every write is re-read and verified before the device journal is cleared.
 *
 * NOTE: Only accounts and transactions are enabled until all other financial groups have audited server-side
 * reversible accounting procedures.
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
const revision=action=>action.cloud?.updated_at||action.expected?.updated_at||'';
function supportedAction(action){
 if(!SUPPORTED_SYNC_GROUPS.includes(action.group))throw Error('Cloud syncing this financial category is not yet verified. Local changes remain on this device.');
 if(action.change==='delete'){
   if(action.group!=='transactions')throw Error('Removing this kind of record from the cloud is not yet verified. Local changes remain on this device.');
   if(!UUID.test(String(action.id||'')))throw Error('Sync requires a stable UUID for every deleted transaction. Review records before retrying.');
   if(!revision(action))throw Error('Cloud transaction revision is missing. Refusing to remove a row that may have changed.');
   return;
 }
 assertStableId(action.record);
 if(action.group==='transactions'){
   if(!['create','update'].includes(action.change))throw Error('Unsupported offline transaction change. Local data was preserved.');
   if(!UUID.test(String(action.record.account_id||'')) || (action.record.transaction_type==='transfer'&&!UUID.test(String(action.record.transfer_to_account_id||''))))
      throw Error('A local transaction does not reference a synced wallet account. Connect the correct wallet before reconciling.');
   if(action.change==='update'&&!revision(action))throw Error('Cloud transaction revision is missing. Refusing to overwrite a concurrent edit.');
 }
 if(action.group==='financial_accounts' && action.change==='update'){
   if(!revision(action))throw Error('Cloud account revision is missing. Refusing to overwrite a concurrent edit.');
   if(!updatedAccountFieldsChanged(action.expected,action.record))action.skip=true;
 }
}
// Verify the exact financial meaning after a remote mutation. This same
// comparator is used to recognize a previously committed retry with a lost
// acknowledgment (without using a clock or accepting changed money values).
const matchesSaved = (local, remote, group) => sameSyncedFinanceFields(local, remote, group);
function fromRemoteAfter(remote){
 return {financial_accounts:plain(remote.financial_accounts),transactions:plain(remote.transactions)};
}
export async function reconcileAndCommitOfflineWorkspace({
 ownerId, workspace, fetchRemote, insertAccount, updateAccountCAS, insertTransaction, assertOwner,
 updateTransactionCAS, deleteTransactionCAS, uploadReceipt,
 shouldContinue = () => true,
}){
 if(!UUID.test(String(ownerId||''))||workspace?.owner!==ownerId||workspace.version!==2)
   throw Error('Verified owner-scoped workspace is required to sync.');
 if(!workspace.baseline || !workspace.working)throw Error('Missing confirmed cloud baseline.');
 if(typeof fetchRemote!=='function'||typeof assertOwner!=='function')
   throw Error('Cloud sync requires verified authorization and complete cloud reads.');
 const stop=()=>{if(!shouldContinue())throw Error('Cloud sync was cancelled. Local changes remain pending.');};
 stop();
 await assertOwner(ownerId);
 const remote=await fetchRemote(ownerId);
 const planFor=cloud=>planOfflineReconciliation({
  ownerId,base:workspace.baseline,local:workspace.working,cloud,groups:SUPPORTED_SYNC_GROUPS,
  localDeletions:workspace.pendingDeletions,deletedRows:workspace.deletedRows,
 });
 const plan=planFor(remote);
 if(!plan.ok)return {ok:false,reason:'review_required',plan,workspace};
 // Verify the whole batch before any remote write.
 for(const action of plan.upload)supportedAction(action);
 const needs=(name,fn)=>{if(typeof fn!=='function')throw Error('Cloud sync for '+name+' is unavailable. Local changes remain on this device.');};
 for(const action of plan.upload){
  if(action.group==='transactions'&&action.change==='update')needs('edited transactions',updateTransactionCAS);
  if(action.change==='delete')needs('deleted transactions',deleteTransactionCAS);
  if(action.record?.receipt_path?.startsWith?.('localreceipt:'))needs('receipts',uploadReceipt);
 }
 // Accounts first (transactions reference them), then new and edited transactions, then deletions.
 const rank=action=>action.group==='financial_accounts'?0:action.change==='delete'?2:1;
 const ordered=[...plan.upload].sort((x,y)=>rank(x)-rank(y));
 for(const action of ordered){
  if(action.skip)continue;
  stop();
  // Re-check auth before EVERY server mutation; RLS is the final authority.
  await assertOwner(ownerId);
  if(action.group==='financial_accounts'){
   if(action.change==='create')await insertAccount(action.record,ownerId);
   else await updateAccountCAS(action.record,revision(action),ownerId);
   continue;
  }
  if(action.change==='delete'){await deleteTransactionCAS(action.id,revision(action),ownerId);continue;}
  if(action.record.receipt_path?.startsWith?.('localreceipt:')){
   // The verified record now points at the private cloud copy of the receipt.
   action.record={...action.record,receipt_path:await uploadReceipt(action.record.receipt_path,action.record.id,ownerId)};
   stop();await assertOwner(ownerId);
  }
  if(action.change==='create')await insertTransaction(action.record,ownerId);
  else await updateTransactionCAS(action.record,revision(action),ownerId);
 }
 // A timed-out response or subsequent server change may leave some successful
 // writes. We never delete the device journal until refetch verifies them all.
 stop();
 await assertOwner(ownerId);
 const confirmed=await fetchRemote(ownerId);
 for(const action of plan.upload){
  const record=confirmed[action.group]?.find(row=>row.id===action.id);
  if(action.change==='delete'){
   if(record)throw Error('Cloud confirmation still lists a deleted record; local changes remain pending.');
  }else if(!matchesSaved(action.record,record,action.group))throw Error('Cloud confirmation did not match device records; local changes remain pending.');
 }
 const remaining=planFor(confirmed);
 // Our own successful, separately verified uploads can appear as diverged
 // because cloud adds defaults/timestamps not present in the offline row.
 // Allow exactly those verified writes, but never ignore any unrelated row.
 const uploaded=new Map(plan.upload.map(action=>[action.group+':'+action.id,action]));
 const unrelatedConflicts=remaining.conflicts.filter(item=>{
   const original=uploaded.get(item.group+':'+item.id);
   if(!original||original.change==='delete')return true;
   return !matchesSaved(original.record,confirmed[item.group]?.find(x=>x.id===item.id),item.group);
 });
 const unrelatedUploads=remaining.upload.filter(item=>{
   const original=uploaded.get(item.group+':'+item.id);
   // An edited row whose verified cloud copy now matches is done; anything else is still pending.
   return !original||original.change==='delete'||!matchesSaved(original.record,confirmed[item.group]?.find(x=>x.id===item.id),item.group);
 });
 if(unrelatedConflicts.length||remaining.issues.length||unrelatedUploads.length)
   return {ok:false,reason:'late_concurrent_conflict',plan:remaining,workspace};
 return {ok:true,uploaded:plan.upload.filter(action=>!action.skip).length,downloaded:plan.download.length,
  workspace:{version:2,owner:ownerId,baseline:fromRemoteAfter(confirmed),
    working:fromRemoteAfter(confirmed),dirty:false,lastConfirmedAt:new Date().toISOString(),
    pendingDeletions:{},deletedRows:{}}};
}
