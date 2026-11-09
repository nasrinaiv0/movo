/*
 * Restoring the rest of a MOVO backup on another device: everything people keep in Home, Wallet, Transactions
 * and Menu besides accounts and transactions — subscriptions, savings plans and their allocations, budgets,
 * spending limits, card looks and links, credit-card payments and credit logs, loyalty cards, cashback, the
 * Archive, watchlists, layouts, profile and personalisation.
 *
 * The file is untrusted: only known keys are read, values are type-checked and size-capped, and device secrets or
 * device state (automation key, device list, notification read marks, Cloud Sync choice, onboarding) are never
 * restored. Account references are re-pointed to this device's accounts through the id map from the account
 * restore; entries for accounts that were not restored are dropped. Nothing already on this device is overwritten:
 * lists are merged by id, per-account settings keep this device's value, and personal settings are only filled in
 * where this device still has its default.
 */

const LIST_CAP = 5000;
const ACCOUNT_REF_KEYS = new Set(['account_id', 'accountId', 'transfer_to_account_id', 'issuerBankId', 'linkedBankId',
  'loggedAccountId', 'linkedAccountId', 'payment_account_id', 'paymentAccountId', 'source_account_id']);
// Maps keyed by account id: the restored account's entry is added unless this device already has one.
const ACCOUNT_MAPS = ['accountStyles', 'cardStyles', 'cardNetworks', 'cardDisplayModes', 'cardDisplayFields'];
// Maps keyed by account id whose values are lists merged by id.
const ACCOUNT_LIST_MAPS = ['creditCardPayments', 'creditSpendLogs'];
// Lists of records with ids.
const LISTS = ['subscriptions', 'plans', 'spendingLimits', 'budgets', 'membershipCards', 'cashbackEntries', 'cryptoAlerts',
  'cryptoHoldings', 'archive'];
const STRING_LISTS = ['cryptoWatchlist', 'stockWatchlist', 'fxPairs'];
const PLAIN_MAPS = ['loyaltyRewardRules', 'cashbackRules'];
// Personal settings: copied only where this device still has the default.
const SETTINGS = {
  theme: 'string', accent: 'string', customColor: 'string', glass: 'boolean', clarity: 'number', sceneryVisibility: 'number',
  compact: 'boolean', fontStyle: 'string', fontSize: 'string', categoryColors: 'boolean', showBalance: 'boolean',
  showBalanceAfterTransaction: 'boolean', language: 'string', currency: 'string', country: 'string', profileName: 'string',
  phone: 'string', location: 'string', mascotStyle: 'string', briefing: 'boolean', autocat: 'boolean', walletView: 'object',
  layouts: 'object', scenery: 'string',
};
const IMAGE_DATA = /^data:image\/(jpeg|png|webp|gif|avif);base64,[A-Za-z0-9+/]*={0,2}$/;
const IMAGE_SETTINGS = ['profilePhoto', 'mascot'];

const isPlainObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
const clone = value => JSON.parse(JSON.stringify(value));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Re-point every account reference inside a record to this device's account (or clear it). */
function remapRefs(value, map, depth = 0) {
  if (depth > 8) return value;
  if (Array.isArray(value)) {
    const out = [];
    for (const item of value) out.push(remapRefs(item, map, depth + 1));
    return out;
  }
  if (!isPlainObject(value)) return value;
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (ACCOUNT_REF_KEYS.has(key) && typeof item === 'string' && item && item !== 'local') {
      // A link to an account that was not restored is cleared, never pointed at a different account.
      out[key] = Object.hasOwn(map, item) ? map[item] : '';
    } else out[key] = remapRefs(item, map, depth + 1);
  }
  return out;
}

const recordKey = item => (isPlainObject(item) && item.id !== undefined && item.id !== null ? `id:${item.id}` : `json:${JSON.stringify(item)}`);

function mergeList(current, incoming, map) {
  const have = Array.isArray(current) ? current : [];
  const keys = new Set(have.map(recordKey));
  const added = [];
  for (const raw of Array.isArray(incoming) ? incoming.slice(0, LIST_CAP) : []) {
    if (!isPlainObject(raw)) continue;
    const item = remapRefs(clone(raw), map);
    const key = recordKey(item);
    if (keys.has(key)) continue;
    keys.add(key); added.push(item);
  }
  return { value: [...have, ...added].slice(0, LIST_CAP), added: added.length };
}

/** Source preferences from either a local backup or a cloud backup's user_preferences row. */
export function backupPreferenceSource(backup) {
  const local = backup?.tables?.local_preferences?.[0];
  if (isPlainObject(local)) return local;
  const cloud = backup?.tables?.user_preferences?.[0];
  if (isPlainObject(cloud?.prefs)) return cloud.prefs;
  return null;
}

/**
 * @param backup parsed backup (parseFinanceBackup)
 * @param current this device's preferences
 * @param accountIdMap { [backupAccountId]: thisDeviceAccountId }
 * @param defaults the app's preference defaults
 * @returns { patch, counts, qrCodes: [{ from, to }] } — patch holds only changed keys.
 */
export function planPreferenceRestore(backup, current = {}, accountIdMap = {}, defaults = {}) {
  const source = backupPreferenceSource(backup);
  const patch = {}; const counts = {}; const qrCodes = [];
  if (!source) return { patch, counts, qrCodes };
  const map = isPlainObject(accountIdMap) ? accountIdMap : {};
  const mapId = id => (typeof id === 'string' && Object.hasOwn(map, id) ? map[id] : null);

  for (const key of LISTS) {
    if (!Array.isArray(source[key])) continue;
    const { value, added } = mergeList(current[key], source[key], map);
    if (added) { patch[key] = value; counts[key] = added; }
  }
  for (const key of STRING_LISTS) {
    if (!Array.isArray(source[key])) continue;
    const have = Array.isArray(current[key]) ? current[key] : [];
    const extra = source[key].filter(v => typeof v === 'string' && v.length <= 40 && !have.includes(v)).slice(0, 200);
    if (extra.length) patch[key] = [...have, ...extra];
  }
  for (const key of ACCOUNT_MAPS) {
    if (!isPlainObject(source[key])) continue;
    const next = { ...(isPlainObject(current[key]) ? current[key] : {}) };
    let added = 0;
    for (const [id, value] of Object.entries(source[key])) {
      const to = mapId(id);
      if (!to || Object.hasOwn(next, to) || value === undefined) continue;
      next[to] = remapRefs(clone(value), map); added += 1;
    }
    if (added) { patch[key] = next; counts[key] = added; }
  }
  for (const key of ACCOUNT_LIST_MAPS) {
    if (!isPlainObject(source[key])) continue;
    const next = { ...(isPlainObject(current[key]) ? current[key] : {}) };
    let added = 0;
    for (const [id, list] of Object.entries(source[key])) {
      const to = mapId(id);
      if (!to || !Array.isArray(list)) continue;
      const merged = mergeList(next[to], list, map);
      if (merged.added) { next[to] = merged.value; added += merged.added; }
    }
    if (added) { patch[key] = next; counts[key] = added; }
  }
  if (isPlainObject(source.cardBankLinks)) {
    const next = { ...(isPlainObject(current.cardBankLinks) ? current.cardBankLinks : {}) };
    let added = 0;
    for (const [card, bank] of Object.entries(source.cardBankLinks)) {
      const to = mapId(card); const toBank = mapId(bank);
      if (!to || !toBank || Object.hasOwn(next, to)) continue;
      next[to] = toBank; added += 1;
    }
    if (added) patch.cardBankLinks = next;
  }
  for (const key of PLAIN_MAPS) {
    if (!isPlainObject(source[key])) continue;
    const have = isPlainObject(current[key]) ? current[key] : {};
    const extra = Object.fromEntries(Object.entries(source[key]).filter(([k]) => !Object.hasOwn(have, k)).slice(0, LIST_CAP));
    if (Object.keys(extra).length) patch[key] = { ...have, ...clone(extra) };
  }
  // QR images travel as attachments (qr:<backup account id>); the app saves them for the restored account.
  if (isPlainObject(source.accountQrCodes)) {
    for (const [id, value] of Object.entries(source.accountQrCodes)) {
      const to = mapId(id);
      if (to && value && !current.accountQrCodes?.[to]) qrCodes.push({ from: id, to });
    }
  }
  for (const [key, type] of Object.entries(SETTINGS)) {
    const value = source[key];
    if (value === undefined || (type === 'object' ? !isPlainObject(value) : typeof value !== type)) continue;
    if (type === 'string' && value.length > 200) continue;
    if (type === 'number' && !Number.isFinite(value)) continue;
    const mine = current[key];
    const untouched = mine === undefined || mine === '' || same(mine, defaults[key]) || (isPlainObject(mine) && !Object.keys(mine).length);
    if (untouched && !same(mine, value)) patch[key] = clone(value);
  }
  for (const key of IMAGE_SETTINGS) {
    const value = source[key];
    if (typeof value === 'string' && IMAGE_DATA.test(value) && value.length <= 8 * 1024 * 1024 && !current[key]) patch[key] = value;
  }
  // Keep the better streak.
  const best = s => Number(s?.best) || 0;
  if (isPlainObject(source.streak) && best(source.streak) > best(current.streak)) patch.streak = clone(source.streak);
  return { patch, counts, qrCodes };
}
