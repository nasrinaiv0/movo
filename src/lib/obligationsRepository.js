import { supabase } from './supabaseClient';
import { fetchAllRows } from './supabasePagination';
import { buildMonthlyInterestSchedule } from './loanInterest';

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
  return (await fetchAllRows(() => requireClient().from('accounting_postings').select('id,account_id,signed_amount,currency,source_type,source_id,occurred_at').order('occurred_at', { ascending: false }).order('id', { ascending: false }))).map(row => ({ ...row, transaction_type: 'accounting_posting', amount: Math.abs(Number(row.signed_amount)), type: 'accounting_posting' }));
}

/** Non-cash accounting events that must appear in expense analytics without posting cash a second time. */
export async function listAccountingActivities() {
  const client = requireClient();
  const [loanResult, receivableResult, allocationResult] = await Promise.all([
    fetchAllRows(() => client.from('loan_events').select('id,event_type,amount,currency,occurred_at,note').in('event_type', ['interest_payment','fee']).is('reversed_at', null).order('occurred_at', { ascending: false }).order('id', { ascending: false })).then(data => ({ data, error: null })),
    fetchAllRows(() => client.from('receivable_events').select('id,event_type,amount,currency,occurred_at,note').eq('event_type', 'written_off').is('reversed_at', null).order('occurred_at', { ascending: false }).order('id', { ascending: false })).then(data => ({ data, error: null })),
    fetchAllRows(() => client.from('allocation_events').select('id,allocation_id,source_type,source_id,source_name,account_id,event_type,amount,currency,note,occurred_at').order('occurred_at', { ascending: false }).order('id', { ascending: false })).then(data => ({ data, error: null })),
  ]);
  if (loanResult.error) throw loanResult.error;
  if (receivableResult.error) throw receivableResult.error;
  if (allocationResult.error) throw allocationResult.error;

  const allocationIds = [...new Set((allocationResult.data || []).map(row => row.allocation_id).filter(Boolean))];
  const [goalState, planState] = allocationIds.length ? await Promise.all([
    client.from('goal_allocations').select('id,status,amount').in('id', allocationIds),
    client.from('plan_funding_allocations').select('id,status,amount').in('id', allocationIds),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  if (goalState.error) throw goalState.error;
  if (planState.error) throw planState.error;
  const activeAllocations = new Set([...(goalState.data || []), ...(planState.data || [])]
    .filter(row => row.status === 'allocated' && Number(row.amount) > 0).map(row => row.id));

  const loanRows = (loanResult.data || []).map(row => ({ ...row, transaction_type: 'expense', type: 'expense', category: row.event_type === 'fee' ? 'Loan fees' : 'Interest', merchant: row.event_type === 'fee' ? 'Loan fee' : 'Loan interest', source: 'accounting_event', account_id: null, transfer_to_account_id: null }));
  const receivableRows = (receivableResult.data || []).map(row => ({ ...row, transaction_type: 'expense', type: 'expense', category: 'Bad debt', merchant: 'Receivable write-off', source: 'accounting_event', account_id: null, transfer_to_account_id: null }));
  const allocationRows = (allocationResult.data || []).map(row => ({
    ...row, transaction_type: 'allocation', type: 'allocation',
    category: row.event_type === 'allocated' ? 'Savings allocation' : 'Allocation release',
    merchant: row.event_type === 'allocated' ? `Allocated to ${row.source_name}` : row.event_type === 'auto_released' ? `Contingency release · ${row.source_name}` : `Released from ${row.source_name}`,
    source: 'allocation_event', source_account_id: row.account_id,
    can_reverse: row.event_type === 'allocated' && activeAllocations.has(row.allocation_id),
    account_id: null, transfer_to_account_id: null,
  }));
  return [...loanRows, ...receivableRows, ...allocationRows];
}

export async function listLoans() {
  return unwrap(await requireClient().from('financial_loans').select('*').order('created_at', { ascending: false }));
}
export async function createLoan(input, userId) {
  if (!userId) throw new Error('A signed-in user is required.');
  const principal = validAmount(input?.principal_amount, 'Principal');
  const newProceeds = input?.new_proceeds === true;
  const interestSchedule = buildMonthlyInterestSchedule(input?.inconsistent_interest, input?.interest_months, input?.monthly_interest_rates);
  if (newProceeds && !input?.account_id) throw new Error('Choose the account receiving the loan proceeds.');
  const client = requireClient();
  const loan = unwrap(await client.from('financial_loans').insert({
    user_id: userId, name: validName(input?.name), obligation_type: input?.obligation_type === 'debt' ? 'debt' : 'loan',
    opening_principal: newProceeds ? 0 : principal, lender: typeof input?.lender === 'string' ? input.lender.trim().slice(0, 120) || null : null,
    currency: validCurrency(input?.currency), principal_amount: principal, outstanding_principal: newProceeds ? 0 : principal,
    interest_rate: interestSchedule.length ? 0 : Math.max(0, Number(input?.interest_rate) || 0), interest_schedule: interestSchedule, due_date: validDate(input?.due_date),
    account_id: input?.account_id || null, notes: typeof input?.notes === 'string' ? input.notes.trim().slice(0, 2000) || null : null,
  }).select().single());
  if (!newProceeds) return loan;
  try {
    await recordLoanEvent({ loan_id: loan.id, event_type: 'borrowed', amount: principal, currency: loan.currency, account_id: input.account_id, note: 'Initial loan proceeds' });
    return loan;
  } catch (error) {
    await client.from('financial_loans').delete().eq('id', loan.id);
    throw error;
  }
}
export async function listLoanEvents(loanId) {
  if (!loanId) throw new Error('A loan ID is required.');
  return unwrap(await requireClient().from('loan_events').select('*').eq('loan_id', loanId).order('occurred_at', { ascending: false }));
}

/** Metadata edits preserve the posted principal and payment ledger. */
export async function updateLoan(loanId, input, userId) {
  if (!loanId || !userId) throw new Error('Sign in to edit this loan.');
  const rate = Number(input.interest_rate);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error('Enter an annual interest rate from 0 to 100.');
  const dueDate = input.due_date || null;
  if (dueDate && (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !Number.isFinite(Date.parse(dueDate)) || new Date(dueDate + 'T00:00:00Z').toISOString().slice(0, 10) !== dueDate)) throw new Error('Enter a valid due date.');
  const schedule = buildMonthlyInterestSchedule(input.inconsistent_interest, input.interest_months, input.monthly_interest_rates);
  return unwrap(await requireClient().from('financial_loans').update({
    name: validName(input.name), lender: String(input.lender || '').trim().slice(0, 120) || null,
    obligation_type: input.obligation_type === 'debt' ? 'debt' : 'loan',
    due_date: dueDate, interest_rate: schedule.length ? 0 : rate, interest_schedule: schedule,
    notes: String(input.notes || '').trim().slice(0, 2000) || null, updated_at: new Date().toISOString(),
  }).eq('id', loanId).eq('user_id', userId).neq('status', 'archived').select().single());
}

/** Soft deletion keeps posted cash movements and payment evidence intact. */
export async function deleteLoan(loanId, userId) {
  if (!loanId || !userId) throw new Error('Sign in to delete this loan.');
  return unwrap(await requireClient().from('financial_loans').update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', loanId).eq('user_id', userId).select().single());
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
  const newLending = input?.new_lending === true;
  if (newLending && !input?.account_id) throw new Error('Choose the account from which you are lending the money.');
  const client = requireClient();
  const receivable = unwrap(await client.from('financial_receivables').insert({
    user_id: userId, name: validName(input?.name), counterparty: typeof input?.counterparty === 'string' ? input.counterparty.trim().slice(0, 120) || null : null,
    reason: typeof input?.reason === 'string' ? input.reason.trim().slice(0, 500) || null : null,
    currency: validCurrency(input?.currency), opening_amount: amount, opening_outstanding_amount: newLending ? 0 : amount, outstanding_amount: newLending ? 0 : amount,
    due_date: validDate(input?.due_date), account_id: input?.account_id || null,
    notes: typeof input?.notes === 'string' ? input.notes.trim().slice(0, 2000) || null : null,
  }).select().single());
  if (!newLending) return receivable;
  try {
    await recordReceivableEvent({ receivable_id: receivable.id, event_type: 'lent', amount, currency: receivable.currency, account_id: input.account_id, note: 'Initial amount lent' });
    return receivable;
  } catch (error) {
    await client.from('financial_receivables').delete().eq('id', receivable.id);
    throw error;
  }
}
/** Edit receivable metadata only. Posted principal, currency and collection
 * events are accounting records, not editable form fields. */
export async function updateReceivable(receivableId, input, userId) {
  if (!receivableId || !userId) throw new Error('Sign in to edit this receivable.');
  const dueDate = input?.due_date || null;
  if (dueDate && (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)
    || !Number.isFinite(Date.parse(dueDate))
    || new Date(dueDate + 'T00:00:00Z').toISOString().slice(0, 10) !== dueDate)) {
    throw new Error('Enter a valid due date.');
  }
  const name = validName(input?.name);
  return unwrap(await requireClient().from('financial_receivables').update({
    name,
    counterparty: String(input?.counterparty || '').trim().slice(0, 120) || null,
    reason: String(input?.reason || '').trim().slice(0, 500) || null,
    due_date: dueDate,
    notes: String(input?.notes || '').trim().slice(0, 2000) || null,
    updated_at: new Date().toISOString(),
  }).eq('id', receivableId).eq('user_id', userId).neq('status', 'archived').select().single());
}

/** Soft-archive receivables. Never remove events or recorded account movements. */
export async function deleteReceivable(receivableId, userId) {
  if (!receivableId || !userId) throw new Error('Sign in to delete this receivable.');
  return unwrap(await requireClient().from('financial_receivables').update({
    status: 'archived', updated_at: new Date().toISOString(),
  }).eq('id', receivableId).eq('user_id', userId).neq('status', 'archived').select().single());
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


/** Account-backed plan reservations; these are earmarks, not cash transactions. */
export async function listPlanAllocations() {
  return unwrap(await requireClient().from('plan_funding_allocations').select('*').order('created_at', { ascending: false }).limit(2000));
}
export async function allocatePlanFunds(input) {
  const amount = validAmount(input?.amount, 'Allocation');
  if (!input?.plan_id || !input?.plan_name || !input?.account_id) throw new Error('A plan and funding account are required.');
  return unwrap(await requireClient().rpc('allocate_plan_funds', {
    p_plan_id: String(input.plan_id), p_plan_name: validName(input.plan_name),
    p_amount: amount, p_currency: validCurrency(input.currency),
    p_account_id: input.account_id,
    p_note: typeof input.note === 'string' ? input.note.trim().slice(0, 500) || null : null,
  }));
}
export async function releasePlanFundingAllocation(allocationId) {
  if (!allocationId) throw new Error('An allocation ID is required.');
  return unwrap(await requireClient().rpc('release_plan_funding_allocation', { p_allocation_id: allocationId }));
}
export async function reverseAllocationEvent(eventId) {
  if (!eventId) throw new Error('An allocation event ID is required.');
  return unwrap(await requireClient().rpc('reverse_allocation_event', { p_event_id: eventId }));
}
