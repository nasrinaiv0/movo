import { dayKey } from './format';

/*
 * Month-over-month indicators. Every arrow and colour in the app comes from here so the rules are identical
 * everywhere: the direction is the sign of (now − before), the percentage is measured against |before|
 * (so a negative baseline such as a loss-making month still reads the right way), and the colour depends on
 * whether that direction is good for the metric: income, savings and balance going up is good; expenses going
 * up is bad; transfers only move money between your own accounts, so they stay neutral.
 */
export const GOOD_WHEN = { balance: 'up', income: 'up', savings: 'up', expenses: 'down', spent: 'down', transfers: 'none' };

const cents = (v) => Math.round(v * 100) / 100;

/** Returns { direction: 'up'|'down'|'flat', percent, tone: 'good'|'bad'|'neutral' }, or null without a baseline. */
export function trend(now, before, goodWhen = 'up') {
  const a = Number(now); const b = Number(before);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const diff = cents(a - b);
  if (diff === 0) return { direction: 'flat', percent: 0, tone: 'neutral' };
  if (cents(b) === 0) return null; // growth from nothing has no meaningful percentage
  const direction = diff > 0 ? 'up' : 'down';
  const percent = Math.abs(diff) / Math.abs(b) * 100;
  const good = goodWhen === 'none' ? null : (direction === 'up') === (goodWhen === 'up');
  return { direction, percent, tone: good === null ? 'neutral' : good ? 'good' : 'bad' };
}

/** Rounded percentage label: never shows 0% for a real change, and caps runaway values. */
export function percentLabel(percent) {
  if (percent === 0) return '0%';
  if (percent < 1) return '<1%';
  if (percent >= 1000) return '999+%';
  return `${Math.round(percent)}%`;
}

const daysIn = (key) => { const [y, m] = key.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); };
const prevMonth = (key) => { const [y, m] = key.split('-').map(Number); const d = new Date(Date.UTC(y, m - 2, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };

/** Income, expense and transfer totals for days 1..lastDay of a month (local calendar days). */
export function periodTotals(txs, key, lastDay) {
  const end = `${key}-${String(lastDay).padStart(2, '0')}`;
  const out = { income: 0, expenses: 0, transfers: 0 };
  txs.forEach((t) => {
    const day = dayKey(t.date);
    if (day.slice(0, 7) !== key || day > end) return;
    const amount = Number(t.amount) || 0;
    if (t.type === 'income') out.income += amount;
    else if (t.type === 'expense') out.expenses += amount;
    else if (t.type === 'transfer') out.transfers += amount;
  });
  out.savings = out.income - out.expenses;
  return out;
}

/**
 * Compares this month so far with the same stretch of last month (1–28 Oct vs 1–28 Sep), so a half-finished
 * month is never judged against a whole one. On the last day of a month the whole previous month is used.
 * `balance` is today's total; last month's figure is rebuilt by undoing everything recorded since then.
 */
export function monthOverMonth(txs, refDate, balance) {
  const today = dayKey(refDate); const key = today.slice(0, 7); const day = Number(today.slice(8, 10));
  const prevKey = prevMonth(key); const prevDays = daysIn(prevKey);
  const upto = day >= daysIn(key) ? prevDays : Math.min(day, prevDays);
  const now = periodTotals(txs, key, day);
  const before = periodTotals(txs, prevKey, upto);
  const cutoff = `${prevKey}-${String(upto).padStart(2, '0')}`;
  const since = txs.reduce((s, t) => (dayKey(t.date) > cutoff ? s + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0) : s), 0);
  return {
    balance: trend(balance, balance - since, GOOD_WHEN.balance),
    income: trend(now.income, before.income, GOOD_WHEN.income),
    expenses: trend(now.expenses, before.expenses, GOOD_WHEN.expenses),
    spent: trend(now.expenses, before.expenses, GOOD_WHEN.spent),
    savings: trend(now.savings, before.savings, GOOD_WHEN.savings),
    transfers: trend(now.transfers, before.transfers, GOOD_WHEN.transfers),
  };
}
