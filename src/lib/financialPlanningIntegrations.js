import { renewalsBetween } from './subscriptions';

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
  for (const sub of subscriptions) {
    if (!sub || !sub.id || sub.status === 'paused' || sub.status === 'cancelled') continue;
    const amount = Number(sub.amount);
    if (!Number.isFinite(amount) || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(String(sub.start || ''))) continue;
    const start = sub.start;
    const dates = start < today ? [start] : renewalsBetween(sub, start, until);
    const billId = `subscription-${String(sub.id)}`;
    bills.push({
      id: billId,
      name: sub.name,
      category: 'Subscriptions',
      amount,
      amount_type: 'fixed',
      currency: /^[A-Z]{3}$/.test(sub.currency || '') ? sub.currency : 'PHP',
      frequency: sub.cycle || 'monthly',
      status: 'active',
      source: 'subscription',
      subscription_id: sub.id,
    });
    dates.forEach(date => occurrences.push({
      id: `${billId}-${date}`,
      bill_id: billId,
      due_date: date,
      expected_amount: Math.round(amount * 100) / 100,
      actual_amount: null,
      late_fee: 0,
      paid_amount: 0,
      currency: bills[bills.length - 1].currency,
      status: 'scheduled',
      is_estimate: false,
      source: 'subscription',
      subscription_id: sub.id,
      subscription_name: sub.name,
    }));
    if (sub.lastPaidAt && Number.isFinite(Date.parse(sub.lastPaidAt))) {
      payments.push({
        id: `subscription-payment-${sub.id}-${sub.lastPaidAt}`,
        amount: Math.round((Number(sub.lastPaidAmount) > 0 ? Number(sub.lastPaidAmount) : amount) * 100) / 100,
        currency: sub.lastPaidCurrency || bills[bills.length - 1].currency,
        paid_at: sub.lastPaidAt,
        source: 'subscription',
      });
    }
  }
  return { bills, occurrences, payments };
}
