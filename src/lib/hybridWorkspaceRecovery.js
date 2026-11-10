import { loadOfflineWorkspace, saveOfflineWorkspace } from './offlineWorkspaceStore';
import { migrateHybridWorkspace, listOwnerSyncOperations, commitLocalFinanceBatch } from './hybridLocalStore';

/** Replay unacknowledged durable intents over the legacy materialized cache on startup. */
export async function recoverHybridWorkspace(ownerId) {
  const prior = loadOfflineWorkspace(ownerId);
  if (!prior) {
    const pending = (await listOwnerSyncOperations(ownerId)).some(op => ['pending','in_flight','conflict'].includes(op.status));
    // An old migration backup is not a current baseline: replaying it can
    // resurrect confirmed deletions. Preserve the journal and fail closed.
    if (pending) throw new Error('Could not restore the durable device journal. Free device storage and retry.');
    return null;
  }
  await migrateHybridWorkspace(ownerId, prior);
  const ops = (await listOwnerSyncOperations(ownerId)).filter(op=>['pending','in_flight','conflict'].includes(op.status))
    .sort((a,b)=>a.localSequence-b.localSequence);
  if (!ops.length) return prior;
  const next=JSON.parse(JSON.stringify(prior));
  const rowsByGroup=new Map();
  const deletedByGroup=new Map();
  for(const group of ['financial_accounts','transactions']){
    if(!Array.isArray(next.working[group]))throw new Error('Incomplete owner workspace');
    rowsByGroup.set(group,new Map(next.working[group].map(row=>[row.id,row])));
    deletedByGroup.set(group,new Set(next.pendingDeletions?.[group]||[]));
  }
  for (const op of ops) {
    const rows=rowsByGroup.get(op.group),deleted=deletedByGroup.get(op.group);
    if(!rows)throw new Error('Unsupported local journal group');
    if(op.kind==='delete'){
      const old=rows.get(op.recordId);rows.delete(op.recordId);deleted.add(op.recordId);
      if(old)next.deletedRows={...next.deletedRows,[op.group]:{...next.deletedRows?.[op.group],[op.recordId]:old}};
    }else{
      rows.set(op.recordId,op.payload);deleted.delete(op.recordId);
      if(next.deletedRows?.[op.group])delete next.deletedRows[op.group][op.recordId];
    }
    next.dirty=true;
    if(op.origin==='offline'&&!op.approvedAt)next.requiresManualSync=true;
  }
  for(const [group,rows] of rowsByGroup){
    next.working[group]=Array.from(rows.values());
    next.pendingDeletions={...next.pendingDeletions,[group]:Array.from(deletedByGroup.get(group))};
  }
  if(!saveOfflineWorkspace(ownerId,next))throw new Error('Could not restore the durable device journal. Free device storage and retry.');
  return next;
}

/** Persist signed-in local saves BEFORE changing the UI or reporting success. */
export async function persistHybridLocalRows(ownerId,group,rows,kind='create') {
  if (!ownerId) return;
  const prior=loadOfflineWorkspace(ownerId);
  if(!prior)throw new Error('Signed-in account workspace is unavailable.');
  await migrateHybridWorkspace(ownerId,prior);
  const existingById=new Map((prior.working[group]||[]).map(row=>[row.id,row]));
  await commitLocalFinanceBatch(ownerId,rows.map(record=>{
    const existing=existingById.get(record.id);
    return {group,kind:kind==='delete'?'delete':existing?'update':'create',record,expectedUpdatedAt:existing?.updated_at||null};
  }));
  await recoverHybridWorkspace(ownerId);
}

export async function persistHybridLocalImport(ownerId, accounts, transactions, origin='offline') {
  if(!ownerId)return;
  const prior=loadOfflineWorkspace(ownerId);
  if(!prior)throw new Error('Signed-in account workspace is unavailable.');
  await migrateHybridWorkspace(ownerId,prior);
  const changes=[...accounts.map(record=>({group:'financial_accounts',kind:'create',record})),
    ...transactions.map(record=>({group:'transactions',kind:'create',record}))];
  if(changes.length)await commitLocalFinanceBatch(ownerId,changes,origin);
  await recoverHybridWorkspace(ownerId);
}
