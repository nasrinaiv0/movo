import { supabase } from './supabaseClient';
import { BILL_CATEGORIES, BILL_FREQUENCIES } from './bills';

const requireClient = () => { if (!supabase) throw new Error('MOVO cloud storage is not configured.'); return supabase; };
const unwrap = ({ data, error }) => { if (error) throw error; return data; };
const FREQ = BILL_FREQUENCIES.map(([k]) => k);

export function validateBill(input) {
  const name = String(input?.name || '').trim();
  if (!name || name.length > 120) throw new Error('Name must be between 1 and 120 characters.');
  const amount = Number(input?.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount >= 1e16) throw new Error('Amount must be greater than zero.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input?.first_due_date || '') || Number.isNaN(Date.parse(input.first_due_date))) throw new Error('Enter a valid due date.');
  const frequency = FREQ.includes(input?.frequency) ? input.frequency : 'monthly';
  const category = BILL_CATEGORIES.includes(input?.category) ? input.category : (String(input?.category || '').trim().slice(0, 60) || 'Other');
  const reminder_days = [...new Set((input?.reminder_days || [3, 1, 0]).map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 30))].slice(0, 6);
  return {
    name, category, amount: Math.round(amount * 100) / 100, amount_type: input?.amount_type === 'variable' ? 'variable' : 'fixed',
    currency: /^[A-Z]{3}$/.test(input?.currency || '') ? input.currency : 'PHP', frequency, first_due_date: input.first_due_date,
    account_id: input?.account_id || null, reminder_days, notes: input?.notes ? String(input.notes).slice(0, 1000) : null,
  };
}

export async function createBill(input, userId) {
  return unwrap(await requireClient().from('financial_bills').insert({ ...validateBill(input), user_id: userId }).select().single());
}
export async function setBillStatus(id, status) {
  if (!['active', 'paused', 'cancelled'].includes(status)) throw new Error('Invalid bill status.');
  return unwrap(await requireClient().from('financial_bills').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select().single());
}
export async function listBills() {
  return unwrap(await requireClient().from('financial_bills').select('*').order('created_at', { ascending: false }).limit(500));
}
/** Generates missing occurrences (server side, idempotent) and returns the recent and upcoming ones. */
export async function listOccurrences(until, since) {
  const client = requireClient();
  unwrap(await client.rpc('ensure_bill_occurrences', { p_until: until }));
  return unwrap(await client.from('bill_occurrences').select('*').gte('due_date', since).lte('due_date', until).order('due_date').limit(2000));
}
export async function listBillPayments(since) {
  return unwrap(await requireClient().from('bill_payments').select('id,occurrence_id,amount,currency,method,account_id,transaction_id,paid_at').gte('paid_at', since).order('paid_at', { ascending: false }).limit(2000));
}
/** method 'recorded' needs an account and creates one expense; 'external' only reconciles. */
export async function recordBillPayment({ occurrence_id, amount, method = 'recorded', account_id = null, transaction_id = null, paid_at = null, note = null, key }) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) throw new Error('Amount must be greater than zero.');
  if (method === 'recorded' && !account_id) throw new Error('Choose the account you paid from.');
  return unwrap(await requireClient().rpc('record_bill_payment', {
    p_occurrence_id: occurrence_id, p_amount: Math.round(n * 100) / 100, p_idempotency_key: key, p_method: method,
    p_account_id: account_id, p_transaction_id: transaction_id, p_paid_at: paid_at, p_note: note,
  }));
}
export async function updateOccurrence(id, { actual_amount = null, late_fee = null, cancel = false }) {
  return unwrap(await requireClient().rpc('update_bill_occurrence', { p_occurrence_id: id, p_actual_amount: actual_amount, p_late_fee: late_fee, p_cancel: cancel }));
}
