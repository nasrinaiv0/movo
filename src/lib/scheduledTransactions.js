import { supabase } from './supabaseClient';
import { createTransaction } from './financeRepository';

const client = () => { if (!supabase) throw new Error('MOVO cloud storage is not configured.'); return supabase; };
const unwrap = ({ data, error }) => { if (error) throw error; return data; };
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) && !Number.isNaN(Date.parse(value)) ? value : (() => { throw new Error('Choose a valid scheduled date.'); })();
export function nextScheduledDate(date, frequency) {
  const current = new Date(`${date}T12:00:00Z`);
  if (frequency === 'weekly') current.setUTCDate(current.getUTCDate() + 7);
  else if (frequency === 'yearly') current.setUTCFullYear(current.getUTCFullYear() + 1);
  else if (frequency === 'monthly') {
    const day = current.getUTCDate();
    current.setUTCDate(1);
    current.setUTCMonth(current.getUTCMonth() + 1);
    const last = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0)).getUTCDate();
    current.setUTCDate(Math.min(day, last));
  }
  return current.toISOString().slice(0,10);
}
const validAmount = value => { const n=Number(value); if(!Number.isFinite(n)||n<=0||n>=1e16) throw new Error('Enter an amount greater than zero.'); return Math.round(n*100)/100; };

export async function listScheduledTransactions() {
  return unwrap(await client().from('scheduled_transactions').select('*').eq('status','scheduled').order('scheduled_for').limit(500));
}
export async function createScheduledTransaction(input, userId) {
  if (!userId) throw new Error('Sign in to schedule payments and transfers.');
  const type = input?.transaction_type;
  if (!['expense','transfer'].includes(type)) throw new Error('Choose a payment or transfer.');
  if (!input.account_id) throw new Error('Choose the account to use.');
  if (type === 'transfer' && (!input.transfer_to_account_id || input.transfer_to_account_id === input.account_id)) throw new Error('Choose a different destination account.');
  const title=String(input.title||'').trim();
  if(!title||title.length>160) throw new Error('Enter a description up to 160 characters.');
  const owned = unwrap(await client().from('financial_accounts').select('id,currency,account_type').eq('user_id',userId).in('id',[input.account_id,...(type==='transfer'?[input.transfer_to_account_id]:[])]));
  if ((owned || []).length !== (type==='transfer' ? 2 : 1) || owned.some(account => !['bank','e_wallet','cash'].includes(account.account_type))) throw new Error('Choose eligible bank, e-wallet or cash accounts belonging to your MOVO profile.');
  const currency = /^[A-Z]{3}$/.test(input.currency || '') ? input.currency : 'PHP';
  if (owned.some(account => account.currency !== currency)) throw new Error('The selected accounts must use the scheduled transaction currency.');
  const frequency=['once','weekly','monthly','yearly'].includes(input.frequency)?input.frequency:'once';
  return unwrap(await client().from('scheduled_transactions').insert({
    user_id:userId,title,transaction_type:type,amount:validAmount(input.amount),
    currency,
    account_id:input.account_id,transfer_to_account_id:type==='transfer'?input.transfer_to_account_id:null,
    scheduled_for:validDate(input.scheduled_for),frequency,status:'scheduled',
    category:String(input.category||'Other').slice(0,60),notes:String(input.notes||'').slice(0,500)||null,
  }).select().single());
}
export async function logScheduledTransaction(item, accountId = item.account_id, transferTo = item.transfer_to_account_id) {
  if (!item?.id) throw new Error('Scheduled transaction not found.');
  const occurrence = item.scheduled_for;
  const reference = `movo-schedule:${item.id}:${occurrence}`;
  let transaction = unwrap(await client().from('transactions').select('id').eq('schedule_id',item.id).eq('occurred_at',`${occurrence}T12:00:00+00:00`).maybeSingle());
  if (!transaction) {
    try {
      transaction = await createTransaction({
        transaction_type:item.transaction_type,amount:item.amount,currency:item.currency,merchant:item.title,
        category:item.category||'Other',account_id:accountId,transfer_to_account_id:item.transaction_type==='transfer'?transferTo:null,
        occurred_at:`${occurrence}T12:00:00Z`,source:'manual',external_reference:reference,schedule_id:item.id,
        note:item.notes||null,
      }, item.user_id);
    } catch (error) {
      // A concurrent tap may have won the unique schedule-occurrence index. Reuse that log.
      const existing = unwrap(await client().from('transactions').select('id').eq('schedule_id',item.id).eq('occurred_at',`${occurrence}T12:00:00+00:00`).maybeSingle());
      if (!existing) throw error;
      transaction = existing;
    }
  }
  const nextDate = nextScheduledDate(occurrence,item.frequency);\n  const recurring=item.frequency!=='once';
  const updated=await client().from('scheduled_transactions').update({
    scheduled_for:recurring?nextDate:occurrence,
    status:recurring?'scheduled':'completed',last_logged_at:new Date().toISOString(),last_transaction_id:transaction.id,
  }).eq('id',item.id).eq('status','scheduled').select().single();
  if(updated.error) throw updated.error;
  return transaction;
}
export async function cancelScheduledTransaction(id) {
  return unwrap(await client().from('scheduled_transactions').update({status:'cancelled'}).eq('id',id).eq('status','scheduled').select().single());
}
