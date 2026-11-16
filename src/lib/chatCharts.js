import { categoryOf } from './categories';
import { dayKey, monthKey } from './format';
import { periodOf } from './localAnswer';

/*
 * Charts in the NasrinAI chat, drawn from the records on this device (owner request 2026-11-16: "always show graph
 * presentation even offline for specific user requests"). When someone asks for a chart, graph, breakdown, trend or
 * income-versus-expenses view, the chat answers at once with a chart built here, online or offline, on any plan.
 * Nothing is sent to NasrinAI. Pure functions; the chart is rendered by components/ChatChart.
 */

/** Words that ask to see a picture of the numbers, in English and Filipino. */
const VISUAL = /\b(chart|charts|graph|graphs|graphic|pie|donut|doughnut|bar|bars|plot|visual\w*|diagram|breakdown|trend|trends|tsart|grap|grapiko|ipakita (?:sa|ang) (?:chart|graph))\b/;
const FLOW = /\b(income (?:vs\.?|versus|and|against) (?:expenses?|spending)|(?:expenses?|spending) (?:vs\.?|versus|and|against) income|cash ?flow|money ?flow|in and out|kita (?:at|vs\.?) gastos|pasok at labas)\b/;
const TREND = /\b(trend|trends|over time|per day|each day|daily|day by day|weekly|per week|monthly|per month|each month|history|araw-araw|kada araw|buwan-buwan|kada buwan|last (?:six|6|three|3|twelve|12) months)\b/;
const MONTHS_SPAN = /\b(monthly|per month|each month|buwan-buwan|kada buwan|last (?:six|6|three|3|twelve|12) months|months)\b/;
const BREAKDOWN = /\b(where (?:did|does) my money go|spending by category|by category|per category|categories|saan napunta)\b/;

/** The requests behind the chat's chart shortcuts (App chatShortcuts). Kept here, as data, not interface text. */
export const CHART_PROMPTS = { categories: 'spending by category chart this month', flow: 'income vs expenses' };

/** One colour per compact category (lib/categories PRIMARY order), readable on light and dark surfaces. */
export const CATEGORY_COLORS = {
  'Food & Dining': '#ff9f43', Transportation: '#4d8dff', 'Housing & Home': '#2ec4b6', 'Bills & Utilities': '#ff6b7b',
  Shopping: '#f7b73e', 'Health & Medical': '#ef5da8', 'Personal Care': '#a78bfa', Entertainment: '#8b5cf6', Travel: '#14b8a6',
  Education: '#3b82f6', 'Financial & Debt': '#64748b', Other: '#8e98ac',
};
const colorFor = (label) => CATEGORY_COLORS[label] || CATEGORY_COLORS.Other;
const round = (n) => Math.round(n * 100) / 100;

/** Which chart a message asks for, or '' when it asks for none. */
export function chartKind(text) {
  const t = String(text || '').toLowerCase();
  if (!t.trim()) return '';
  const visual = VISUAL.test(t) || BREAKDOWN.test(t);
  if (FLOW.test(t) || (visual && /\b(income|earn\w*|kita|salary|sahod)\b/.test(t) && /\b(expense\w*|spend\w*|gastos)\b/.test(t))) return 'flow';
  if (!visual && !TREND.test(t)) return '';
  if (/\b(budget|budgets|limit|limits|badyet)\b/.test(t)) return 'budgets';
  if (TREND.test(t) && !BREAKDOWN.test(t)) return 'trend';
  if (!visual) return '';
  return 'categories';
}

const expenses = (txs) => txs.filter(x => x.type === 'expense' && Number.isFinite(x.amount) && x.amount > 0);

/** Last `count` month keys ending with the month of `now`, oldest first. */
function lastMonths(now, count) {
  return Array.from({ length: count }, (_, i) => monthKey(new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 15)));
}
const monthShort = (key, locale) => {
  const [y, m] = key.split('-').map(Number);
  try { return new Date(y, m - 1, 15).toLocaleDateString(locale, { month: 'short' }); } catch { return key; }
};

/**
 * The chart for a message, or null when the message does not ask for one. `ctx` carries the device records:
 * txs ({ type, amount, date, category }) in the home currency, budgets ({ category, spent, monthly_limit, percent }).
 */
export function buildChatChart(text, { txs = [], budgets = [], now = new Date(), locale } = {}) {
  const kind = chartKind(text);
  if (!kind) return null;
  const t = String(text).toLowerCase();
  const period = periodOf(t, now);

  if (kind === 'budgets') {
    const rows = budgets.filter(b => Number(b.monthly_limit) > 0).map(b => ({
      label: categoryOf(b.category).label, value: round(Number(b.spent) || 0), limit: round(Number(b.monthly_limit)),
      percent: Math.max(0, Math.round(Number(b.percent) || 0)), color: colorFor(categoryOf(b.category).label),
    })).sort((a, b) => b.percent - a.percent);
    return { kind, period: 'This month', rows, empty: !rows.length };
  }

  if (kind === 'flow') {
    const keys = /\b(this year|ngayong taon|year|12 months|twelve months)\b/.test(t) ? lastMonths(now, 12) : lastMonths(now, 6);
    const rows = keys.map(key => {
      const inMonth = txs.filter(x => monthKey(x.date) === key);
      const income = inMonth.filter(x => x.type === 'income').reduce((s, x) => s + (x.amount || 0), 0);
      const spent = expenses(inMonth).reduce((s, x) => s + x.amount, 0);
      return { key, label: monthShort(key, locale), income: round(income), expenses: round(spent) };
    });
    const income = round(rows.reduce((s, r) => s + r.income, 0));
    const spent = round(rows.reduce((s, r) => s + r.expenses, 0));
    return { kind, period: keys.length === 12 ? 'Last 12 months' : 'Last 6 months', rows, income, expenses: spent, net: round(income - spent),
      empty: !rows.some(r => r.income || r.expenses) };
  }

  if (kind === 'trend') {
    let rows;
    let label;
    if (MONTHS_SPAN.test(t) || period.label === 'This year') {
      const keys = period.label === 'This year' ? Array.from({ length: now.getMonth() + 1 }, (_, i) => monthKey(new Date(now.getFullYear(), i, 15)))
        : lastMonths(now, /\b(three|3) months\b/.test(t) ? 3 : /\b(twelve|12) months\b/.test(t) ? 12 : 6);
      rows = keys.map(key => ({ key, label: monthShort(key, locale), value: round(expenses(txs).filter(x => monthKey(x.date) === key).reduce((s, x) => s + x.amount, 0)) }));
      label = period.label === 'This year' ? 'This year' : `Last ${keys.length} months`;
    } else {
      // Day by day across the asked week or month (this month by default), up to today.
      const days = [];
      const start = new Date(now); start.setHours(12, 0, 0, 0);
      if (/week/i.test(period.label)) {
        start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - (period.label === 'Last week' ? 7 : 0));
        for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(start.getDate() + i); days.push(d); }
      } else {
        const base = period.label === 'Last month' ? new Date(now.getFullYear(), now.getMonth() - 1, 1, 12) : new Date(now.getFullYear(), now.getMonth(), 1, 12);
        const last = period.label === 'Last month' ? new Date(now.getFullYear(), now.getMonth(), 0).getDate() : now.getDate();
        for (let i = 0; i < last; i++) { const d = new Date(base); d.setDate(i + 1); days.push(d); }
      }
      const totals = {};
      expenses(txs).forEach(x => { const k = dayKey(x.date); totals[k] = (totals[k] || 0) + x.amount; });
      rows = days.map(d => ({ key: dayKey(d), label: /week/i.test(period.label) ? d.toLocaleDateString(locale, { weekday: 'short' }) : String(d.getDate()), value: round(totals[dayKey(d)] || 0) }));
      label = /week/i.test(period.label) || period.label === 'Last month' ? period.label : 'This month';
    }
    const total = round(rows.reduce((s, r) => s + r.value, 0));
    const peak = rows.reduce((best, r) => (r.value > (best?.value || 0) ? r : best), null);
    return { kind, period: label, rows, total, peak, average: rows.length ? round(total / rows.length) : 0, empty: !total };
  }

  // Spending by category for the asked period (this month by default): the six largest, the rest as Other.
  const by = {};
  expenses(txs.filter(x => period.test(x.date))).forEach(x => { const k = categoryOf(x.category).label; by[k] = (by[k] || 0) + x.amount; });
  const sorted = Object.entries(by).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 6);
  const rest = sorted.slice(6).reduce((s, [, v]) => s + v, 0);
  if (rest > 0) {
    const other = top.find(([k]) => k === 'Other');
    if (other) other[1] += rest; else top.push(['Other', rest]);
  }
  const total = round(sorted.reduce((s, [, v]) => s + v, 0));
  const rows = top.map(([label, value]) => ({ label, value: round(value), percent: total ? Math.round((value / total) * 100) : 0, color: colorFor(label) }));
  return { kind: 'categories', period: period.label, rows, total, empty: !rows.length };
}

/**
 * The words that go with a chart, read aloud and shown above it, in plain English for the i18n catalog. `fmt` formats
 * an amount the way the app shows it (it may hide amounts).
 */
export function chartSummary(chart, fmt = (n) => String(n), tr = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars?.[k] ?? '')) {
  if (!chart) return '';
  const period = tr(chart.period);
  if (chart.kind === 'budgets') {
    if (chart.empty) return tr('You have no monthly limits yet. Add one in Menu → Limits.');
    const over = chart.rows.filter(r => r.percent > 100).length;
    return over ? tr('{n} of your limits are over this month.', { n: over }) : tr('Here is how much of each monthly limit you have used.');
  }
  if (chart.kind === 'flow') {
    if (chart.empty) return tr('{period}: no income or spending recorded yet.', { period });
    return tr('{period}: earned {income}, spent {expenses}, net {net}.', { period, income: fmt(chart.income), expenses: fmt(chart.expenses), net: fmt(chart.net) });
  }
  if (chart.kind === 'trend') {
    if (chart.empty) return tr('{period}: no spending recorded yet.', { period });
    return tr('{period}: spent {total}. The highest was {peak} on {day}.', { period, total: fmt(chart.total), peak: fmt(chart.peak.value), day: chart.peak.label });
  }
  if (chart.empty) return tr('{period}: no spending recorded yet.', { period });
  const first = chart.rows[0];
  return tr('{period}: spent {total}. {category} is the largest at {percent}%.', { period, total: fmt(chart.total), category: tr(first.label), percent: first.percent });
}
