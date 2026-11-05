import { supabase } from './supabaseClient';

const unwrap = ({data,error}) => { if(error) throw error; return data; };
const db = () => { if(!supabase) throw new Error('MOVO cloud storage is not configured.'); return supabase; };

export async function recordPaymentAttempt(userId, input) {
  if(!userId) throw new Error('Sign in to save payment attempt history.');
  if(!['scheduled','bill','subscription','loan','credit_card','receivable'].includes(input?.source_type)) throw new Error('Choose a valid payment source.');
  const dueDate=String(input.due_date||''); const parsedDate=new Date(dueDate+'T00:00:00Z');
  if(!input.source_id || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dueDate) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0,10)!==dueDate) throw new Error('The payment reference or due date is invalid.');
  if(!['failed','paid','cancelled'].includes(input.status)) throw new Error('Choose a valid payment status.');
  const amount=input.amount==null?null:Number(input.amount);
  if(amount!==null&&(!Number.isFinite(amount)||amount<=0)) throw new Error('Enter a valid payment amount.');
  if(input.account_id){
    const owned=unwrap(await db().from('financial_accounts').select('id').eq('id',input.account_id).eq('user_id',userId).maybeSingle());
    if(!owned)throw new Error('Choose an account belonging to your MOVO profile.');
  }
  const currency=String(input.currency||'PHP').toUpperCase();
  if(!/^[A-Z]{3}$/.test(currency))throw new Error('Choose a valid payment currency.');
  const nextDueDate = input.next_due_date == null ? null : String(input.next_due_date);
  if (nextDueDate && (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(nextDueDate) || Number.isNaN(Date.parse(nextDueDate+'T00:00:00Z')))) throw new Error('The next billing date is invalid.');
  const attemptedAt = input.attempted_at == null ? new Date().toISOString() : String(input.attempted_at);
  if (Number.isNaN(Date.parse(attemptedAt))) throw new Error('The payment timestamp is invalid.');
  const previousState = input.previous_state && typeof input.previous_state === 'object' && !Array.isArray(input.previous_state)
    ? {
        start: String(input.previous_state.start || dueDate),
        lastPaidAt: input.previous_state.lastPaidAt ?? null,
        lastPaidAmount: input.previous_state.lastPaidAmount == null ? null : Number(input.previous_state.lastPaidAmount),
        lastPaidCurrency: input.previous_state.lastPaidCurrency == null ? null : String(input.previous_state.lastPaidCurrency).toUpperCase(),
      }
    : null;
  if (input.transaction_id) {
    const ownedTransaction = unwrap(await db().from('transactions').select('id').eq('id', input.transaction_id).eq('user_id', userId).maybeSingle());
    if (!ownedTransaction) throw new Error('Choose a transaction belonging to your MOVO profile.');
  }
  return unwrap(await db().from('payment_attempts').insert({
    user_id:userId,source_type:input.source_type,source_id:String(input.source_id),
    due_date:input.due_date,next_due_date:nextDueDate,transaction_id:input.transaction_id||null,
    attempted_at:attemptedAt,previous_state:previousState,
    status:input.status,amount,currency,
    account_id:input.account_id||null,note:String(input.note||'').trim().slice(0,500)||null,
  }).select().single());
}

export async function listPaymentAttempts(userId, limit=50) {
  if(!userId) return [];
  return unwrap(await db().from('payment_attempts').select('*').eq('user_id',userId)
    .order('created_at',{ascending:false}).limit(Math.max(1,Math.min(100,limit))))||[];
}
