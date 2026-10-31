import { supabase } from './supabaseClient';

const requireClient = () => {
  if (!supabase) throw new Error('MOVO cloud storage is not configured.');
  return supabase;
};
const unwrap = ({ data, error }) => { if (error) throw error; return data; };
const validName = value => {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name || name.length > 120) throw new Error('Name must be between 1 and 120 characters.');
  return name;
};
const validAmount = (value, label = 'Amount') => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n >= 1e16) throw new Error(`${label} must be greater than zero.`);
  return Math.round(n * 100) / 100;
};
const validCurrency = value => /^[A-Z]{3}$/.test(value || '') ? value : 'PHP';
const validDate = value => {
  if (!value) return null;
  if (Number.isNaN(Date.parse(value))) throw new Error('Enter a valid date.');
  return value;
};

/** List functions rely on RLS as the primary ownership boundary. */
export async function listAccountingPostings() {
  return unwrap(await requireClient().from('accounting_postings').select('id,account_id,signed_amount,currency,source_type,source_id,occurred_at').order('occurred_at', { ascending: false }).limit(5000)).then(rows => rows.map(row => ({ ...row, transaction_type: 'accounting_posting', amount: Math.abs(Number(row.signed_amount)), type: 'accounting_posting' })));
}

/** Non-cash accounting events that must appear in expense analytics without posting cash a second time. */
export async function listAccountingActivities() {
  const client = requireClient();
  const [loanResult, receivableResult] = await Promise.all([
    client.from('loan_events').select('id,event_type,amount,currency,occurred_at,note').in('event_type', ['interest_payment','fee']).order('occurred_at', { ascending: false }).limit(2000),
    client.from('receivable_events').select('id,event_type,amount,currency,occurred_at,note').eq('event_type', 'written_off').order('occurred_at', { ascending: false }).limit(2000),
  ]);
  if (loanResult.error) throw loanResult.error;
  if (receivableResult.error) throw receivableResult.error;
  const loanRows = (loanResult.data || []).map(row => ({ ...row, transaction_type: 'expense', type: 'expense', category: row.event_type === 'fee' ? 'Loan fees' : 'Interest', merchant: row.event_type === 'fee' ? 'Loan fee' : 'Loan interest', source: 'accounting_event', account_id: null, transfer_to_account_id: null }));
  const receivableRows = (receivableResult.data || []).map(row => ({ ...row, transaction_type: 'expense', type: 'expense', category: 'Bad debt', merchant: 'Receivable write-off', source: 'accounting_event', account_id: null, transfer_to_account_id: null }));
  return [...loanRows, ...receivableRows];
}

export async function listLoans() {
  return unwrap(await requireClient().from('financial_loans').select('*').order('created_at', { ascending: false }));
}
export async function createLoan(input, userId) {
  if (!userId) throw new Error('A signed-in user is required.');
  const principal = validAmount(input?.principal_amount, 'Principal');
  return unwrap(await requireClient().from('financial_loans').insert({
    user_id: userId, name: validName(input?.name), obligation_type: input?.obligation_type === 'debt' ? 'debt' : 'loan', opening_principal: principal, lender: typeof input?.lender === 'string' ? input.lender.trim().slice(0, 120) || null : null,
    currency: validCurrency(input?.currency), principal_amount: principal, outstanding_principal: principal,
    interest_rate: Math.max(0, Number(input?.interest_rate) || 0), due_date: validDate(input?.due_date),
    account_id: input?.account_id || null, notes: typeof input?.notes === 'string' ? input.notes.trim().slice(0, 2000) || null : null,
  }).select().single());
}
export async function listLoanEvents(loanId) {
  if (!loanId) throw new Error('A loan ID is required.');
  return unwrap(await requireClient().from('loan_events').select('*').eq('loan_id', loanId).order('occurred_at', { ascending: false }));
}
/** The SQL RPC locks the loan row and inserts the event + updates principal in one transaction. */
export async function recordLoanEvent(input) {
  const amount = validAmount(input?.amount);
  const types = ['borrowed', 'principal_increase', 'principal_payment', 'interest_payment', 'fee'];
  if (!types.includes(input?.event_type)) throw new Error('Choose a valid loan event.');
  if (!input?.loan_id) throw new Error('A loan is required.');
  return unwrap(await requireClient().rpc('record_loan_event', {
    p_loan_id: input.loan_id, p_event_type: input.event_type, p_amount: amount,
    p_currency: validCurrency(input.currency), p_account_id: input.account_id || null,
    p_transaction_id: input.transaction_id || null, p_occurred_at: validDate(input.occurred_at),
    p_note: typeof input.note === 'string' ? input.note.trim().slice(0, 1000) || null : null,
  }));
}

export async function listReceivables() {
  return unwrap(await requireClient().from('financial_receivables').select('*').order('created_at', { ascending: false }));
}
export async function createReceivable(input, userId) {
  if (!userId) throw new Error('A signed-in user is required.');
  const amount = validAmount(input?.opening_amount, 'Amount owed');
  return unwrap(await requireClient().from('financial_receivables').insert({
    user_id: userId, name: validName(input?.name), counterparty: typeof input?.counterparty === 'string' ? input.counterparty.trim().slice(0, 120) || null : null,
    reason: typeof input?.reason === 'string' ? input.reason.trim().slice(0, 500) || null : null,
    currency: validCurrency(input?.currency), opening_amount: amount, outstanding_amount: amount,
    due_date: validDate(input?.due_date), account_id: input?.account_id || null,
    notes: typeof input?.notes === 'string' ? input.notes.trim().slice(0, 2000) || null : null,
  }).select().single());
}
export async function listReceivableEvents(receivableId) {
  if (!receivableId) throw new Error('A receivable ID is required.');
  return unwrap(await requireClient().from('receivable_events').select('*').eq('receivable_id', receivableId).order('occurred_at', { ascending: false }));
}
export async function recordReceivableEvent(input) {
  const amount = validAmount(input?.amount);
  const types = ['lent', 'amount_increased', 'collected', 'written_off'];
  if (!types.includes(input?.event_type)) throw new Error('Choose a valid receivable event.');
  if (!input?.receivable_id) throw new Error('A receivable is required.');
  return unwrap(await requireClient().rpc('record_receivable_event', {
    p_receivable_id: input.receivable_id, p_event_type: input.event_type, p_amount: amount,
    p_currency: validCurrency(input.currency), p_account_id: input.account_id || null,
    p_transaction_id: input.transaction_id || null, p_occurred_at: validDate(input.occurred_at),
    p_note: typeof input.note === 'string' ? input.note.trim().slice(0, 1000) || null : null,
  }));
}

export async function listGoals() {
  return unwrap(await requireClient().from('savings_goals').select('*').order('created_at', { ascending: false }));
}
export async function createGoal(input, userId) {
  if (!userId) throw new Error('A signed-in user is required.');
  return unwrap(await requireClient().from('savings_goals').insert({
    user_id: userId, name: validName(input?.name), target_amount: validAmount(input?.target_amount, 'Target'),
    currency: validCurrency(input?.currency), target_date: validDate(input?.target_date),
    notes: typeof input?.notes === 'string' ? input.notes.trim().slice(0, 2000) || null : null,
  }).select().single());
}
export async function listGoalAllocations(goalId) {
  if (!goalId) throw new Error('A goal ID is required.');
  return unwrap(await requireClient().from('goal_allocations').select('*').eq('goal_id', goalId).order('created_at', { ascending: false }));
}
/** Server-side function locks the goal and prevents an allocation from exceeding eligible account funds. */
export async function allocateToGoal(input) {
  const amount = validAmount(input?.amount, 'Allocation');
  if (!input?.goal_id) throw new Error('A goal is required.');
  return unwrap(await requireClient().rpc('allocate_goal_funds', {
    p_goal_id: input.goal_id, p_amount: amount, p_currency: validCurrency(input.currency),
    p_account_id: input.account_id || null, p_transaction_id: input.transaction_id || null,
    p_note: typeof input.note === 'string' ? input.note.trim().slice(0, 1000) || null : null,
  }));
}
export async function releaseGoalAllocation(allocationId) {
  if (!allocationId) throw new Error('An allocation ID is required.');
  return unwrap(await requireClient().rpc('release_goal_allocation', { p_allocation_id: allocationId }));
}
