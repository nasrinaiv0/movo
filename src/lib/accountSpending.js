import { dayKey } from './format';

const cardKindOf = (account, prefs) => prefs?.accountStyles?.[account?.id]?.cardKind || account?.cardKind || 'debit';

/** Resolve the ledger accounts that represent one spendable source of funds. */
export function spendingAccountIds(account, accounts = [], prefs = {}) {
  if (!account?.id) return [];
  if (account.account_type === 'card' && cardKindOf(account, prefs) === 'credit') return [account.id];

  const links = prefs.cardBankLinks || {};
  const bankId = account.account_type === 'bank'
    ? account.id
    : account.account_type === 'card' && cardKindOf(account, prefs) === 'debit'
      ? links[account.id] || account.linkedAccountId || ''
      : '';
  const bank = accounts.find(item => item.id === bankId && item.account_type === 'bank');
  if (!bank) return [account.id];

  const linkedDebitIds = accounts
    .filter(item => item.account_type === 'card'
      && (links[item.id] || item.linkedAccountId || '') === bank.id
      && cardKindOf(item, prefs) === 'debit')
    .map(item => item.id);
  return [...new Set([bank.id, ...linkedDebitIds])];
}

/** Ten local-calendar days of expenses for the account's real funding source, in the app reporting currency. */
export function accountSpendingHistory({ account, accounts = [], prefs = {}, transactions = [], days = 10, now = new Date() }) {
  const count = Math.max(1, Math.min(90, Math.floor(Number(days) || 10)));
  const dates = [];
  const today = new Date(now);
  today.setHours(12, 0, 0, 0);
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    dates.push({ key: dayKey(date), total: 0 });
  }
  const allowed = new Set(spendingAccountIds(account, accounts, prefs));
  const byDay = new Map(dates.map(day => [day.key, day]));
  (Array.isArray(transactions) ? transactions : []).forEach(item => {
    if (!allowed.has(item.account_id) || (item.type !== 'expense' && item.transaction_type !== 'expense')) return;
    const timestamp = Date.parse(item.date || item.occurred_at || '');
    if (!Number.isFinite(timestamp)) return;
    const day = byDay.get(dayKey(timestamp));
    const amount = Number(item.amount);
    if (day && Number.isFinite(amount) && amount > 0) day.total += amount;
  });
  return dates;
}
