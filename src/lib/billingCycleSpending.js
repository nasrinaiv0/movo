import { monthKey } from './format';
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
