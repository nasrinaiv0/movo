import { supabase } from './supabaseClient';

const requireClient = () => {
  if (!supabase) throw new Error('MOVO cloud storage is not configured. Add the MOVO Supabase URL and publishable key.');
  return supabase;
};
const unwrap = ({ data, error }) => { if (error) throw error; return data; };

export async function getCurrentSession() {
  return unwrap(await requireClient().auth.getSession())?.session ?? null;
}
export async function signInWithPassword(email, password) {
  return unwrap(await requireClient().auth.signInWithPassword({ email: email.trim(), password }));
}
export async function signInWithGoogle() {
  const client = requireClient();
  const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
  return unwrap(await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      ...(redirectTo ? { redirectTo } : {}),
      queryParams: { prompt: 'select_account' },
    },
  }));
}
export async function signUpWithPassword(email, password, displayName = '') {
  return unwrap(await requireClient().auth.signUp({
    email: email.trim(),
    password,
    options: { data: { full_name: displayName.trim().slice(0, 100) } },
  }));
}
export async function signOut() { return unwrap(await requireClient().auth.signOut()); }

export async function listAccounts() {
  return unwrap(await requireClient().from('financial_accounts')
    .select('id,name,account_type,institution_name,currency,opening_balance,is_archived,display_order,created_at')
    .order('display_order', { ascending: true }).order('created_at', { ascending: true }));
}
export async function createAccount(account, userId) {
  if (!userId) throw new Error('A signed-in user is required.');
  const name = typeof account?.name === 'string' ? account.name.trim() : '';
  const openingBalance = Number(account?.opening_balance ?? 0);
  if (!name || name.length > 100) throw new Error('Account name must be between 1 and 100 characters.');
  if (!Number.isFinite(openingBalance) || Math.abs(openingBalance) >= 1e17) throw new Error('Enter a valid opening balance.');
  const allowedTypes = ['bank', 'card', 'e_wallet', 'cash', 'investment', 'other'];
  const accountType = allowedTypes.includes(account.account_type) ? account.account_type : 'other';
  return unwrap(await requireClient().from('financial_accounts').insert({
    user_id: userId, name, account_type: accountType,
    institution_name: typeof account.institution_name === 'string' ? account.institution_name.trim().slice(0, 100) || null : null,
    currency: /^[A-Z]{3}$/.test(account.currency || 'PHP') ? (account.currency || 'PHP') : 'PHP',
    opening_balance: Math.round(openingBalance * 100) / 100,
  }).select().single());
}
export async function listTransactions({ from, to, accountId } = {}) {
  let query = requireClient().from('transactions')
    .select('id,account_id,transfer_to_account_id,transaction_type,amount,currency,merchant,category,note,occurred_at,source,external_reference,is_pending,created_at')
    .order('occurred_at', { ascending: false }).limit(1000);
  if (from) query = query.gte('occurred_at', from);
  if (to) query = query.lt('occurred_at', to);
  if (accountId) query = query.eq('account_id', accountId);
  return unwrap(await query);
}
export async function createTransaction(transaction, userId) {
  if (!userId) throw new Error('A signed-in user is required.');
  const amount = Number(transaction?.amount);
  const merchant = typeof transaction?.merchant === 'string' ? transaction.merchant.trim() : '';
  const type = transaction?.transaction_type;
  if (!Number.isFinite(amount) || amount <= 0 || amount >= 1e17) throw new Error('Transaction amount must be greater than zero.');
  if (!merchant || merchant.length > 160) throw new Error('Description must be between 1 and 160 characters.');
  if (!['income', 'expense', 'transfer'].includes(type)) throw new Error('Choose a valid transaction type.');
  if (!transaction.account_id) throw new Error('Choose an account for this transaction.');
  if (type === 'transfer' && (!transaction.transfer_to_account_id || transaction.transfer_to_account_id === transaction.account_id)) throw new Error('Transfers need two different accounts.');
  if (type !== 'transfer' && transaction.transfer_to_account_id) throw new Error('Only transfers can have a destination account.');
  const currency = /^[A-Z]{3}$/.test(transaction.currency || 'PHP') ? (transaction.currency || 'PHP') : 'PHP';
  const occurredAt = transaction.occurred_at || new Date().toISOString();
  if (Number.isNaN(Date.parse(occurredAt))) throw new Error('Enter a valid transaction date.');
  return unwrap(await requireClient().from('transactions').insert({
    user_id: userId, account_id: transaction.account_id,
    transfer_to_account_id: type === 'transfer' ? transaction.transfer_to_account_id : null,
    transaction_type: type, amount: Math.round(amount * 100) / 100, currency, merchant,
    category: typeof transaction.category === 'string' ? transaction.category.trim().slice(0, 60) || 'Other' : 'Other',
    note: typeof transaction.note === 'string' ? transaction.note.trim().slice(0, 1000) || null : null,
    occurred_at: occurredAt,
    source: ['manual', 'csv_import', 'bank_sync', 'notification', 'apple_pay_export', 'other'].includes(transaction.source) ? transaction.source : 'manual',
    external_reference: typeof transaction.external_reference === 'string' ? transaction.external_reference.slice(0, 200) || null : null,
  }).select().single());
}
export async function deleteTransaction(transactionId) {
  if (typeof transactionId !== 'string' || !transactionId) throw new Error('A transaction ID is required.');
  return unwrap(await requireClient().from('transactions').delete().eq('id', transactionId).select('id').single());
}
export function watchAuth(callback) {
  return requireClient().auth.onAuthStateChange((_event, session) => callback(session));
}

export async function updateTransaction(transactionId, transaction) {
  if (typeof transactionId !== 'string' || !transactionId) throw new Error('A transaction ID is required.');
  const amount = Number(transaction?.amount);
  const merchant = typeof transaction?.merchant === 'string' ? transaction.merchant.trim() : '';
  const type = transaction?.transaction_type;
  if (!Number.isFinite(amount) || amount <= 0 || amount >= 1e17) throw new Error('Transaction amount must be greater than zero.');
  if (!merchant || merchant.length > 160) throw new Error('Description must be between 1 and 160 characters.');
  if (!['income', 'expense', 'transfer'].includes(type)) throw new Error('Choose a valid transaction type.');
  if (!transaction.account_id) throw new Error('Choose an account for this transaction.');
  if (type === 'transfer' && (!transaction.transfer_to_account_id || transaction.transfer_to_account_id === transaction.account_id)) throw new Error('Transfers need two different accounts.');
  if (type !== 'transfer' && transaction.transfer_to_account_id) throw new Error('Only transfers can have a destination account.');
  const currency = /^[A-Z]{3}$/.test(transaction.currency || 'PHP') ? (transaction.currency || 'PHP') : 'PHP';
  const occurredAt = transaction.occurred_at || new Date().toISOString();
  if (Number.isNaN(Date.parse(occurredAt))) throw new Error('Enter a valid transaction date.');
  return unwrap(await requireClient().from('transactions').update({
    account_id: transaction.account_id,
    transfer_to_account_id: type === 'transfer' ? transaction.transfer_to_account_id : null,
    transaction_type: type, amount: Math.round(amount * 100) / 100, currency, merchant,
    category: typeof transaction.category === 'string' ? transaction.category.trim().slice(0, 60) || 'Other' : 'Other',
    note: typeof transaction.note === 'string' ? transaction.note.trim().slice(0, 1000) || null : null,
    occurred_at: occurredAt,
  }).eq('id', transactionId).select().single());
}

export async function updateAccount(accountId, account) {
  if (typeof accountId !== 'string' || !accountId) throw new Error('An account ID is required.');
  const update = {};
  if (typeof account?.name === 'string') {
    const name = account.name.trim();
    if (!name || name.length > 100) throw new Error('Account name must be between 1 and 100 characters.');
    update.name = name;
  }
  if (account?.account_type !== undefined) {
    const allowedTypes = ['bank', 'card', 'e_wallet', 'cash', 'investment', 'other'];
    if (!allowedTypes.includes(account.account_type)) throw new Error('Choose a valid account type.');
    update.account_type = account.account_type;
  }
  if (account?.institution_name !== undefined) {
    update.institution_name = typeof account.institution_name === 'string' ? account.institution_name.trim().slice(0, 100) || null : null;
  }
  if (account?.opening_balance !== undefined) {
    const openingBalance = Number(account.opening_balance);
    if (!Number.isFinite(openingBalance) || Math.abs(openingBalance) >= 1e17) throw new Error('Enter a valid opening balance.');
    update.opening_balance = Math.round(openingBalance * 100) / 100;
  }
  if (typeof account?.is_archived === 'boolean') update.is_archived = account.is_archived;
  if (!Object.keys(update).length) throw new Error('Provide at least one account change.');
  return unwrap(await requireClient().from('financial_accounts').update(update).eq('id', accountId).select().single());
}

const validBudget = (category, limit) => {
  const name = typeof category === 'string' ? category.trim() : '';
  const amount = Number(limit);
  if (!name || name.length > 60) throw new Error('Choose a budget category.');
  if (!Number.isFinite(amount) || amount <= 0 || amount >= 1e17) throw new Error('Budget limit must be greater than zero.');
  return { category: name, monthly_limit: Math.round(amount * 100) / 100 };
};
export async function listBudgets() {
  return unwrap(await requireClient().from('budgets')
    .select('id,category,monthly_limit,currency,starts_on,is_active').eq('is_active', true).order('category', { ascending: true }));
}
export async function createBudget(budget, userId) {
  if (!userId) throw new Error('A signed-in user is required.');
  const now = new Date(); const startsOn = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  // Re-adding a category removed earlier this month reactivates that row instead of hitting the unique constraint.
  return unwrap(await requireClient().from('budgets').upsert({ user_id: userId, ...validBudget(budget?.category, budget?.monthly_limit), currency: 'PHP', starts_on: startsOn, is_active: true }, { onConflict: 'user_id,category,starts_on' }).select().single());
}
export async function updateBudget(budgetId, budget) {
  if (typeof budgetId !== 'string' || !budgetId) throw new Error('A budget ID is required.');
  return unwrap(await requireClient().from('budgets').update(validBudget(budget?.category, budget?.monthly_limit)).eq('id', budgetId).select().single());
}
export async function removeBudget(budgetId) {
  if (typeof budgetId !== 'string' || !budgetId) throw new Error('A budget ID is required.');
  return unwrap(await requireClient().from('budgets').update({ is_active: false }).eq('id', budgetId).select().single());
}
