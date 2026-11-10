import {loadOfflineWorkspace,saveOfflineWorkspace,updateOfflineWorking,clearOfflineWorkspace,recordOfflineDeletions,restoreOfflineRows,holdOfflineChanges} from './offlineWorkspaceStore';
const OWNER='123e4567-e89b-42d3-a456-426614174000',OTHER='123e4567-e89b-42d3-a456-426614174001';
const base={financial_accounts:[{id:'a',name:'Bank',user_id:OWNER}],transactions:[{id:'t',account_id:'a',amount:4.25,user_id:OWNER}]};
beforeEach(()=>localStorage.clear());
test('signed-in workspaces are owner scoped; guest cache cannot be promoted by accident',()=>{
 localStorage.setItem('movo.local.transactions.v1',JSON.stringify([{id:'guest',amount:999}]));
 expect(saveOfflineWorkspace(OWNER,{baseline:base,working:base,dirty:false})).toBe(true);
 expect(loadOfflineWorkspace(OTHER)).toBeNull();
 expect(loadOfflineWorkspace(OWNER).working.transactions[0].id).toBe('t');
 expect(localStorage.getItem('movo.local.transactions.v1')).toContain('guest');
});
test('offline edits preserve confirmed cloud ancestor and mark pending',()=>{
 saveOfflineWorkspace(OWNER,{baseline:base,working:base,dirty:false});
 const next={...base,transactions:[...base.transactions,{id:'offline',account_id:'a',amount:7,user_id:OWNER}]};
 expect(updateOfflineWorking(OWNER,next)).toBe(true);
 const stored=loadOfflineWorkspace(OWNER);
 expect(stored.dirty).toBe(true);
 expect(stored.baseline.transactions).toHaveLength(1);
 expect(stored.working.transactions).toHaveLength(2);
});
test('a signed-in account cannot load a different owner row',()=>{
 const wrong={...base,transactions:[{...base.transactions[0],user_id:OTHER}]};
 expect(saveOfflineWorkspace(OWNER,{baseline:base,working:wrong})).toBe(false);
 expect(loadOfflineWorkspace(OWNER)).toBeNull();
});
test('quota failure returns false without losing previously persisted baseline',()=>{
 saveOfflineWorkspace(OWNER,{baseline:base,working:base});
 const original=Storage.prototype.setItem;
 Storage.prototype.setItem=function(){throw new Error('QuotaExceededError');};
 try {expect(updateOfflineWorking(OWNER,{...base,transactions:[]})).toBe(false);}
 finally {Storage.prototype.setItem=original;}
 expect(loadOfflineWorkspace(OWNER).working.transactions).toHaveLength(1);
});
test('incomplete or invalid snapshot must not be treated as an empty dataset',()=>{
 expect(saveOfflineWorkspace(OWNER,{baseline:{transactions:[]},working:{financial_accounts:[],transactions:[]}})).toBe(false);
 expect(loadOfflineWorkspace(OWNER)).toBeNull();
});
test('only selected account workspace is cleared',()=>{
 saveOfflineWorkspace(OWNER,{baseline:base,working:base});
 saveOfflineWorkspace(OTHER,{baseline:{financial_accounts:[],transactions:[]},working:{financial_accounts:[],transactions:[]}});
 expect(clearOfflineWorkspace(OWNER)).toBe(true);
 expect(loadOfflineWorkspace(OWNER)).toBeNull();
 expect(loadOfflineWorkspace(OTHER)).not.toBeNull();
});

test('a device deletion removes the row and keeps a tombstone with the deleted copy in one write',()=>{
 saveOfflineWorkspace(OWNER,{baseline:base,working:base,dirty:false});
 expect(recordOfflineDeletions(OWNER,[{group:'transactions',id:'t'}])).toBe(true);
 const stored=loadOfflineWorkspace(OWNER);
 expect(stored.working.transactions).toHaveLength(0);
 expect(stored.baseline.transactions).toHaveLength(1);
 expect(stored.pendingDeletions).toEqual({transactions:['t']});
 expect(stored.deletedRows.transactions.t).toEqual(base.transactions[0]);
 expect(stored.dirty).toBe(true);
 // later working-copy saves keep the tombstone
 expect(updateOfflineWorking(OWNER,stored.working)).toBe(true);
 expect(loadOfflineWorkspace(OWNER).pendingDeletions).toEqual({transactions:['t']});
});
test('restoring a deleted row clears its tombstone',()=>{
 saveOfflineWorkspace(OWNER,{baseline:base,working:base,dirty:false});
 recordOfflineDeletions(OWNER,[{group:'transactions',id:'t'}]);
 expect(restoreOfflineRows(OWNER,'transactions',[base.transactions[0]])).toBe(true);
 const stored=loadOfflineWorkspace(OWNER);
 expect(stored.working.transactions.map(x=>x.id)).toEqual(['t']);
 expect(stored.pendingDeletions.transactions).toEqual([]);
 expect(stored.deletedRows.transactions).toEqual({});
});
test('tombstones are never written without a verified owner workspace',()=>{
 expect(recordOfflineDeletions(OWNER,[{group:'transactions',id:'t'}])).toBe(false);
 expect(restoreOfflineRows(OWNER,'transactions',[])).toBe(false);
});
test('a row missing from a stale device copy is tombstoned with the copy the app showed',()=>{
 saveOfflineWorkspace(OWNER,{baseline:base,working:base,dirty:false});
 const shown={id:'online-only',account_id:'a',amount:3,user_id:OWNER};
 expect(recordOfflineDeletions(OWNER,[{group:'transactions',id:'online-only',row:shown}])).toBe(true);
 expect(loadOfflineWorkspace(OWNER).deletedRows.transactions['online-only']).toEqual(shown);
 expect(recordOfflineDeletions(OWNER,[{group:'transactions',id:'x',row:{id:'x',user_id:OTHER}}])).toBe(true);
 expect(loadOfflineWorkspace(OWNER).pendingDeletions.transactions).toEqual(['online-only']);
});
test('holding offline changes survives every later write and changes no record',()=>{
 expect(holdOfflineChanges(OWNER)).toBe(false); // no workspace yet: nothing is created
 saveOfflineWorkspace(OWNER,{baseline:base,working:base,dirty:false});
 const before=loadOfflineWorkspace(OWNER);
 expect(before.held).toBe(false);
 expect(holdOfflineChanges(OWNER)).toBe(true);
 const held=loadOfflineWorkspace(OWNER);
 expect(held.held).toBe(true);
 expect({...held,held:false}).toEqual(before);
 // Later edits, deletions and restores keep the hold until a sync saves a fresh copy.
 expect(updateOfflineWorking(OWNER,{...base,transactions:[]})).toBe(true);
 expect(recordOfflineDeletions(OWNER,[{group:'financial_accounts',id:'a'}])).toBe(true);
 expect(restoreOfflineRows(OWNER,'financial_accounts',[base.financial_accounts[0]])).toBe(true);
 expect(loadOfflineWorkspace(OWNER).held).toBe(true);
 expect(saveOfflineWorkspace(OWNER,{baseline:base,working:base,dirty:false})).toBe(true);
 expect(loadOfflineWorkspace(OWNER).held).toBe(false);
});
