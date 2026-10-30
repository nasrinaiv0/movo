/*
 * Merges an account's saved preferences with what this device already has cached, so signing in (or a new
 * release) never throws away the person's existing local work. Account values win for single settings;
 * maps are merged key by key; lists keep every item from both sides (the account's copy wins for the same id);
 * "seen" markers keep the newest value.
 */
import { mergeStreak } from './streak';

const MAPS = ['cardStyles', 'accountStyles', 'layouts'];
const ID_LISTS = ['budgets', 'plans', 'subscriptions', 'devices'];
const STRING_LISTS = { readIds: 500, pushed: 200 };
const NEWEST = ['notifSeenAt', 'subsSeen', 'briefingDay'];

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const list = (v) => (Array.isArray(v) ? v : []);

export function unionById(cloud, local, limit = Infinity) {
  const seen = new Set();
  const out = [];
  [...list(cloud), ...list(local)].forEach(item => {
    if (!item || typeof item.id !== 'string' || seen.has(item.id)) return;
    seen.add(item.id); out.push(item);
  });
  return out.slice(0, limit);
}

export function mergePreferences(defaults, local, cloud) {
  const l = isObj(local) ? local : {};
  const c = isObj(cloud) ? cloud : {};
  const out = { ...defaults, ...l, ...c };
  MAPS.forEach(k => { out[k] = { ...(isObj(l[k]) ? l[k] : {}), ...(isObj(c[k]) ? c[k] : {}) }; });
  ID_LISTS.forEach(k => { out[k] = unionById(c[k], l[k]); });
  Object.entries(STRING_LISTS).forEach(([k, max]) => {
    out[k] = [...new Set([...list(c[k]), ...list(l[k])].filter(x => typeof x === 'string'))].slice(0, max);
  });
  NEWEST.forEach(k => { const a = String(l[k] || ''); const b = String(c[k] || ''); out[k] = a > b ? a : b; });
  out.streak = mergeStreak(l.streak, c.streak);
  if (!c.mascot && l.mascot) out.mascot = l.mascot; // large photos stay on their device
  out.onboarded = true;
  return out;
}
