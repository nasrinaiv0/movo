import { loadFinanceJson, saveFinanceJson } from './financeVault';
/**
 * Atomic, account-scoped offline workspace for a verified signed-in user.
 * Each snapshot contains a last-confirmed common ancestor + working rows.
 * Deliberately never reads the legacy guest wallet from another user's cache.
 *
 * Device snapshots are authenticated-encrypted before being written to localStorage.
 * Keys are device bound; encryption does NOT defend against an active XSS.
 */
const PREFIX='movo.offline.workspace.v2.';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function key(ownerId){return UUID.test(String(ownerId||''))?PREFIX+ownerId:'';}
function storage(){try{return typeof window!=='undefined'?window.localStorage:null;}catch{return null;}}
const isValidGroups=s=>s && typeof s==='object' && !Array.isArray(s)
  && Array.isArray(s.financial_accounts) && Array.isArray(s.transactions);
function allOwned(groups, owner) {
  return Object.values(groups).every(rows=>!Array.isArray(rows)||rows.every(row=>row&&(!row.user_id || row.user_id===owner)));
}
function copy(groups){return JSON.parse(JSON.stringify(groups));}
export function loadOfflineWorkspace(ownerId){
 const k=key(ownerId);if(!k)return null;
 // Do not swallow tamper/key failures as 'empty data': callers must NOT
 // overwrite an unreadable encrypted workspace with an empty snapshot.
 const saved=loadFinanceJson(k);if(!saved)return null;
 if(saved?.version!==2||saved.owner!==ownerId||!isValidGroups(saved.baseline)
   ||!isValidGroups(saved.working)||!allOwned(saved.baseline,ownerId)||!allOwned(saved.working,ownerId))
   throw new Error('financial_workspace_integrity_failed');
 return saved;
}
export function saveOfflineWorkspace(ownerId, snapshot){
 const k=key(ownerId),local=storage();
 if(!k||!local||!isValidGroups(snapshot?.baseline)||!isValidGroups(snapshot?.working)
   ||!allOwned(snapshot.baseline,ownerId)||!allOwned(snapshot.working,ownerId))return false;
 const value={version:2,owner:ownerId,baseline:copy(snapshot.baseline),
  working:copy(snapshot.working), dirty:snapshot.dirty===true,
  requiresManualSync:snapshot.requiresManualSync===true,
  lastConfirmedAt:String(snapshot.lastConfirmedAt||''),pendingDeletions:snapshot.pendingDeletions||{},
  deletedRows:snapshot.deletedRows||{},
  syncError:snapshot.syncError?String(snapshot.syncError).slice(0,220):''};
 try {
  // Seal and verify synchronously: callers never acknowledge an uncommitted save.
  return saveFinanceJson(k,value);
 }catch{return false;}
}
/** Atomic workspace refresh; never modify last confirmed remote baseline. */
export function updateOfflineWorking(ownerId, nextGroups){
 const previous=loadOfflineWorkspace(ownerId);
 if(!previous||!isValidGroups(nextGroups)||!allOwned(nextGroups,ownerId))return false;
 return saveOfflineWorkspace(ownerId,{...previous,working:copy(nextGroups),dirty:true,
   requiresManualSync:previous.requiresManualSync===true || (typeof navigator!=='undefined' && navigator.onLine===false)});
}
/**
 * Remove rows from the working copy and remember each removal (a tombstone with the row as it was), in one write.
 * The sync uploads a tombstone only while the cloud row still matches what this device confirmed or deleted.
 */
export function recordOfflineDeletions(ownerId, removals){
 const previous=loadOfflineWorkspace(ownerId);
 if(!previous||!Array.isArray(removals))return false;
 const working=copy(previous.working),pendingDeletions={...previous.pendingDeletions},deletedRows={...(previous.deletedRows||{})};
 for(const {group,id,row:shown} of removals){
  if(!Array.isArray(working[group])||!id)return false;
  // A row missing from a slightly stale device copy is still tombstoned with the copy the app showed, so the
  // deletion is not lost; the sync applies it only while the cloud row still matches that copy.
  const row=working[group].find(item=>item?.id===id)||(shown&&shown.id===id&&(!shown.user_id||shown.user_id===ownerId)?shown:null);
  if(!row)continue;
  working[group]=working[group].filter(item=>item?.id!==id);
  pendingDeletions[group]=Array.from(new Set([...(pendingDeletions[group]||[]),id]));
  deletedRows[group]={...(deletedRows[group]||{}),[id]:row};
 }
 return saveOfflineWorkspace(ownerId,{...previous,working,pendingDeletions,deletedRows,dirty:true,
  requiresManualSync:previous.requiresManualSync===true || (typeof navigator!=='undefined' && navigator.onLine===false)});
}
/** Put rows back (an Archive restore) and drop their tombstones, in one write. */
export function restoreOfflineRows(ownerId, group, rows){
 const previous=loadOfflineWorkspace(ownerId);
 if(!previous||!Array.isArray(previous.working[group])||!Array.isArray(rows))return false;
 const ids=new Set(rows.map(row=>row?.id));
 const working={...copy(previous.working),[group]:[...copy(rows),...previous.working[group].filter(item=>!ids.has(item?.id))]};
 const pendingDeletions={...previous.pendingDeletions,[group]:(previous.pendingDeletions?.[group]||[]).filter(id=>!ids.has(id))};
 const deletedRows={...(previous.deletedRows||{}),[group]:Object.fromEntries(Object.entries(previous.deletedRows?.[group]||{}).filter(([id])=>!ids.has(id)))};
 return saveOfflineWorkspace(ownerId,{...previous,working,pendingDeletions,deletedRows,dirty:true,
  requiresManualSync:previous.requiresManualSync===true || (typeof navigator!=='undefined' && navigator.onLine===false)});
}
export function clearOfflineWorkspace(ownerId){
 const k=key(ownerId);if(!k)return false;
 try {storage()?.removeItem(k);return !storage()?.getItem(k);}catch{return false;}
}

/** A network outage creates a manual-approval boundary, but never clears data. */
export function holdOfflineWorkspaceForApproval(ownerId) {
 const snapshot=loadOfflineWorkspace(ownerId);
 if(!snapshot)return false;
 return saveOfflineWorkspace(ownerId,{...snapshot,requiresManualSync:true});
}
