import { renewalsBetween } from './subscriptions';

const validDay = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const date = new Date(String(value) + 'T00:00:00.000Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const positiveAmount = value => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 && amount < 1e16 ? Math.round(amount * 100) / 100 : 0;
};

/** The single liability rule used by both the Financial Planning screen and its summary. */
export function creditCardOutstanding(card) {
  if (!card || card.account_type !== 'card' || card.cardKind !== 'credit') return 0;
  // accountsView.balance is calculated from the opening balance and the complete
  // transaction ledger. Legacy liability_balance snapshots must not override it.
  const hasLedgerBalance = card.balance !== undefined && card.balance !== null && card.balance !== '';
  if (hasLedgerBalance) {
    const balance = Number(card.balance);
    return Number.isFinite(balance) ? Math.round(Math.max(0, -balance) * 100) / 100 : 0;
  }
  const explicit = Number(card.liability_balance);
  return Number.isFinite(explicit) && explicit >= 0 ? Math.round(explicit * 100) / 100 : 0;
}

/**
 * Normalize legacy and current saved-plan shapes into one Goals & Plans projection.
 * This is a read-only view: plans remain in their existing preference store and are never
 * copied into savings_goals or treated as cash allocations.
 */
export function planGoalData(plans = [], allocations = [], toBase = (value) => value) {
  const reservedByPlan = new Map();
  (Array.isArray(allocations) ? allocations : []).filter(item => item && item.status === 'allocated' && item.plan_id).forEach(item => {
    const amount = Number(item.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const converted = Number(toBase(amount, item.currency || 'PHP'));
    if (!Number.isFinite(converted) || converted <= 0) return;
    const key = String(item.plan_id);
    reservedByPlan.set(key, (reservedByPlan.get(key) || 0) + converted);
  });
  return (Array.isArray(plans) ? plans : []).flatMap(plan => {
    if (!plan || !plan.id || typeof plan.name !== 'string' || !plan.name.trim()
      || plan.status === 'archived' || plan.status === 'cancelled') return [];
    const target = positiveAmount(plan.target ?? plan.target_amount ?? plan.amount);
    if (!target) return [];
    const savedValue = Number(plan.saved ?? plan.saved_amount ?? 0);
    const migratedLegacyIds = new Set((Array.isArray(allocations) ? allocations : [])
      .filter(item => item && String(item.plan_id) === String(plan.id) && item.legacy_id)
      .map(item => String(item.legacy_id)));
    const migratedLegacyAmount = (Array.isArray(plan.fundingAllocations) ? plan.fundingAllocations : [])
      .filter(item => item && item.status === 'allocated' && item.id && migratedLegacyIds.has(String(item.id)))
      .reduce((sum, item) => {
        const amount = Number(item.amount);
        const converted = Number(toBase(amount, item.currency || plan.currency || 'PHP'));
        return Number.isFinite(amount) && amount > 0 && Number.isFinite(converted) && converted > 0 ? sum + converted : sum;
      }, 0);
    const manualSaved = Number.isFinite(savedValue) && savedValue > 0 && savedValue < 1e16
      ? Math.max(0, Math.round((savedValue - migratedLegacyAmount) * 100) / 100) : 0;
    const saved = Math.round((manualSaved + (reservedByPlan.get(String(plan.id)) || 0)) * 100) / 100;
    const candidateDate = plan.due || plan.due_date || plan.target_date || plan.date || '';
    return [{
      ...plan,
      id: String(plan.id),
      name: plan.name.trim(),
      target,
      saved,
      due: validDay(candidateDate) ? candidateDate : '',
      currency: /^[A-Z]{3}$/.test(plan.currency || '') ? plan.currency : 'PHP',
    }];
  });
}

/**
 * Subscription renewals are projected into Bills Due without creating duplicate bill records.
 * Paying a renewal through the existing subscription flow advances its next date; paused and
 * cancelled subscriptions are never projected. An unpaid past-due start date remains overdue
 * until the user records that renewal.
 */
export function subscriptionBillData(subscriptions = [], today, until) {
  const bills = [];
  const occurrences = [];
  const payments = [];
  for (const sub of Array.isArray(subscriptions) ? subscriptions : []) {
    if (!sub || !sub.id || sub.status === 'paused' || sub.status === 'cancelled' || !validDay(today) || !validDay(until)) continue;
    const amount = positiveAmount(sub.amount);
    if (!amount || !validDay(sub.start)) continue;
    const start = sub.start;
    const dates = start < today ? [start] : renewalsBetween(sub, start, until);
    const currency = /^[A-Z]{3}$/.test(sub.currency || '') ? sub.currency : 'PHP';
    const billId = 'subscription-' + String(sub.id);
    bills.push({
      id: billId, name: typeof sub.name === 'string' && sub.name.trim() ? sub.name.trim() : 'Subscription',
      category: 'Subscriptions', amount, amount_type: 'fixed', currency,
      frequency: ['weekly', 'monthly', 'quarterly', 'yearly'].includes(sub.cycle) ? sub.cycle : 'monthly',
      status: 'active', source: 'subscription', subscription_id: sub.id,
    });
    dates.forEach(date => occurrences.push({
      id: billId + '-' + date, bill_id: billId, due_date: date,
      expected_amount: amount, actual_amount: null, late_fee: 0, paid_amount: 0,
      currency, status: 'scheduled', is_estimate: false, source: 'subscription',
      subscription_id: sub.id, subscription_name: sub.name,
    }));
    if (sub.lastPaidAt && Number.isFinite(Date.parse(sub.lastPaidAt))) {
      payments.push({
        id: 'subscription-payment-' + sub.id + '-' + sub.lastPaidAt,
        amount: positiveAmount(sub.lastPaidAmount) || amount,
        currency: /^[A-Z]{3}$/.test(sub.lastPaidCurrency || '') ? sub.lastPaidCurrency : currency,
        paid_at: sub.lastPaidAt, source: 'subscription',
      });
    }
  }
  return { bills, occurrences, payments };
}
