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
