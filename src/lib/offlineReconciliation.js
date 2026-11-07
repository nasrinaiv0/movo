/**
 * Side-effect-free, lossless three-way offline/online planner.
 * NO network/DB writes occur here. Decisions are based on a verified common
 * ancestor, never just the wall clock (which may be inaccurate when offline).
 * Callers must persist and verify an owner-scoped complete cloud snapshot.
 */
export const SYNC_GROUPS = Object.freeze([
  'financial_accounts', 'transactions', 'accounting_postings', 'financial_loans',
  'loan_events', 'financial_receivables', 'receivable_events',
  'budgets', 'financial_bills', 'bill_occurrences', 'bill_payments',
  'savings_goals', 'goal_allocations', 'plan_funding_allocations', 'allocation_events',
  'scheduled_transactions', 'payment_attempts', 'payment_reminder_preferences',
  'payment_reminder_events', 'user_preferences',
  'movo_automation_inbox', 'movo_ai_conversations', 'movo_ai_messages',
]);

// These groups may have a single per-owner row or non-id key.
const GROUP_KEY = Object.freeze({
  user_preferences: 'user_id',
  payment_reminder_preferences: 'user_id',
});
const EPHEMERAL = new Set(['created_at', 'updated_at', 'synced_at', '_localSync', '_syncMeta']);
const amountKey = /(?:^|_)(amount|balance|limit|principal|credit|debit|payment|spent|saved|cost|fee|total)(?:$|_)/i;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Only precise decimal strings with max 2 fractional digits can be normalized
// to integer cents. Do not silently round unsupported monetary precision.
function normalizeAmount(v) {
  if (!['string', 'number'].includes(typeof v)) return v;
  const raw = String(v);
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(raw)) return v;
  const sign = raw.startsWith('-') ? '-' : '';
  const [whole, frac = ''] = raw.replace(/^-/, '').split('.');
  try { return sign + (BigInt(whole) * 100n + BigInt(frac.padEnd(2, '0'))).toString(); }
  catch { return v; }
}
function canonical(v, field = '') {
  if (Array.isArray(v)) return v.map(x => canonical(x));
  if (v && typeof v === 'object') return Object.fromEntries(
    Object.entries(v).filter(([k]) => !EPHEMERAL.has(k)).sort(([a],[b]) => a.localeCompare(b))
      .map(([k, value]) => [k, canonical(value, k)]));
  if (amountKey.test(field)) return normalizeAmount(v);
  return v;
}
export function sameFinanceRecord(a, b) {
  if (a === undefined || b === undefined) return a === b;
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}
/**
 * Compare persisted financial meaning, not server-generated defaults or
 * timestamps. Used only to confirm a same-ID new row after an interrupted
 * network acknowledgment; an amount/account/merchant change is a conflict.
 */
const SYNCED_ACCOUNT_FIELDS = [
 'id','name','account_type','institution_name','currency',
 'opening_balance','is_archived','display_order',
];
const SYNCED_TX_FIELDS = [
 'id','account_id','transfer_to_account_id','transaction_type','amount',
 'currency','merchant','category','note','occurred_at','source',
 'external_reference','payment_reference','receipt_note','receipt_path',
 'schedule_id','is_pending',
];
const cleanSyncField=(value,field,row)=>{
 if(field==='is_archived'||field==='is_pending')return value===true;
 if(field==='display_order')return value??0;
 if(field==='opening_balance')return value??row?.balance??0;
 if(field==='currency')return value||'PHP';
 if(field==='category')return value||'Other';
 if(field==='source'){
   if(!value||String(value).toLowerCase()==='manual')return 'manual';
   if(value==='File Import'||value==='CSV Import')return 'csv_import';
 }
 if(field==='occurred_at'&&value&&Number.isFinite(Date.parse(value)))
    return new Date(value).toISOString();
 if(value===undefined||value==='')return null;
 return value;
};
export function sameSyncedFinanceFields(a,b,group){
 if(!a||!b)return a===b;
 const fields=group==='financial_accounts'?SYNCED_ACCOUNT_FIELDS:
   group==='transactions'?SYNCED_TX_FIELDS:null;
 if(!fields)return sameFinanceRecord(a,b);
 const project=row=>Object.fromEntries(fields.map(k=>[k,cleanSyncField(row?.[k],k,row)]));
 return sameFinanceRecord(project(a),project(b));
}
const recordKey = (row, group) => String(row?.[GROUP_KEY[group] || 'id'] || '').trim();
function mapRows(rows, group, ownerId, side, issues) {
  if (!Array.isArray(rows)) {
    issues.push({group, side, reason:'missing_complete_group_snapshot'});
    return new Map();
  }
  const result = new Map();
  for (const row of rows) {
    const id = recordKey(row, group);
    if (!row || typeof row !== 'object' || Array.isArray(row) || !id || result.has(id)) {
      issues.push({group, side, id, reason:'missing_or_duplicate_record_key'}); continue;
    }
    if (row.user_id && row.user_id !== ownerId) {
      issues.push({group, side, id, reason:'owner_mismatch'}); continue;
    }
    result.set(id,row);
  }
  return result;
}
function explicitDeletion(deletions, group, id) {
  return Array.isArray(deletions?.[group]) && deletions[group].includes(id);
}
export function planOfflineReconciliation({
  ownerId, base, local, cloud, groups = SYNC_GROUPS, localDeletions = {},
} = {}) {
  if (!uuid.test(String(ownerId || ''))) throw new Error('A verified signed-in owner ID is required for reconciliation.');
  const issues = [], conflicts = [], upload = [], download = [], unchanged = [], deletions = [];
  const named = Array.from(new Set(groups));
  for (const group of named) {
    if (!SYNC_GROUPS.includes(group)) { issues.push({group, reason:'unsupported_group'}); continue; }
    const baseMap = mapRows(base?.[group],group,ownerId,'base',issues);
    const localMap = mapRows(local?.[group],group,ownerId,'local',issues);
    const cloudMap = mapRows(cloud?.[group],group,ownerId,'cloud',issues);
    // Missing or invalid snapshots are never interpreted as empty datasets.
    if (issues.some(x=>x.group===group)) continue;
    const ids = new Set([...baseMap.keys(), ...localMap.keys(), ...cloudMap.keys()]);
    for (const id of ids) {
      const ancestor = baseMap.get(id), device = localMap.get(id), server = cloudMap.get(id);
      const existsInBase = ancestor !== undefined;
      const localDeleted = explicitDeletion(localDeletions, group, id);
      if (localDeleted && device) { conflicts.push({group,id,reason:'deletion_marker_with_live_row',base:ancestor,local:device,cloud:server}); continue; }
      if (localDeleted) {
        // Never hard-delete live cloud records as part of automatic reconciliation.
        deletions.push({group,id,reason:'requires_reversible_server_tombstone',base:ancestor,cloud:server});
        continue;
      }
      if (existsInBase && device === undefined) {
        conflicts.push({group,id,reason:'missing_local_row_without_tombstone',base:ancestor,cloud:server});
        continue;
      }
      if (existsInBase && server === undefined) {
        conflicts.push({group,id,reason:'remote_row_missing_without_tombstone',base:ancestor,local:device});
        continue;
      }
      if (!existsInBase) {
        if (device && server) {
          if (sameSyncedFinanceFields(device,server,group)) unchanged.push({group,id});
          else conflicts.push({group,id,reason:'same_new_id_diverged',local:device,cloud:server});
        } else if (device) upload.push({group,id,change:'create',record:device});
        else if (server) download.push({group,id,change:'create',record:server});
        continue;
      }
      const localChanged = !sameFinanceRecord(device,ancestor);
      const cloudChanged = !sameFinanceRecord(server,ancestor);
      if (!localChanged && !cloudChanged) unchanged.push({group,id});
      else if (localChanged && !cloudChanged) upload.push({group,id,change:'update',record:device,expected:ancestor});
      else if (!localChanged && cloudChanged) download.push({group,id,change:'update',record:server,expected:ancestor});
      else if (sameFinanceRecord(device,server)) unchanged.push({group,id});
      else conflicts.push({group,id,reason:'concurrent_divergent_edits',base:ancestor,local:device,cloud:server});
    }
  }
  return {
    ok: issues.length===0 && conflicts.length===0 && deletions.length===0,
    upload, download, unchanged, conflicts, deletions, issues,
    counts: {upload:upload.length,download:download.length,conflicts:conflicts.length,
      unresolvedDeletes:deletions.length,invalid:issues.length},
  };
}
