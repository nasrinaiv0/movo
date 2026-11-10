import { planOfflineReconciliation, sameFinanceRecord, sameSyncedFinanceFields, SYNC_GROUPS } from './offlineReconciliation';
const OWNER='123e4567-e89b-42d3-a456-426614174000';
const a={id:'a', user_id:OWNER, name:'Main', opening_balance:'125.00', currency:'PHP'};
const t={id:'t', user_id:OWNER, account_id:'a', amount:20, merchant:'Food', transaction_type:'expense'};
const scope=(accounts=[], transactions=[])=>({financial_accounts:accounts,transactions});
const plan=(base,local,cloud,extra={})=>planOfflineReconciliation({ownerId:OWNER,groups:['financial_accounts','transactions'],base,local,cloud,...extra});
test('register includes every cloud finance backup group required for reconciliation',()=>{
  expect(SYNC_GROUPS).toEqual(expect.arrayContaining(['financial_accounts','transactions','financial_loans','financial_receivables','scheduled_transactions','allocation_events','user_preferences','movo_ai_messages']));
});
test('different JSON field order and money stored as numeric decimal vs string do not falsely conflict',()=>{
  expect(sameFinanceRecord(a,{currency:'PHP',opening_balance:125, id:'a',user_id:OWNER,name:'Main',updated_at:'today'})).toBe(true);
});
test('offline transaction added while cloud adds another: reconcile both ways without deleting either',()=>{
  const result=plan(scope([a],[t]),scope([a],[t,{...t,id:'local',amount:'17.50'}]),scope([a],[t,{...t,id:'server',amount:'21.00'}]));
  expect(result.ok).toBe(true);
  expect(result.upload.map(x=>x.id)).toEqual(['local']);
  expect(result.download.map(x=>x.id)).toEqual(['server']);
});
test('only local account edit pushes with expected common ancestor',()=>{
  const row={...a,name:'Home'};const result=plan(scope([a]),scope([row]),scope([a]));
  expect(result.upload).toEqual([expect.objectContaining({group:'financial_accounts',change:'update',record:row,expected:a})]);
});
test('only cloud account edit downloads into device',()=>{
  const result=plan(scope([a]),scope([a]),scope([{...a,name:'Savings'}]));
  expect(result.download).toEqual([expect.objectContaining({group:'financial_accounts',id:'a',change:'update'})]);
});
test('competing edits never use last-write-wins or device clocks',()=>{
  const result=plan(scope([a]),scope([{...a,name:'Mine'}]),scope([{...a,name:'Theirs'}]));
  expect(result.ok).toBe(false);
  expect(result.conflicts[0].reason).toBe('concurrent_divergent_edits');
  expect(result.upload).toHaveLength(0);
});
test('identical offline/cloud edits are already reconciled',()=>{
  const row={...a,name:'Updated'};
  const result=plan(scope([a]),scope([row]),scope([row]));
  expect(result.ok).toBe(true);
  expect(result.unchanged).toEqual([expect.objectContaining({group:'financial_accounts',id:'a'})]);
});
test('missing snapshot category never means empty financial history',()=>{
  const result=plan({financial_accounts:[a]},scope([a]),scope([a]));
  expect(result.ok).toBe(false);
  expect(result.issues).toEqual([expect.objectContaining({group:'transactions',reason:'missing_complete_group_snapshot'})]);
});
test('record ownership mismatch and duplicate IDs stop reconciliation',()=>{
  const result=plan(scope([a]),scope([a,{...a,name:'Duplicate'}]),scope([a]));
  expect(result.ok).toBe(false);
  expect(result.issues[0].reason).toBe('missing_or_duplicate_record_key');
  const wrong=plan(scope([a]),scope([{...a,user_id:'other-owner'}]),scope([a]));
  expect(wrong.issues[0].reason).toBe('owner_mismatch');
});
test('a missing device row without a tombstone is never treated as a deletion',()=>{
  const gone=plan(scope([a]),scope([]),scope([a]));
  expect(gone.ok).toBe(false);
  expect(gone.conflicts[0].reason).toBe('missing_local_row_without_tombstone');
  expect(gone.upload).toHaveLength(0);
});
test('a tombstoned row still unchanged in the cloud is queued as a guarded delete',()=>{
  const marked=plan(scope([a],[t]),scope([a],[]),scope([a],[{...t,updated_at:'later'}]),{localDeletions:{transactions:['t']}});
  expect(marked.ok).toBe(true);
  expect(marked.upload).toEqual([expect.objectContaining({group:'transactions',id:'t',change:'delete',expected:t,cloud:expect.objectContaining({updated_at:'later'})})]);
});
test('a tombstoned row changed elsewhere is a conflict, never deleted',()=>{
  const result=plan(scope([a],[t]),scope([a],[]),scope([a],[{...t,amount:99}]),{localDeletions:{transactions:['t']}});
  expect(result.ok).toBe(false);
  expect(result.conflicts[0].reason).toBe('deleted_locally_changed_remotely');
  expect(result.upload).toHaveLength(0);
});
test('a tombstoned row already gone from the cloud is complete (retry after a lost acknowledgment)',()=>{
  const result=plan(scope([a],[t]),scope([a],[]),scope([a],[]),{localDeletions:{transactions:['t']}});
  expect(result.ok).toBe(true);
  expect(result.upload).toHaveLength(0);
  expect(result.unchanged).toContainEqual({group:'transactions',id:'t'});
});
test('a device-created row uploaded earlier, then deleted, is removed only when it still matches the deleted copy',()=>{
  const uploaded={...t,id:'n',merchant:'Taxi'};
  const same=plan(scope([a],[]),scope([a],[]),scope([a],[uploaded]),{localDeletions:{transactions:['n']},deletedRows:{transactions:{n:uploaded}}});
  expect(same.ok).toBe(true);
  expect(same.upload).toEqual([expect.objectContaining({id:'n',change:'delete'})]);
  const unknown=plan(scope([a],[]),scope([a],[]),scope([a],[uploaded]),{localDeletions:{transactions:['n']}});
  expect(unknown.ok).toBe(false);
  expect(unknown.conflicts[0].reason).toBe('deleted_locally_changed_remotely');
  const created=plan(scope([a],[]),scope([a],[]),scope([a],[]),{localDeletions:{transactions:['n']}});
  expect(created.ok).toBe(true);
  expect(created.upload).toHaveLength(0);
});
test('a tombstone next to a live device row is a conflict',()=>{
  const result=plan(scope([a],[t]),scope([a],[t]),scope([a],[t]),{localDeletions:{transactions:['t']}});
  expect(result.ok).toBe(false);
  expect(result.conflicts[0].reason).toBe('deletion_marker_with_live_row');
});
test('a local transaction edit uploads with the current cloud row as its revision',()=>{
  const cloudRow={...t,updated_at:'2026-11-08T01:00:00Z'};
  const edited={...t,amount:25};
  const result=plan(scope([a],[t]),scope([a],[edited]),scope([a],[cloudRow]));
  expect(result.ok).toBe(true);
  expect(result.upload).toEqual([expect.objectContaining({group:'transactions',change:'update',record:edited,expected:t,cloud:cloudRow})]);
});
test('an edit the cloud already accepted (lost acknowledgment) is reconciled, not a conflict',()=>{
  const edited={...t,amount:'25.00',source:'Manual'};
  const cloudRow={...t,amount:25,source:'manual',updated_at:'later'};
  const result=plan(scope([a],[t]),scope([a],[edited]),scope([a],[cloudRow]));
  expect(result.ok).toBe(true);
  expect(result.upload).toHaveLength(0);
});
test('a row deleted in the cloud and untouched on this device is a download, never recreated from the cache',()=>{
  const result=plan(scope([a],[t]),scope([a],[t,{...t,id:'local'}]),scope([a],[]));
  expect(result.ok).toBe(true);
  expect(result.upload.map(x=>x.id)).toEqual(['local']);
  expect(result.download).toEqual([expect.objectContaining({group:'transactions',id:'t',change:'delete',expected:t})]);
});
test('a row deleted in the cloud but edited on this device is a conflict, not dropped or recreated',()=>{
  const result=plan(scope([a]),scope([{...a,name:'Edited here'}]),scope([]));
  expect(result.ok).toBe(false);
  expect(result.upload).toHaveLength(0);
  expect(result.download).toHaveLength(0);
  expect(result.conflicts[0]).toEqual(expect.objectContaining({reason:'remote_row_missing_without_tombstone',id:'a'}));
});
test('new equal row IDs on both sides not considered duplicate uploads',()=>{
  const result=plan(scope(),scope([a]),scope([a]));
  expect(result.ok).toBe(true);
  expect(result.upload).toHaveLength(0);
});
test('no verified signed-in owner refuses reconciliation',()=>{
  expect(()=>planOfflineReconciliation({ownerId:'guest',base:scope(),local:scope(),cloud:scope(),groups:['financial_accounts','transactions']})).toThrow('verified signed-in owner');
});
test('planning never modifies financial snapshots',()=>{
  const b=scope([a],[t]),l=scope([a],[t]),c=scope([a],[t]);
  plan(b,l,c);
  expect(b).toEqual(scope([a],[t]));
  expect(l).toEqual(scope([a],[t]));
  expect(c).toEqual(scope([a],[t]));
});

test('previously committed offline create is recognized on retry after lost network acknowledgment',()=>{
 const device={...t,id:'retry',source:'Manual',amount:'12.34'};
 const cloud={...device,source:'manual',amount:12.34,
   transfer_to_account_id:null,is_pending:false,receipt_note:null,
   receipt_path:null,payment_reference:null,external_reference:null,
   schedule_id:null,updated_at:'2026-11-08T06:45:00Z'};
 const result=plan(scope([a],[t]),scope([a],[t,device]),scope([a],[t,cloud]));
 expect(result.ok).toBe(true);
 expect(result.upload).toHaveLength(0);
 expect(result.unchanged).toContainEqual({group:'transactions',id:'retry'});
});
test('a retry never mistakes conflicting money for successful synchronization',()=>{
 const device={...t,id:'retry',amount:'12.34'};
 const cloud={...device,amount:12.35};
 expect(sameSyncedFinanceFields(device,cloud,'transactions')).toBe(false);
 const result=plan(scope([a],[t]),scope([a],[t,device]),scope([a],[t,cloud]));
 expect(result.ok).toBe(false);
 expect(result.conflicts[0].reason).toBe('same_new_id_diverged');
});
