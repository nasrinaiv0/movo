/**
 * Memberships and non-cash reward tokens are not financial accounts.
 * Keep them isolated from account balances, spendable funds and transaction/payment sources.
 */
export const LOYALTY_TYPES = ['membership', 'tokens'];
export const isLoyaltyType = (type) => LOYALTY_TYPES.includes(type);

export const LOYALTY_PROVIDERS = [
  'Petron', 'Seaoil', 'Shell', 'Caltex',
  'Starbucks', 'Tim Hortons', 'Coffee Bean & Tea Leaf',
  'SM Advantage', 'Watsons', 'Landers', 'Robinsons Rewards',
  'Mercury Drug Suki', '7-Eleven', 'Jollibee', 'McDonald’s', 'Other'
];

const trimmed = (value, maximum) => String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, maximum);
const validDate = (value) => {
  const date = trimmed(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() + 1 === month && parsed.getUTCDate() === day ? date : '';
};

export function normalizeLoyaltyCard(input) {
  if (!isLoyaltyType(input?.type)) throw new Error('invalid_loyalty_type');
  const name = trimmed(input.name, 100);
  if (!name) throw new Error('loyalty_provider_required');
  const pointsText = trimmed(input.points, 26);
  if (pointsText && (!/^\d{1,12}(?:\.\d{1,2})?$/.test(pointsText) || !Number.isFinite(Number(pointsText)))) {
    throw new Error('invalid_loyalty_points');
  }
  return {
    id: trimmed(input.id, 100),
    type: input.type,
    name,
    program: trimmed(input.program || name, 100),
    memberNumber: trimmed(input.memberNumber, 100),
    barcode: trimmed(input.barcode, 160),
    points: pointsText,
    pointsUnit: trimmed(input.pointsUnit || (input.type === 'tokens' ? 'tokens' : 'points'), 32),
    expiryDate: input.noExpiry ? '' : validDate(input.expiryDate),
    noExpiry: Boolean(input.noExpiry),
    pointsExpiry: validDate(input.pointsExpiry),
    note: trimmed(input.note, 300),
  };
}

export function visibleLoyaltyCards(prefs) {
  return (Array.isArray(prefs?.membershipCards) ? prefs.membershipCards : [])
    .filter(card => card && typeof card.id === 'string' && card.name)
    .map(card => ({ ...card, type: isLoyaltyType(card.type) ? card.type : 'membership' }));
}

export function safeLoyaltyPoints(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1e12 ? parsed : 0;
}

export const maskedMembershipNumber = value => {
  const text = String(value || '');
  if (text.length < 5) return text ? '••••' : '';
  return '•••• ' + text.slice(-4);
};

/** Stable, reversible estimated rewards derived from logged purchases; never booked as cash. */
export function estimateLoyaltyRewards(transactions = [], accounts = [], cards = [], rules = {}) {
  const permittedAccounts = new Set((Array.isArray(accounts) ? accounts : [])
    .filter(account => account && !account.is_archived && ['bank', 'card', 'e_wallet', 'cash'].includes(account.account_type))
    .map(account => account.id));
  const output = [];
  for (const card of cards) {
    const rule = rules[card.id];
    if (!rule?.enabled || !rule?.accountId || !permittedAccounts.has(rule.accountId)) continue;
    const keyword = String(rule.merchantContains || '').trim().toLocaleLowerCase();
    const rate = Number(rule.pointsPer100);
    if (keyword.length < 2 || keyword.length > 100 || !Number.isFinite(rate) || rate <= 0 || rate > 100000) continue;
    const currency = String(rule.currency || '').toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) continue;
    for (const tx of transactions) {
      if (!tx?.id || !['expense'].includes(tx.type || tx.transaction_type) || tx.account_id !== rule.accountId) continue;
      if (!String(tx.merchant || '').toLocaleLowerCase().includes(keyword)) continue;
      if (String(tx.currency || currency).toUpperCase() !== currency) continue;
      const amount = Number(tx.amount);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      const earned = Math.floor((amount * rate / 100 + Number.EPSILON) * 100) / 100;
      if (earned <= 0 || earned > 1e12) continue;
      output.push({
        id: 'reward-' + card.id + '-' + tx.id, cardId: card.id, transactionId: tx.id,
        accountId: tx.account_id, merchant: tx.merchant,
        date: tx.date || tx.occurred_at || '', currency, points: earned,
        unit: card.pointsUnit || (card.type === 'tokens' ? 'tokens' : 'points'),
        status: 'Estimated',
      });
    }
  }
  return output;
}

export function estimatedLoyaltyTotals(entries = []) {
  return entries.reduce((totals, entry) => {
    const value = Number(entry.points);
    if (typeof entry.cardId === 'string' && Number.isFinite(value) && value > 0) {
      totals[entry.cardId] = Math.round(((totals[entry.cardId] || 0) + value) * 100) / 100;
    }
    return totals;
  }, {});
}
