import { dayKey, monthKey } from './format';
import { percentLabel } from './trend';

/*
 * NasrinAI's daily briefing and money tips, worked out on this device from the person's own records (nothing is
 * sent anywhere). Each line is a translatable template plus values, so the component formats money and translates.
 * Every statement is derived from the numbers given; when a number is missing the line is simply left out.
 */
const sum = (list) => list.reduce((s, t) => s + (Number(t.amount) || 0), 0);

export function buildBriefing({ txs = [], refDate = new Date(), deltas = {}, budgets = [], plans = [], subs = null }) {
  const month = monthKey(refDate);
  const list = txs.filter(t => monthKey(t.date) === month);
  const expenses = list.filter(t => t.type === 'expense');
  const income = sum(list.filter(t => t.type === 'income'));
  const spent = sum(expenses);
  const items = [];
  const tips = [];

  // Spending this month and how it compares with the same days last month.
  if (spent > 0) {
    const d = deltas.expenses;
    if (d && d.direction === 'up') items.push({ icon: 'arrowUp', tone: 'red', key: 'You spent {amount} so far this month, {pct} more than at this point last month.', money: { amount: spent }, vars: { pct: percentLabel(d.percent) } });
    else if (d && d.direction === 'down') items.push({ icon: 'arrowDown', tone: 'green', key: 'You spent {amount} so far this month, {pct} less than at this point last month.', money: { amount: spent }, vars: { pct: percentLabel(d.percent) } });
    else items.push({ icon: 'chart', tone: 'blue', key: 'You spent {amount} so far this month.', money: { amount: spent } });
  }

  // Biggest category.
  const byCat = {};
  expenses.forEach(t => { byCat[t.category || 'Other'] = (byCat[t.category || 'Other'] || 0) + (Number(t.amount) || 0); });
  const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
  if (top && spent > 0) items.push({ icon: 'tag', tone: 'orange', key: '{category} is your biggest expense: {amount} ({pct} of spending).', money: { amount: top[1] }, vars: { pct: percentLabel((top[1] / spent) * 100) }, category: top[0] });

  // Largest single expense.
  const largest = expenses.slice().sort((a, b) => b.amount - a.amount)[0];
  if (largest && expenses.length > 2) items.push({ icon: 'receipt', tone: 'slate', key: 'Largest purchase: {merchant}, {amount}.', money: { amount: largest.amount }, vars: { merchant: largest.merchant } });

  // Savings rate.
  const rate = income > 0 ? ((income - spent) / income) * 100 : null;
  if (rate !== null) items.push(rate >= 0
    ? { icon: 'bank', tone: rate >= 20 ? 'green' : 'orange', key: 'You kept {pct} of your income this month.', vars: { pct: percentLabel(rate) } }
    : { icon: 'bank', tone: 'red', key: 'You spent {amount} more than you earned this month.', money: { amount: spent - income } });

  // Subscriptions due soon.
  if (subs && subs.dueSoon.length) items.push({ icon: 'calendar', tone: 'violet', key: subs.dueSoon.length === 1 ? '1 subscription renews this week: {amount}.' : '{n} subscriptions renew this week: {amount}.', money: { amount: subs.dueSoonTotal }, vars: { n: subs.dueSoon.length } });

  // Budgets.
  const over = budgets.filter(b => b.level === 'over');
  const near = budgets.filter(b => b.level === 'warn');
  if (over.length) items.push({ icon: 'target', tone: 'red', key: over.length === 1 ? 'Your {category} budget is over its limit.' : '{n} budgets are over their limits.', vars: { n: over.length }, category: over[0].category });
  else if (near.length) items.push({ icon: 'target', tone: 'orange', key: 'Your {category} budget is at {pct}.', vars: { pct: `${near[0].percent}%` }, category: near[0].category });

  // ---------- tips, most relevant first ----------
  if (rate !== null && rate < 20) tips.push({ key: 'Try the 50/30/20 rule: needs 50%, wants 30%, savings 20%. Moving {amount} to savings on payday would get you to 20%.', money: { amount: Math.max(0, income * 0.2 - (income - spent)) } });
  if (deltas.expenses?.direction === 'up' && deltas.expenses.percent >= 10 && top) tips.push({ key: 'Spending is climbing. Set a weekly cap for {category} and check it every Sunday.', category: top[0] });
  if (subs && income > 0 && subs.monthly / income >= 0.1) tips.push({ key: 'Subscriptions take {pct} of your income. Cancel the ones you have not used in the last month.', vars: { pct: percentLabel((subs.monthly / income) * 100) } });
  const crowded = subs?.upcoming ? Object.entries(subs.upcoming.reduce((m, s) => ({ ...m, [s.category]: [...(m[s.category] || []), s] }), {})).find(([, l]) => l.length >= 2) : null;
  if (crowded) tips.push({ key: 'You pay for {n} {category} subscriptions. Keeping only one could save money every month.', vars: { n: crowded[1].length }, category: crowded[0] });
  if (!budgets.length && top) tips.push({ key: 'Set a monthly limit for {category}, your biggest category, to get a heads-up before it runs over.', category: top[0] });
  if (!plans.some(p => /emergency/i.test(p.name || '')) && spent > 0) tips.push({ key: 'Build an emergency fund of 3 to 6 months of expenses, about {amount}. Start with a small automatic transfer.', money: { amount: spent * 3 } });
  const lateNight = expenses.filter(t => { const h = new Date(t.date).getHours(); return h >= 22 || h < 5; });
  if (lateNight.length >= 3) tips.push({ key: '{n} purchases happened late at night. Waiting until morning helps avoid impulse buys.', vars: { n: lateNight.length } });
  const todayKey = dayKey(refDate);
  if (!txs.some(t => dayKey(t.date) === todayKey)) tips.push({ key: 'Log purchases the moment you pay. It takes seconds and keeps every number here accurate.' });
  tips.push({ key: 'Pay credit cards in full each month to avoid interest charges.' });
  tips.push({ key: 'Review your subscriptions monthly; small charges add up over a year.' });

  return { items: items.slice(0, 5), tips: tips.slice(0, 3), hasData: items.length > 0 };
}
