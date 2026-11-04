import { supabase } from './supabaseClient';

const db = () => { if (!supabase) throw new Error('MOVO cloud storage is not configured.'); return supabase; };
const unwrap = ({ data, error }) => { if (error) throw error; return data; };
const OFFSETS = [0, 1, 2, 3, 5, 7, 14, 30];

const LOCAL_PREF_KEY = 'movo.paymentReminderPreferences.v1';
const defaultPreferences = () => ({ enabled:true, reminder_days:[0,1,3], quiet_start:null, quiet_end:null, timezone:'Asia/Manila', push_enabled:false });
const readLocalPreferences = () => {
  try { return { ...defaultPreferences(), ...(JSON.parse(window.localStorage.getItem(LOCAL_PREF_KEY)||'{}')) }; }
  catch { return defaultPreferences(); }
};
export async function getReminderPreferences(userId) {
  if (!userId) return readLocalPreferences();
  const row = unwrap(await db().from('payment_reminder_preferences').select('*').eq('user_id', userId).maybeSingle());
  return row ? { ...row, quiet_start: row.quiet_start ? String(row.quiet_start).slice(0,5) : null, quiet_end: row.quiet_end ? String(row.quiet_end).slice(0,5) : null } : defaultPreferences();
}
export async function saveReminderPreferences(userId, input) {
  if (!userId) {
    const days=[...new Set((input.reminder_days||[]).map(Number))].filter(n=>OFFSETS.includes(n)).sort((a,b)=>a-b);
    if(days.length>8)throw new Error('Choose up to eight reminder intervals.');
    const validTime=value=>value==null||value===''||/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(value);
    if(!validTime(input.quiet_start)||!validTime(input.quiet_end)||!!input.quiet_start!==!!input.quiet_end)throw new Error('Enter a complete, valid quiet-hour range.');
    const timezone=String(input.timezone||'Asia/Manila').slice(0,64);
    try{new Intl.DateTimeFormat('en-US',{timeZone:timezone});}catch{throw new Error('Choose a valid timezone.');}
    const row={...defaultPreferences(),...input,reminder_days:days,timezone,enabled:input.enabled!==false,push_enabled:input.push_enabled===true};
    try{window.localStorage.setItem(LOCAL_PREF_KEY,JSON.stringify(row));}catch{throw new Error('Could not save reminder preferences on this device.');}
    return row;
  }
  const days = [...new Set((input.reminder_days || []).map(Number))].filter(n => OFFSETS.includes(n)).sort((a,b) => a-b);
  if (days.length > 8) throw new Error('Choose up to eight reminder intervals.');
  const validTime = value => value == null || value === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  if (!validTime(input.quiet_start) || !validTime(input.quiet_end)) throw new Error('Enter valid quiet-hour times.');
  if (!!input.quiet_start !== !!input.quiet_end) throw new Error('Set both quiet-hour start and end times, or leave both empty.');
  const timezone = String(input.timezone || 'Asia/Manila').slice(0,64);
  try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }); } catch { throw new Error('Choose a valid timezone.'); }
  const row = {
    user_id: userId, enabled: input.enabled !== false, reminder_days: days,
    quiet_start: input.quiet_start || null, quiet_end: input.quiet_end || null,
    timezone,
    push_enabled: input.push_enabled === true, updated_at: new Date().toISOString(),
  };
  return unwrap(await db().from('payment_reminder_preferences').upsert(row).select().single());
}

export async function updateSchedule(id, userId, changes) {
  if(!id||!userId)throw new Error('Sign in to update this schedule.');
  const allowed=['title','amount','currency','transaction_type','account_id','transfer_to_account_id','scheduled_for','frequency','category','notes','ends_on','reminder_days','timezone','reference_note'];
  const patch=Object.fromEntries(Object.entries(changes||{}).filter(([key])=>allowed.includes(key)));
  const current=unwrap(await db().from('scheduled_transactions').select('*').eq('id',id).eq('user_id',userId).in('status',['scheduled','paused']).maybeSingle());
  if(!current)throw new Error('This schedule is no longer available.');
  const next={...current,...patch};
  next.title=String(next.title||'').trim().slice(0,160);
  if(!next.title)throw new Error('Enter a schedule description.');
  next.amount=Number(next.amount);
  if(!Number.isFinite(next.amount)||next.amount<=0||next.amount>=1e16)throw new Error('Enter an amount greater than zero.');
  next.amount=Math.round(next.amount*100)/100;
  if(!['expense','transfer'].includes(next.transaction_type))throw new Error('Choose a payment or transfer.');
  if(!['once','weekly','monthly','yearly'].includes(next.frequency))throw new Error('Choose a valid repeat interval.');
  const validDate=value=>typeof value==='string'&&/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
  if(!validDate(next.scheduled_for))throw new Error('Choose a valid scheduled date.');
  next.ends_on=next.ends_on||null;
  if(next.ends_on&&(!validDate(next.ends_on)||next.ends_on<next.scheduled_for))throw new Error('The end date must be on or after the first scheduled date.');
  next.currency=String(next.currency||'PHP').toUpperCase();
  if(!/^[A-Z]{3}$/.test(next.currency))throw new Error('Choose a valid currency.');
  next.account_id=next.account_id||null;
  next.transfer_to_account_id=next.transaction_type==='transfer'?(next.transfer_to_account_id||null):null;
  if(!next.account_id)throw new Error('Choose the account to use.');
  if(next.transaction_type==='transfer'&&(!next.transfer_to_account_id||next.transfer_to_account_id===next.account_id))throw new Error('Choose a different destination account.');
  const accountIds=[next.account_id,...(next.transaction_type==='transfer'?[next.transfer_to_account_id]:[])];
  const owned=unwrap(await db().from('financial_accounts').select('id,currency,account_type').eq('user_id',userId).in('id',accountIds));
  if((owned||[]).length!==accountIds.length||owned.some(a=>!['bank','e_wallet','cash'].includes(a.account_type)))throw new Error('Choose eligible accounts belonging to your MOVO profile.');
  if(owned.some(a=>a.currency!==next.currency))throw new Error('The selected accounts must use the same currency.');
  const days=[...new Set((next.reminder_days||[]).map(Number))].filter(n=>OFFSETS.includes(n)).sort((a,b)=>a-b);
  if(days.length>8)throw new Error('Choose up to eight reminder intervals.');
  const timezone=String(next.timezone||'Asia/Manila').slice(0,64);
  try{new Intl.DateTimeFormat('en-US',{timeZone:timezone});}catch{throw new Error('Choose a valid timezone.');}
  return unwrap(await db().from('scheduled_transactions').update({
    title:next.title,amount:next.amount,currency:next.currency,transaction_type:next.transaction_type,
    account_id:next.account_id,transfer_to_account_id:next.transfer_to_account_id,
    scheduled_for:next.scheduled_for,frequency:next.frequency,category:String(next.category||'Other').trim().slice(0,60)||'Other',
    notes:String(next.notes||'').trim().slice(0,500)||null,ends_on:next.ends_on,reminder_days:days,timezone,
    reference_note:String(next.reference_note||'').trim().slice(0,500)||null,updated_at:new Date().toISOString(),
  }).eq('id',id).eq('user_id',userId).in('status',['scheduled','paused']).select().single());
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

export async function recordReminderEvent(userId, event) {
  if (!userId || !event?.source_type || !event?.source_id || !event?.occurrence_date) return null;
  const allowed = ['scheduled','bill','subscription','loan','credit_card','receivable'];
  if (!allowed.includes(event.source_type)) throw new Error('Unsupported reminder type.');
  const offset = Math.max(0, Math.min(30, Number(event.reminder_offset) || 0));
  const row = {
    user_id: userId, source_type: event.source_type, source_id: String(event.source_id),
    occurrence_date: event.occurrence_date, reminder_offset: offset,
    channel: event.channel || 'in_app', status: event.status || 'queued',
    snoozed_until: event.snoozed_until || null,
    ...(event.status === 'sent' ? { sent_at: new Date().toISOString() } : {}),
  };
  return unwrap(await db().from('payment_reminder_events').upsert(row, {
    onConflict: 'user_id,source_type,source_id,occurrence_date,reminder_offset,channel',
  }).select().single());
}

export async function listReminderEvents(userId, limit = 50) {
  if (!userId) return [];
  return unwrap(await db().from('payment_reminder_events').select('*')
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(Math.max(1, Math.min(100, limit)))) || [];
}

export async function snoozeObligation(userId, event, until) {
  const date = new Date(until);
  if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) throw new Error('Choose a future reminder time.');
  const snooze={ ...event, status:'dismissed', snoozed_until:date.toISOString() };
  const [inApp,push]=await Promise.all([
    recordReminderEvent(userId,{...snooze,channel:'in_app'}),
    recordReminderEvent(userId,{...snooze,channel:'push'}),
  ]);
  return {in_app:inApp,push};
}
