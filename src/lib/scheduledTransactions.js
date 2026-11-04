import { supabase } from './supabaseClient';
import { createTransaction } from './financeRepository';

const client = () => { if (!supabase) throw new Error('MOVO cloud storage is not configured.'); return supabase; };
const unwrap = ({ data, error }) => { if (error) throw error; return data; };
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) && !Number.isNaN(Date.parse(value)) ? value : (() => { throw new Error('Choose a valid scheduled date.'); })();
const validAmount = value => { const n=Number(value); if(!Number.isFinite(n)||n<=0||n>=1e16) throw new Error('Enter an amount greater than zero.'); return Math.round(n*100)/100; };

export async function listScheduledTransactions() {
  return unwrap(await client().from('scheduled_transactions').select('*').in('status',['scheduled','due']).order('scheduled_for').limit(500));
}
export async function createScheduledTransaction(input, userId) {
  if (!userId) throw new Error('Sign in to schedule payments and transfers.');
  const type = input?.transaction_type;
  if (!['expense','transfer'].includes(type)) throw new Error('Choose a payment or transfer.');
  if (!input.account_id) throw new Error('Choose the account to use.');
  if (type === 'transfer' && (!input.transfer_to_account_id || input.transfer_to_account_id === input.account_id)) throw new Error('Choose a different destination account.');
  const title=String(input.title||'').trim();
  if(!title||title.length>160) throw new Error('Enter a description up to 160 characters.');
  const frequency=['once','weekly','monthly','yearly'].includes(input.frequency)?input.frequency:'once';
  return unwrap(await client().from('scheduled_transactions').insert({
    user_id:userId,title,transaction_type:type,amount:validAmount(input.amount),
    currency:/^[A-Z]{3}$/.test(input.currency||'')?input.currency:'PHP',
    account_id:input.account_id,transfer_to_account_id:type==='transfer'?input.transfer_to_account_id:null,
    scheduled_for:validDate(input.scheduled_for),frequency,status:'scheduled',
    category:String(input.category||'Other').slice(0,60),notes:String(input.notes||'').slice(0,500)||null,
  }).select().single());
}
export async function logScheduledTransaction(item, accountId = item.account_id, transferTo = item.transfer_to_account_id) {
  if (!item?.id) throw new Error('Scheduled transaction not found.');
  const occurrence = item.scheduled_for;
  const reference = `movo-schedule:${item.id}:${occurrence}`;
  const transaction = await createTransaction({
    transaction_type:item.transaction_type,amount:item.amount,currency:item.currency,merchant:item.title,
    category:item.category||'Other',account_id:accountId,transfer_to_account_id:item.transaction_type==='transfer'?transferTo:null,
    occurred_at:`${occurrence}T12:00:00`,source:'manual',external_reference:reference,
    note:item.notes||null,
  }, item.user_id);
  const next = new Date(`${occurrence}T12:00:00Z`);
  if(item.frequency==='weekly') next.setUTCDate(next.getUTCDate()+7);
  else if(item.frequency==='monthly') next.setUTCMonth(next.getUTCMonth()+1);
  else if(item.frequency==='yearly') next.setUTCFullYear(next.getUTCFullYear()+1);
  const recurring=item.frequency!=='once';
  const updated=await client().from('scheduled_transactions').update({
    scheduled_for:recurring?next.toISOString().slice(0,10):occurrence,
    status:recurring?'scheduled':'completed',last_logged_at:new Date().toISOString(),last_transaction_id:transaction.id,
  }).eq('id',item.id).eq('status','scheduled').select().single();
  if(updated.error) throw updated.error;
  return transaction;
}
export async function cancelScheduledTransaction(id) {
  return unwrap(await client().from('scheduled_transactions').update({status:'cancelled'}).eq('id',id).eq('status','scheduled').select().single());
}
