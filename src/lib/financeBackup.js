import { supabase } from './supabaseClient';
import { fetchAllRows } from './supabasePagination';
import { getLocalAttachment } from './localAttachments';
import { getLocalAccountQr } from './accountQrLocalStore';
import { getCustomStickers } from './stickers';

const MEDIA_DATA = /^data:(image\/(jpeg|png|webp|gif|avif)|application\/pdf);base64,[A-Za-z0-9+/]*={0,2}$/;
const toDataUrl = blob => new Promise((resolve, reject) => {
  const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob);
});

export const BACKUP_TABLES = ['financial_accounts','transactions','budgets','financial_bills','bill_occurrences','bill_payments',
  'accounting_postings','financial_loans','loan_events','financial_receivables','receivable_events','savings_goals',
  'goal_allocations','plan_funding_allocations','allocation_events','scheduled_transactions','payment_attempts',
  'payment_reminder_preferences','payment_reminder_events','user_preferences','movo_automation_inbox',
  'movo_ai_conversations','movo_ai_messages'];

export function parseFinanceBackup(text) {
  if (typeof text !== 'string' || text.length > 50 * 1024 * 1024) throw new Error('Backup must be 50 MB or smaller.');
  const data = JSON.parse(text, (key, value) => {
    if (['__proto__','constructor','prototype'].includes(key)) throw new Error('Invalid backup field.');
    return value;
  });
  if (data?.format !== 'movo-finance-backup' || data.version !== 1 || !Array.isArray(data.accounts) || !Array.isArray(data.transactions)
    || !data.tables || typeof data.tables !== 'object' || Array.isArray(data.tables)) throw new Error('Choose a MOVO financial backup.');
  for (const rows of [data.accounts, data.transactions, ...Object.values(data.tables)]) {
    if (!Array.isArray(rows) || rows.length > 100000 || rows.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error('Invalid backup records.');
  }
  const attachments = data.attachments || [];
  if (!Array.isArray(attachments) || attachments.length > 10000 || attachments.some(item => !item || typeof item.path !== 'string' || typeof item.dataUrl !== 'string' || !MEDIA_DATA.test(item.dataUrl))) throw new Error('Invalid backup attachments.');
  // This document is viewed locally. Never restore credentials, entitlements or executable settings.
  return { format: data.format, version: 1, exportedAt: data.exportedAt, accounts: data.accounts, transactions: data.transactions,
    attachments,
    tables: Object.fromEntries(Object.entries(data.tables).filter(([key]) => BACKUP_TABLES.includes(key) || key === 'local_preferences')) };
}
export async function createFinanceBackup(c) {
  const tables = {};
  if (c.cloudMode && c.session?.user?.id) {
    if (!supabase) throw new Error('Cloud is unavailable.');
    for (const table of BACKUP_TABLES) {
      // Owner RLS still applies. Do not silently skip failed pages or tables.
      tables[table] = await fetchAllRows(() => supabase.from(table).select('*').eq('user_id', c.session.user.id).order(table === 'user_preferences' || table === 'payment_reminder_preferences' ? 'user_id' : 'id'));
    }
  }
  // Everything shown in Home, Wallet, Transactions and Menu besides accounts and transactions (subscriptions,
  // plans, budgets, limits, card styles and payments, loyalty cards, archive, layouts...) lives in preferences.
  // The device's own copy is the freshest; device secrets and device state are left out.
  const { autoLogKey, devices, accountQrPending, pushed, ...preferences } = c.prefs || {};
  tables.local_preferences = [preferences];
  const attachments = [];
  let bytes = JSON.stringify(tables).length;
  const add = (path, dataUrl) => {
    if (!MEDIA_DATA.test(dataUrl || '')) throw new Error('Invalid attachment data.');
    bytes += dataUrl.length;
    if (bytes > 48 * 1024 * 1024) throw new Error('Backup must be 50 MB or smaller.');
    attachments.push({ path, dataUrl });
  };
  const readStorage = async (bucket, path) => {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error || !data) throw new Error('Could not download a backup attachment.');
    return toDataUrl(data);
  };
  // One unreadable file (deleted from the device, or a failed download) is counted and reported; it never
  // cancels the rest of the backup.
  let missingAttachments = 0;
  const attach = async (path, read) => {
    let data = null;
    try { data = await read(); } catch { data = null; }
    if (typeof data === 'string' && MEDIA_DATA.test(data)) add(path, data); else missingAttachments += 1;
  };
  const receipts = new Set([...(tables.transactions || []), ...(c.rawTxs || c.txs || [])].map(row => row.receipt_path).filter(Boolean));
  for (const path of receipts) {
    await attach(path, async () => (path.startsWith('localreceipt:') ? toDataUrl(await getLocalAttachment(path)) : readStorage('movo-receipts', path)));
  }
  for (const [id,path] of Object.entries(c.prefs?.accountQrCodes || {})) {
    if (!path) continue;
    await attach('qr:'+id, async () => (path.startsWith('data:') ? path : path.startsWith('localqr:') ? getLocalAccountQr(path.slice(8)) : readStorage('movo-account-qrs',path)));
  }
  if (c.sceneryPhoto) add('scenery',c.sceneryPhoto);
  for (const sticker of getCustomStickers()) if (MEDIA_DATA.test(sticker.src || '')) add('sticker:'+sticker.id,sticker.src);
  // The person's own rows (original amount, currency and category id), not the screen's converted copies, and
  // never cloud accounting activity, which is not a transaction.
  const transactions = (Array.isArray(c.rawTxs) ? c.rawTxs : c.txs || [])
    .filter(row => { const type = row?.transaction_type || row?.type; return !type || ['income', 'expense', 'transfer'].includes(type); });
  const backup = { format: 'movo-finance-backup', version: 1, exportedAt: new Date().toISOString(),
    accounts: c.accountsView || [], transactions, tables, attachments, missingAttachments };
  if (JSON.stringify(backup).length > 50 * 1024 * 1024) throw new Error('Backup must be 50 MB or smaller.');
  return backup;
}
