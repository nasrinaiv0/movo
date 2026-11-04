import { supabase } from './supabaseClient';

const unwrap = ({data,error}) => { if(error) throw error; return data; };
const db = () => { if(!supabase) throw new Error('MOVO cloud storage is not configured.'); return supabase; };

export async function recordPaymentAttempt(userId, input) {
  if(!userId) throw new Error('Sign in to save payment attempt history.');
  if(!['scheduled','bill','subscription','loan','credit_card'].includes(input?.source_type)) throw new Error('Choose a valid payment source.');
  if(!input.source_id || !/^\\d{4}-\\d{2}-\\d{2}$/.test(input.due_date||'')) throw new Error('The payment reference or due date is invalid.');
  if(!['failed','paid','cancelled'].includes(input.status)) throw new Error('Choose a valid payment status.');
  const amount=input.amount==null?null:Number(input.amount);
  if(amount!==null&&(!Number.isFinite(amount)||amount<=0)) throw new Error('Enter a valid payment amount.');
  const currency=/^[A-Z]{3}$/.test(input.currency||'PHP')?(input.currency||'PHP'):'PHP';
  return unwrap(await db().from('payment_attempts').insert({
    user_id:userId,source_type:input.source_type,source_id:String(input.source_id),
    due_date:input.due_date,status:input.status,amount,currency,
    account_id:input.account_id||null,note:String(input.note||'').trim().slice(0,500)||null,
  }).select().single());
}

export async function listPaymentAttempts(userId, limit=50) {
  if(!userId) return [];
  return unwrap(await db().from('payment_attempts').select('*').eq('user_id',userId)
    .order('created_at',{ascending:false}).limit(Math.max(1,Math.min(100,limit))))||[];
}
