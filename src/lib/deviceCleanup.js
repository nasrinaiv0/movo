import { preservePreferenceCopy } from './ownerPreferences';

const GUEST_WALLET = new Set(['movo.local.accounts.v1', 'movo.local.transactions.v1', 'movo.samples.enabled.v1']);

/** Keep unrelated device copies when resetting one account. No persisted format changes. */
export function preserveDeviceCopy(key, ownerId) {
  if (preservePreferenceCopy(key, ownerId) || key.startsWith('sb-')) return true;
  if (ownerId !== null && GUEST_WALLET.has(key)) return true;
  for (const prefix of ['movo.offline.workspace.v2.', 'movo.ai.ack.v1.', 'movo.profile-photo.v1.']) {
    if (key.startsWith(prefix)) return ownerId === null || key !== prefix + ownerId;
  }
  if (key.startsWith('movo.chatHistory.v1:')) {
    const scope = ownerId === null ? 'guest' : 'user.' + ownerId;
    return !key.startsWith('movo.chatHistory.v1:' + scope + ':') &&
      !(ownerId !== null && key.startsWith('movo.chatHistory.v1:' + ownerId + ':'));
  }
  if (key.startsWith('movo.ai.active.v1.')) {
    const scope = ownerId === null ? 'guest' : 'user.' + ownerId;
    return !key.startsWith('movo.ai.active.v1.' + scope + '.');
  }
  if (key.startsWith('movo.referralRedemption.v1.')) return ownerId === null || !key.startsWith('movo.referralRedemption.v1.' + ownerId + '.');
  for (const prefix of ['movo.readCache.v1:']) {
    if (key.startsWith(prefix)) return ownerId === null || !key.startsWith(prefix + ownerId + ':');
  }
  return false;
}

/** Capture references before resetting the visible rows or deleting cloud records.
 * Unreferenced legacy attachments have no ownership proof and are left untouched.
 */
export function collectDeviceFiles(ownerId, { accounts = [], transactions = [], prefs = {}, workspace } = {}) {
  const owned = row => row && (!row.user_id || row.user_id === ownerId);
  const accountIds = new Set();
  const receiptKeys = new Set();
  const addAccounts = rows => (Array.isArray(rows) ? rows : []).filter(owned).forEach(row => {
    if (typeof row.id === 'string' && row.id && row.id.length <= 128) accountIds.add(row.id);
  });
  const addTransactions = rows => (Array.isArray(rows) ? rows : []).filter(owned).forEach(row => {
    if (typeof row.receipt_path === 'string' && row.receipt_path.startsWith('localreceipt:') && row.receipt_path.length <= 512) receiptKeys.add(row.receipt_path);
  });
  addAccounts(accounts); addTransactions(transactions);
  if (ownerId && workspace?.owner === ownerId) {
    for (const groups of [workspace.baseline, workspace.working]) {
      addAccounts(groups?.financial_accounts); addTransactions(groups?.transactions);
    }
  }
  addTransactions((Array.isArray(prefs.archive) ? prefs.archive : []).filter(entry => entry?.kind === 'transaction').map(entry => entry.item));
  for (const id of Object.keys(prefs.accountQrCodes || {})) {
    if (id && id.length <= 128) accountIds.add(id);
  }
  return { accountIds: [...accountIds], receiptKeys: [...receiptKeys] };
}
