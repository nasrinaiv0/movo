import { dayKey, monthKey } from './format';
import { trend, GOOD_WHEN } from './trend';

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Month arithmetic is calendar-based rather than using 30-day offsets. */
export function shiftBillingCycle(key, offset) {
  if (!MONTH_KEY.test(String(key))) return '';
  const [year, month] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return date.getUTCFullYear() + '-' + String(date.getUTCMonth() + 1).padStart(2, '0');
}

/** Posted expenses only. Keep cents in integer arithmetic to avoid drift. */
export function billingCycleTotals(transactions = []) {
  const centsByCycle = new Map();
  for (const tx of transactions || []) {
    if (tx?.type !== 'expense') continue;
    const key = monthKey(tx.date);
    const amount = Number(tx.amount);
    if (!MONTH_KEY.test(key) || !Number.isFinite(amount)) continue;
    const cents = Math.round(amount * 100);
    if (!Number.isSafeInteger(cents)) continue;
    const next = (centsByCycle.get(key) || 0) + cents;
    if (Number.isSafeInteger(next)) centsByCycle.set(key, next);
  }
  return centsByCycle;
}

export function billingCycleSpending(transactions = [], anchorCycle, count = 12) {
  if (!MONTH_KEY.test(String(anchorCycle))) return [];
  const totalCents = billingCycleTotals(transactions);
  const limit = Math.min(24, Math.max(1, Number.isFinite(count) ? Math.trunc(count) : 12));
  return Array.from({ length: limit }, (_, i) => {
    const key = shiftBillingCycle(anchorCycle, i + 1 - limit);
    return { key, amount: (totalCents.get(key) || 0) / 100 };
  });
}

/** Whole historical cycle comparison; active month uses existing month-to-date comparison. */
export function spendingVsPreviousCycle(transactions = [], selectedCycle) {
  if (!MONTH_KEY.test(String(selectedCycle))) return null;
  const totals = billingCycleTotals(transactions);
  const current = (totals.get(selectedCycle) || 0) / 100;
  const previous = (totals.get(shiftBillingCycle(selectedCycle, -1)) || 0) / 100;
  return trend(current, previous, GOOD_WHEN.spent);
}

/**
 * Posted expenses per calendar day of one cycle: one row for every day of that month (1 to 28–31), in order, so the
 * graph for "Nov 2026" runs from Nov 1 to Nov 30. Cents are summed as integers.
 */
export function dailyCycleSpending(transactions = [], cycle) {
  if (!MONTH_KEY.test(String(cycle))) return [];
  const [year, month] = cycle.split('-').map(Number);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cents = new Map();
  for (const tx of transactions || []) {
    if (tx?.type !== 'expense') continue;
    const key = dayKey(tx.date);
    const amount = Number(tx.amount);
    if (!key.startsWith(cycle + '-') || !Number.isFinite(amount)) continue;
    const value = Math.round(amount * 100);
    if (!Number.isSafeInteger(value)) continue;
    const next = (cents.get(key) || 0) + value;
    if (Number.isSafeInteger(next)) cents.set(key, next);
  }
  return Array.from({ length: days }, (_, i) => {
    const key = cycle + '-' + String(i + 1).padStart(2, '0');
    return { key, amount: (cents.get(key) || 0) / 100 };
  });
}

/**
 * Every cycle there is data for: from the first month with a posted expense to `currentCycle` (or the latest month
 * with data, when that is later), with empty months in between kept so the timeline is continuous. Capped to the
 * most recent `max` cycles so the bars stay readable.
 */
export function allCycleSpending(transactions = [], currentCycle, max = 36) {
  if (!MONTH_KEY.test(String(currentCycle))) return [];
  const totals = billingCycleTotals(transactions);
  const keys = Array.from(totals.keys()).sort();
  const first = keys.length && keys[0] < currentCycle ? keys[0] : currentCycle;
  const last = keys.length && keys[keys.length - 1] > currentCycle ? keys[keys.length - 1] : currentCycle;
  const rows = [];
  for (let key = first; key && key <= last && rows.length < 1200; key = shiftBillingCycle(key, 1)) rows.push({ key, amount: (totals.get(key) || 0) / 100 });
  const limit = Math.max(1, Number.isFinite(max) ? Math.trunc(max) : 36);
  return rows.slice(-limit);
}
