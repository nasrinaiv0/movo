/*
 * Merges an account's saved preferences with what this device already has cached, so signing in (or a new
 * release) never throws away the person's existing local work. Account values win for single settings;
 * maps are merged key by key; lists keep every item from both sides (the account's copy wins for the same id);
 * "seen" markers keep the newest value.
 *
 * After the first merge, devices sync with a three-way merge (`mergePreferencesThreeWay`): only what this device
 * changed since it last synced is applied on top of the account's latest copy, so a device with an older copy
 * can never erase what another device recorded (card payments, card types, card-bank links, budgets...).
 */
import { mergeStreak } from './streak';
import { mergeLegalAcceptance } from './legalVersion';

const MAPS = ['cardStyles', 'accountStyles', 'layouts', 'cardBankLinks', 'accountQrCodes', 'loyaltyRewardRules', 'cashbackRules'];
const ID_LISTS = ['budgets', 'plans', 'subscriptions', 'devices', 'archive', 'cryptoHoldings', 'spendingLimits', 'membershipCards'];
// Per-account lists of money records kept in preferences (recorded card payments, credit spend logs). They change
// balances, so an entry recorded on any device must survive every merge.
const ACCOUNT_LIST_MAPS = ['creditCardPayments', 'creditSpendLogs'];
const STRING_LISTS = { readIds: 500, pushed: 200 };
// Legal acceptance is merged separately as one revision/timestamp pair.
const NEWEST = ['notifSeenAt', 'subsSeen', 'briefingDay'];
const LEGAL_KEYS = ['legalAccepted', 'legalAcceptedRevision', 'legalAcceptedAt'];

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const list = (v) => (Array.isArray(v) ? v : []);

/** Removes secrets that belong to one browser/device and must never sync to account preferences. */
export function cloudSafePreferences(prefs) {
  const safe = isObj(prefs) ? { ...prefs } : {};
  delete safe.autoLogKey;
  delete safe.cloudSyncEnabled;
  delete safe.profilePhoto;
  delete safe.accountQrPending;
  // Device-only data URLs are never sent to the 256 KB preferences row; cloud entries are storage paths.
  if (safe.accountQrCodes && typeof safe.accountQrCodes === 'object') {
    safe.accountQrCodes = Object.fromEntries(Object.entries(safe.accountQrCodes).filter(([, value]) => typeof value === 'string' && !value.startsWith('data:') && !value.startsWith('localqr:')));
  }
  return safe;
}

export function unionById(cloud, local, limit = Infinity) {
  const seen = new Set();
  const out = [];
  [...list(cloud), ...list(local)].forEach(item => {
    if (!item || typeof item.id !== 'string' || seen.has(item.id)) return;
    seen.add(item.id); out.push(item);
  });
  return out.slice(0, limit);
}

const unionAccountLists = (cloud, local) => {
  const cm = isObj(cloud) ? cloud : {}, lm = isObj(local) ? local : {};
  return Object.fromEntries([...new Set([...Object.keys(cm), ...Object.keys(lm)])].map(id => [id, unionById(cm[id], lm[id])]));
};

export function mergePreferences(defaults, local, cloud) {
  const l = isObj(local) ? local : {};
  const c = isObj(cloud) ? cloud : {};
  const out = { ...defaults, ...l, ...c };
  MAPS.forEach(k => { out[k] = { ...(isObj(l[k]) ? l[k] : {}), ...(isObj(c[k]) ? c[k] : {}) }; });
  ID_LISTS.forEach(k => { out[k] = unionById(c[k], l[k]); });
  ACCOUNT_LIST_MAPS.forEach(k => { out[k] = unionAccountLists(c[k], l[k]); });
  Object.entries(STRING_LISTS).forEach(([k, max]) => {
    out[k] = [...new Set([...list(c[k]), ...list(l[k])].filter(x => typeof x === 'string'))].slice(0, max);
  });
  NEWEST.forEach(k => { const a = String(l[k] || ''); const b = String(c[k] || ''); out[k] = a > b ? a : b; });
  Object.assign(out, mergeLegalAcceptance(l, c));
  out.streak = mergeStreak(l.streak, c.streak);
  if (!c.mascot && l.mascot) out.mascot = l.mascot; // large photos stay on their device
  out.onboarded = true;
  return out;
}

/* ---------- three-way merge for ongoing sync ---------- */

/** Stable JSON (sorted object keys), for comparing values regardless of key order. */
export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (isObj(value)) return `{${Object.keys(value).sort().filter(k => value[k] !== undefined).map(k => `${JSON.stringify(k)}:${stableJson(value[k])}`).join(',')}}`;
  return JSON.stringify(value === undefined ? null : value);
}
export const sameValue = (a, b) => stableJson(a) === stableJson(b);

/** A value this device did not change takes the account's latest; a value it changed is kept. */
const pick = (base, local, remote) => (sameValue(local, base) ? remote : local);

/** Lists of items with string ids: local additions, edits and removals are applied to the account's latest list. */
function mergeIdList(base, local, remote) {
  const b = list(base), l = list(local), r = list(remote);
  const hasIds = arr => arr.every(item => item && typeof item.id === 'string');
  if (!hasIds(b) || !hasIds(l) || !hasIds(r)) return pick(base, local, remote);
  const B = new Map(b.map(i => [i.id, i])), L = new Map(l.map(i => [i.id, i])), R = new Map(r.map(i => [i.id, i]));
  const out = [];
  r.forEach(item => {
    if (B.has(item.id) && !L.has(item.id)) return; // removed on this device
    out.push(L.has(item.id) && B.has(item.id) && !sameValue(L.get(item.id), B.get(item.id)) ? L.get(item.id) : item);
  });
  l.forEach(item => { if (!R.has(item.id) && !B.has(item.id)) out.push(item); }); // added on this device
  return out;
}

/** Maps merged entry by entry; `entry` merges one entry's base/local/remote values. */
function mergeMap(base, local, remote, entry = pick) {
  const b = isObj(base) ? base : {}, l = isObj(local) ? local : {}, r = isObj(remote) ? remote : {};
  const out = {};
  new Set([...Object.keys(b), ...Object.keys(l), ...Object.keys(r)]).forEach(k => {
    const value = entry(b[k], l[k], r[k]);
    if (value !== undefined) out[k] = value;
  });
  return out;
}

/**
 * base: the copy this device last synced; local: this device's current copy; remote: the account's latest copy.
 * All three are cloud-safe preference objects. Returns the copy to save and show.
 */
export function mergePreferencesThreeWay(base, local, remote) {
  const b = isObj(base) ? base : {}, l = isObj(local) ? local : {}, r = isObj(remote) ? remote : {};
  const out = mergeMap(b, l, r);
  MAPS.forEach(k => { if (k in l || k in r) out[k] = mergeMap(b[k], l[k], r[k]); });
  ID_LISTS.forEach(k => { if (k in l || k in r) out[k] = mergeIdList(b[k], l[k], r[k]); });
  ACCOUNT_LIST_MAPS.forEach(k => {
    if (!(k in l || k in r)) return;
    // Money records are never dropped by a sync: union of both sides, edits on this device win.
    const merged = mergeMap(b[k], l[k], r[k], (bv, lv, rv) => {
      const kept = mergeIdList(bv, lv, rv);
      return unionById(kept, unionById(rv, lv));
    });
    out[k] = merged;
  });
  Object.entries(STRING_LISTS).forEach(([k, max]) => {
    if (k in l || k in r) out[k] = [...new Set([...list(r[k]), ...list(l[k])].filter(x => typeof x === 'string'))].slice(0, max);
  });
  NEWEST.forEach(k => { const a = String(l[k] || ''); const c = String(r[k] || ''); if (a || c) out[k] = a > c ? a : c; });
  const legal = mergeLegalAcceptance(l, r);
  LEGAL_KEYS.forEach(k => { if (legal[k] !== undefined) out[k] = legal[k]; else delete out[k]; });
  if (l.streak || r.streak) out.streak = mergeStreak(l.streak, r.streak);
  return out;
}
