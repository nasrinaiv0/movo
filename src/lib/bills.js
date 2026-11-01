/**
 * MOVO bills: pure helpers shared by the Bills tab and the Home card. An occurrence is one due
 * date of a bill; amounts due = (actual amount, else the estimate) + late fee. Inputs to summary
 * helpers must already use one reporting currency (pass toBase to convert).
 */
export const BILL_FREQUENCIES = [['one_time', 'One time'], ['weekly', 'Weekly'], ['monthly', 'Monthly'], ['quarterly', 'Every 3 months'], ['semiannual', 'Every 6 months'], ['annual', 'Yearly']];
export const BILL_CATEGORIES = ['Housing/rent', 'Utilities', 'Phone & internet', 'Credit cards', 'Loans', 'Insurance', 'Education', 'Transportation', 'Subscriptions', 'Healthcare', 'Government/taxes', 'Childcare', 'Memberships', 'Other'];

const cents = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.round(n * 100) : 0; };
const fromCents = (c) => c / 100;
const dayKey = (d) => (typeof d === 'string' ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10));

/** Amount due on an occurrence, in its own currency. */
export const amountDue = (o) => fromCents(cents(o.actual_amount ?? o.expected_amount) + cents(o.late_fee));
export const amountRemaining = (o) => (o.status === 'cancelled' ? 0 : Math.max(0, fromCents(cents(amountDue(o)) - cents(o.paid_amount))));

/** scheduled | due_soon | due_today | overdue | partially_paid | paid | cancelled, as of `today` (YYYY-MM-DD). */
export function occurrenceState(o, today, soonDays = 3) {
  if (o.status === 'cancelled') return 'cancelled';
  if (amountRemaining(o) === 0) return 'paid';
  const due = dayKey(o.due_date);
  if (due < today) return 'overdue';
  if (due === today) return 'due_today';
  if (o.status === 'partially_paid' || cents(o.paid_amount) > 0) return 'partially_paid';
  const days = Math.round((Date.parse(`${due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  return days <= soonDays ? 'due_soon' : 'scheduled';
}

/** Home and Bills tab totals for the month containing `today`. */
export function billsSummary(occurrences, payments, today, toBase = (v) => v) {
  const month = today.slice(0, 7);
  const live = (occurrences || []).filter(o => o.status !== 'cancelled');
  let due = 0; let estimated = 0; let remaining = 0; let overdue = 0; let overdueCount = 0; let paid = 0;
  for (const o of live) {
    const left = cents(toBase(amountRemaining(o), o.currency));
    remaining += left;
    if (dayKey(o.due_date).slice(0, 7) === month) { due += left; if (o.is_estimate && o.actual_amount == null) estimated += left; }
    if (left > 0 && dayKey(o.due_date) < today) { overdue += left; overdueCount += 1; }
  }
  for (const p of payments || []) if (dayKey(p.paid_at).slice(0, 7) === month) paid += cents(toBase(Number(p.amount), p.currency));
  const upcoming = live.filter(o => amountRemaining(o) > 0).sort((a, b) => dayKey(a.due_date).localeCompare(dayKey(b.due_date)));
  return { dueThisMonth: fromCents(due), estimatedThisMonth: fromCents(estimated), paidThisMonth: fromCents(paid), remaining: fromCents(remaining), overdue: fromCents(overdue), overdueCount, upcoming };
}

/** Reminder for today, if any: `before` (n days before), `today`, or `overdue`. */
export function reminderFor(o, bill, today) {
  if (occurrenceState(o, today) === 'paid' || o.status === 'cancelled') return null;
  const due = dayKey(o.due_date);
  const days = Math.round((Date.parse(`${due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  if (days < 0) return { kind: 'overdue', days: -days };
  if (days === 0) return (bill?.reminder_days || [0]).includes(0) ? { kind: 'today', days: 0 } : null;
  return (bill?.reminder_days || []).includes(days) ? { kind: 'before', days } : null;
}

/** A stable key for one payment attempt, reused on retry so the server records it once. */
export const paymentKey = (occurrenceId, nonce) => `pay-${String(occurrenceId).slice(0, 36)}-${nonce}`;
