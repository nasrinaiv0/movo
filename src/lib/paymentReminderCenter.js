import { supabase } from './supabaseClient';

const db = () => { if (!supabase) throw new Error('MOVO cloud storage is not configured.'); return supabase; };
const unwrap = ({ data, error }) => { if (error) throw error; return data; };
const OFFSETS = [0, 1, 2, 3, 5, 7, 14, 30];

export async function getReminderPreferences(userId) {
  if (!userId) return { enabled: true, reminder_days: [0, 1, 3], quiet_start: null, quiet_end: null, timezone: 'Asia/Manila', push_enabled: false };
  const row = unwrap(await db().from('payment_reminder_preferences').select('*').eq('user_id', userId).maybeSingle());
  return row || { enabled: true, reminder_days: [0, 1, 3], quiet_start: null, quiet_end: null, timezone: 'Asia/Manila', push_enabled: false };
}

export async function saveReminderPreferences(userId, input) {
  if (!userId) throw new Error('Sign in to sync reminder preferences.');
  const days = [...new Set((input.reminder_days || []).map(Number))].filter(n => OFFSETS.includes(n)).sort((a,b) => a-b);
  if (days.length > 8) throw new Error('Choose up to eight reminder intervals.');
  const row = {
    user_id: userId, enabled: input.enabled !== false, reminder_days: days,
    quiet_start: input.quiet_start || null, quiet_end: input.quiet_end || null,
    timezone: String(input.timezone || 'Asia/Manila').slice(0,64),
    push_enabled: input.push_enabled === true, updated_at: new Date().toISOString(),
  };
  return unwrap(await db().from('payment_reminder_preferences').upsert(row).select().single());
}

export async function updateSchedule(id, userId, changes) {
  const allowed = ['title','amount','currency','account_id','transfer_to_account_id','scheduled_for','frequency','category','notes','ends_on','reminder_days','timezone','reference_note'];
  const patch = Object.fromEntries(Object.entries(changes).filter(([key]) => allowed.includes(key)));
  if (patch.amount !== undefined && (!Number.isFinite(Number(patch.amount)) || Number(patch.amount) <= 0)) throw new Error('Enter an amount greater than zero.');
  if (patch.title !== undefined) patch.title = String(patch.title).trim().slice(0,160);
  if (patch.reminder_days) patch.reminder_days = [...new Set(patch.reminder_days.map(Number))].filter(n => OFFSETS.includes(n));
  patch.updated_at = new Date().toISOString();
  return unwrap(await db().from('scheduled_transactions').update(patch).eq('id',id).eq('user_id',userId).eq('status','scheduled').select().single());
}

export async function setScheduleState(id, userId, action) {
  if (!['pause','resume','cancel'].includes(action)) throw new Error('Unsupported schedule action.');
  const patch = action === 'pause' ? { status:'paused', paused_at:new Date().toISOString() }
    : action === 'resume' ? { status:'scheduled', paused_at:null, snoozed_until:null }
    : { status:'cancelled' };
  patch.updated_at = new Date().toISOString();
  return unwrap(await db().from('scheduled_transactions').update(patch).eq('id',id).eq('user_id',userId).in('status',['scheduled','paused']).select().single());
}

export async function skipScheduleOccurrence(item, userId) {
  if (!item?.id || !userId) throw new Error('Scheduled occurrence not found.');
  if (item.frequency === 'once') return setScheduleState(item.id,userId,'cancel');
  const next = new Date(`${item.scheduled_for}T12:00:00Z`);
  if (item.frequency === 'weekly') next.setUTCDate(next.getUTCDate()+7);
  else if (item.frequency === 'monthly') {
    const day=next.getUTCDate(); next.setUTCDate(1); next.setUTCMonth(next.getUTCMonth()+1);
    next.setUTCDate(Math.min(day,new Date(Date.UTC(next.getUTCFullYear(),next.getUTCMonth()+1,0)).getUTCDate()));
  } else next.setUTCFullYear(next.getUTCFullYear()+1);
  const date=next.toISOString().slice(0,10);
  if (item.ends_on && date > item.ends_on) return setScheduleState(item.id,userId,'cancel');
  return unwrap(await db().from('scheduled_transactions').update({scheduled_for:date,snoozed_until:null,updated_at:new Date().toISOString()}).eq('id',item.id).eq('user_id',userId).eq('status','scheduled').select().single());
}

export async function snoozeSchedule(id, userId, until) {
  const date = new Date(until);
  if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) throw new Error('Choose a future reminder time.');
  return unwrap(await db().from('scheduled_transactions').update({snoozed_until:date.toISOString(),updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',userId).eq('status','scheduled').select().single());
}

export function suggestPaymentAccount({ amount, currency, accounts = [], transactions = [], preferredId = '' }) {
  const eligible=accounts.filter(a=>!a.is_archived && ['bank','e_wallet','cash'].includes(a.account_type) && a.currency===currency);
  if (preferredId && eligible.some(a=>a.id===preferredId)) return { account:eligible.find(a=>a.id===preferredId), reason:'saved_preference' };
  const scored=eligible.map(account=>{
    const recent=transactions.filter(t=>t.account_id===account.id).slice(0,12).length;
    const balance=Number(account.balance)||0;
    const enough=balance>=Number(amount);
    return {account,score:(enough?100:0)+Math.min(recent,12)*2+(account.account_type==='bank'?2:0),enough};
  }).sort((a,b)=>b.score-a.score);
  return scored[0] ? {account:scored[0].account,reason:scored[0].enough?'smart_suggestion':'low_balance_warning',insufficient:!scored[0].enough} : {account:null,reason:'choose_manually',insufficient:false};
}

export function findLikelyDuplicate({ merchant, amount, date, accountId, transactions = [] }) {
  const target=String(merchant||'').trim().toLowerCase().replace(/[^a-z0-9]/g,'');
  const cents=Math.round(Number(amount)*100);
  const day=String(date||'').slice(0,10);
  return transactions.find(t=>{
    const name=String(t.merchant||'').trim().toLowerCase().replace(/[^a-z0-9]/g,'');
    return name && name===target && Math.round(Number(t.amount)*100)===cents &&
      String(t.date||t.occurred_at||'').slice(0,10)===day && (!accountId || t.account_id===accountId);
  }) || null;
}
