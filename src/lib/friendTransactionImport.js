/** Consent-to-ledger mapping. Never use the sender's account, receipt, payment reference or other financial metadata. */
const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const TYPES = ['expense', 'income', 'transfer'];

export const friendImportReference = messageId => UUID.test(String(messageId || ''))
  ? 'movo-friend:' + String(messageId).toLowerCase() : '';

export function eligibleFriendImportAccounts(card, accounts = []) {
  if (!card || !/^[A-Z]{3}$/.test(String(card.currency || ''))) return [];
  return accounts.filter(account => account && !account.is_archived &&
    account.currency === card.currency &&
    ['bank', 'card', 'e_wallet', 'cash', 'investment', 'other'].includes(account.account_type));
}

export function friendImportAlreadySaved(records = [], messageId) {
  const ref = friendImportReference(messageId);
  return !!ref && records.some(record => String(record?.id || '').toLowerCase() === String(messageId).toLowerCase() ||
    record?.external_reference === ref);
}

export function prepareFriendImport({ message, connectionId, accountId, transferToAccountId = '', accounts = [] }) {
  const card = message?.card;
  const id = String(message?.id || '').toLowerCase();
  if (!UUID.test(id) || !UUID.test(String(connectionId || '')) ||
    message?.kind !== 'transaction' || !card || !TYPES.includes(card.type) ||
    !Number.isFinite(card.amount) || card.amount <= 0 || card.amount > 1e12 ||
    !/^[A-Z]{3}$/.test(String(card.currency || '')) ||
    !/^20\d{2}-\d{2}-\d{2}$/.test(String(card.date || ''))) return null;
  const parsed = new Date(card.date + 'T00:00:00Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== card.date) return null;
  const available = eligibleFriendImportAccounts(card, accounts);
  if (!available.some(a => a.id === accountId)) return null;
  if (card.type === 'transfer' && (transferToAccountId === accountId ||
    !available.some(a => a.id === transferToAccountId))) return null;
  const amount = Math.round(card.amount * 100) / 100;
  const merchant = typeof card.description === 'string' && card.description.trim()
    ? card.description.trim().slice(0, 100) : 'Shared transaction';
  return {
    messageId: id,
    connectionId: connectionId.toLowerCase(),
    shared: { amount, type: card.type, currency: card.currency, date: card.date },
    draft: {
      merchant, amount: String(amount), transaction_type: card.type,
      category: typeof card.category === 'string' && card.category.trim()
        ? card.category.trim().slice(0, 50) : 'other',
      account_id: accountId,
      transfer_to_account_id: card.type === 'transfer' ? transferToAccountId : '',
      occurred_at: card.date, time: '', note: '',
      source: '', ref: '', payment_reference: '', receipt_note: '',
      receipt_path: '', receipt_path_to_delete: '', receipt_file: null,
      subscriptionPaymentId: '',
    },
  };
}

export function sameImportedCard(draft, shared, selectedCurrency) {
  return !!shared && draft?.transaction_type === shared.type &&
    selectedCurrency === shared.currency && draft.occurred_at === shared.date &&
    Number.isFinite(Number(draft.amount)) &&
    Math.round(Number(draft.amount) * 100) === Math.round(shared.amount * 100);
}
