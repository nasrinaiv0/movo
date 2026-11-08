/**
 * Atomic, account-scoped offline workspace for a verified signed-in user.
 * Each snapshot contains a last-confirmed common ancestor + working rows.
 * Deliberately never reads the legacy guest wallet from another user's cache.
 *
 * Browser localStorage is NOT encryption; do not claim physical/XSS security.
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
 try {
  const json=storage()?.getItem(k);if(!json)return null;
  const saved=JSON.parse(json);
  if(saved?.version!==2||saved.owner!==ownerId||!isValidGroups(saved.baseline)
    ||!isValidGroups(saved.working)||!allOwned(saved.baseline,ownerId)||!allOwned(saved.working,ownerId))return null;
  return saved;
 }catch{return null;}
}
export function saveOfflineWorkspace(ownerId, snapshot){
 const k=key(ownerId),local=storage();
 if(!k||!local||!isValidGroups(snapshot?.baseline)||!isValidGroups(snapshot?.working)
   ||!allOwned(snapshot.baseline,ownerId)||!allOwned(snapshot.working,ownerId))return false;
 const value={version:2,owner:ownerId,baseline:copy(snapshot.baseline),
  working:copy(snapshot.working), dirty:snapshot.dirty===true,
  lastConfirmedAt:String(snapshot.lastConfirmedAt||''),pendingDeletions:snapshot.pendingDeletions||{},
  syncError:snapshot.syncError?String(snapshot.syncError).slice(0,220):''};
 try {
  const data=JSON.stringify(value);
  local.setItem(k,data);
  // Surface quota or no-op failures instead of claiming a saved copy.
  return local.getItem(k)===data;
 }catch{return false;}
}
/** Atomic workspace refresh; never modify last confirmed remote baseline. */
export function updateOfflineWorking(ownerId, nextGroups){
 const previous=loadOfflineWorkspace(ownerId);
 if(!previous||!isValidGroups(nextGroups)||!allOwned(nextGroups,ownerId))return false;
 return saveOfflineWorkspace(ownerId,{...previous,working:copy(nextGroups),dirty:true});
}
export function clearOfflineWorkspace(ownerId){
 const k=key(ownerId);if(!k)return false;
 try {storage()?.removeItem(k);return !storage()?.getItem(k);}catch{return false;}
}
