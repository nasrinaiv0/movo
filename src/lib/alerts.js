import { monthKey } from './format';
import { isNativeApp } from './platform';
import { nativeNotifyPermission, requestNativeNotify, showNativeNotification } from './native';

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

export function buildSystemNotices({ txs = [], now = new Date(), subs = null, budgets = [], bills = [], billOccurrences = [], tips = [], devices = [], deviceId = '', fmt = (n) => String(n) }) {
  const out = [];
  // Renewals due today or tomorrow.
  (subs?.upcoming || []).forEach(s => {
    const days = Math.round((Date.parse(`${s.next}T00:00:00`) - new Date(now).setHours(0, 0, 0, 0)) / DAY);
    if (days < 0 || days > 1) return;
    out.push({ id: `renew-${s.id}-${s.next}`, kind: 'System', cat: 'catTransactions', icon: 'calendar', tone: 'violet', at: new Date(new Date(now).setHours(8, 0, 0, 0)).toISOString(), title: 'Renewal due', body: days === 0 ? '{name} renews today: {amount}.' : '{name} renews tomorrow: {amount}.', vars: { name: s.name, amount: fmt(Number(s.amount) || 0, s.currency) } });
  });
  // Bill reminders use the owner's configured reminder_days and generated occurrences.
  // A paid/cancelled occurrence never produces a r...[truncated]