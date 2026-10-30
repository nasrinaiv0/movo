import { monthKey } from './format';

/*
 * System notices built on this device from the person's own records (nothing is invented):
 * renewals due, limits reached, the monthly report, weekly money tips, sign-ins on new devices and MOVO release notes.
 * Each notice names the preference that controls it (`cat`), so the Notification Categories switches really work.
 */
export const APP_UPDATES = [
  { id: 'upd-2026-10-30-chatlog', at: '2026-10-30T09:00:00+08:00', title: 'NasrinAI Update', body: 'Log expenses by chatting: type “Grab 250” and NasrinAI saves it for you.' },
  { id: 'upd-2026-10-30-subs', at: '2026-10-30T08:00:00+08:00', title: 'NasrinAI Update', body: 'New: track subscriptions and see every renewal before it charges.' },
];

const DAY = 86400000;
const startOfWeek = (d) => { const x = new Date(d); x.setHours(9, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };

export function buildSystemNotices({ txs = [], now = new Date(), subs = null, budgets = [], tips = [], devices = [], deviceId = '', fmt = (n) => String(n) }) {
  const out = [];
  // Renewals due today or tomorrow.
  (subs?.upcoming || []).forEach(s => {
    const days = Math.round((Date.parse(`${s.next}T00:00:00`) - new Date(now).setHours(0, 0, 0, 0)) / DAY);
    if (days < 0 || days > 1) return;
    out.push({ id: `renew-${s.id}-${s.next}`, kind: 'System', cat: 'catTransactions', icon: 'calendar', tone: 'violet', at: new Date(new Date(now).setHours(8, 0, 0, 0)).toISOString(), title: 'Renewal due', body: days === 0 ? '{name} renews today: {amount}.' : '{name} renews tomorrow: {amount}.', vars: { name: s.name, amount: fmt(Number(s.amount) || 0, s.currency) } });
  });
  // Limits reached this month.
  budgets.filter(b => b.level === 'over').forEach(b => {
    out.push({ id: `limit-${b.category}-${monthKey(now)}`, kind: 'System', cat: 'catTransactions', icon: 'target', tone: 'red', at: new Date(new Date(now).setHours(9, 0, 0, 0)).toISOString(), title: 'Limit reached', body: 'Your {category} limit is used up ({pct}).', vars: { category: b.category, pct: `${b.percent}%` } });
  });
  // Monthly report for last month, once it has records.
  const first = new Date(now.getFullYear(), now.getMonth(), 1, 8);
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  const last = txs.filter(t => monthKey(t.date) === monthKey(prev));
  if (last.length) {
    const spent = last.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const earned = last.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    out.push({ id: `report-${monthKey(prev)}`, kind: 'System', cat: 'catReports', icon: 'chart', tone: 'teal', at: first.toISOString(), title: 'Monthly Summary Ready', body: '{month}: you spent {spent} and earned {earned}.', vars: { month: prev.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }), spent: fmt(spent), earned: fmt(earned) } });
  }
  // One money tip a week, from the person's own numbers.
  const tip = tips[0];
  if (tip && txs.length) {
    const week = startOfWeek(now);
    out.push({ id: `tip-${week.toISOString().slice(0, 10)}`, kind: 'System', cat: 'catPromo', icon: 'spark', tone: 'green', at: week.toISOString(), title: 'Money tip', body: tip.key, vars: { ...(tip.vars || {}), ...Object.fromEntries(Object.entries(tip.money || {}).map(([k, v]) => [k, fmt(v)])) }, category: tip.category });
  }
  // Sign-ins on other devices (the device list follows the account through preference sync).
  devices.filter(d => d && d.id !== deviceId).slice(-10).forEach(d => {
    out.push({ id: `signin-${d.id}`, kind: 'Account', cat: 'catAccount', icon: 'shield', tone: 'orange', at: d.at, title: 'New sign-in', body: 'Your account was signed in on {device}.', vars: { device: d.label } });
  });
  APP_UPDATES.forEach(u => out.push({ ...u, kind: 'System', cat: 'catAi', icon: 'spark', tone: 'violet' }));
  return out;
}

/** True when `now` falls inside quiet hours (start/end "HH:MM", may wrap past midnight). */
export function isQuiet(now, start, end) {
  const m = (s) => { const [h, mm] = String(s || '').split(':').map(Number); return Number.isFinite(h) && Number.isFinite(mm) ? h * 60 + mm : null; };
  const a = m(start); const b = m(end); if (a === null || b === null || a === b) return false;
  const t = now.getHours() * 60 + now.getMinutes();
  return a < b ? t >= a && t < b : t >= a || t < b;
}

/** A short, non-identifying label for this device, e.g. "Safari on iPhone". */
export function deviceLabel(ua = typeof navigator !== 'undefined' ? navigator.userAgent : '') {
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'a device';
  const br = /Edg\//.test(ua) ? 'Edge' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'a browser';
  return `${br} on ${os}`;
}

export const pushSupported = () => typeof window !== 'undefined' && 'Notification' in window;

/** Ask once for permission and register the small notification service worker. */
export async function enablePush() {
  if (!pushSupported()) return 'unsupported';
  const result = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (result === 'granted' && navigator.serviceWorker) { try { await navigator.serviceWorker.register('/sw.js'); } catch { /* fall back to page notifications */ } }
  return result;
}

/** Show a system notification (service worker when available, so it also works when installed to the Home Screen). */
export async function showSystemNotification(title, body, tag) {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  try {
    const reg = navigator.serviceWorker ? await navigator.serviceWorker.getRegistration() : null;
    if (reg) await reg.showNotification(title, { body, tag, icon: '/icon-192.png', badge: '/icon-192.png' });
    else new Notification(title, { body, tag, icon: '/icon-192.png' }); // eslint-disable-line no-new
    return true;
  } catch { return false; }
}
