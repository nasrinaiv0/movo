import { supabase } from './supabaseClient';
import { loadOfflineWorkspace, saveOfflineWorkspace } from './offlineWorkspaceStore';
import { commitLocalFinanceChange, acknowledgeDirectHybridWrite, rejectDirectHybridWrite, listOwnerSyncOperations } from './hybridLocalStore';
import { applyHybridCloudOperation, syncRequestId } from './hybridSyncCloudAdapter';

/** Local durable intent -> atomic cloud RPC -> durable ACK -> caller render. */
export async function writeHybridFinance({ group, kind, recordId, payload, ownerId }) {
  if(!supabase)throw new Error('MOVO cloud storage is not configured.');
  const { data, error } = await supabase.auth.getSession();
  const owner = data?.session?.user?.id;
  if (error || !owner || !data.session.access_token || (ownerId && owner !== ownerId))
    throw new Error('Cloud sign-in changed or expired. Local records remain pending.');
  const workspace = loadOfflineWorkspace(owner);
  const previous = workspace?.working?.[group]?.find(row => row.id === recordId);
  if (kind !== 'create' && !previous?.updated_at)
    throw new Error('Load the latest account records before editing.');
  const op = {ownerId:owner,group,kind,recordId,payload:kind==='delete'?null:payload,
    expectedUpdatedAt:kind==='create'?null:previous.updated_at,revision:0};
  op.id = await syncRequestId(op);
  const outstanding=await listOwnerSyncOperations(owner);
  if(outstanding.some(other=>other.id!==op.id&&other.group===group&&other.recordId===recordId&&
    ['pending','in_flight','conflict'].includes(other.status)))
    throw new Error('Sync the pending change to this record before editing it again.');
  // Deterministic time ensures an exact response-loss retry is the same local intent.
  const createdAt = previous?.updated_at || payload?.occurred_at || '1970-01-01T00:00:00.000Z';
  await commitLocalFinanceChange({ownerId:owner,group,kind,record:{...previous,...payload,id:recordId},
    origin:'online',operationId:op.id,createdAt,expectedUpdatedAt:op.expectedUpdatedAt});
  let acknowledgement;
  try { acknowledgement = await applyHybridCloudOperation(op); }
  catch(error){
    // SQL error codes prove rejection/rollback. A lost network response does not.
    if(typeof error?.code==='string'&&/^[0-9A-Z]{5}$/.test(error.code))
      await rejectDirectHybridWrite(owner,op.id,previous);
    throw error;
  }
  const latest=loadOfflineWorkspace(owner);
  if(latest&&!latest.dirty){
    const patch=groups=>({...groups,[group]:kind==='delete'?groups[group].filter(row=>row.id!==recordId):
      [...groups[group].filter(row=>row.id!==recordId),acknowledgement.record]});
    if(!saveOfflineWorkspace(owner,{...latest,baseline:patch(latest.baseline),working:patch(latest.working)}))
      throw new Error('The cloud saved the record, but the device copy could not be updated. Free storage and reload.');
  }
  await acknowledgeDirectHybridWrite(owner,op.id,acknowledgement);
  return acknowledgement.record;
}
