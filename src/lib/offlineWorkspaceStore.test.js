import {loadOfflineWorkspace,saveOfflineWorkspace,updateOfflineWorking,clearOfflineWorkspace} from './offlineWorkspaceStore';
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
