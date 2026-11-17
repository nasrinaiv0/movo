import { dayKey, monthKey } from './format';
import { budgetProgress } from '../components/Budgets';

export const SUMMARY_SECTIONS = ['income', 'expenses', 'savings', 'flow', 'planning', 'budgets', 'spending'];

const moneyValue = value => Number.isFinite(value) && Math.abs(value) <= 1e12 ? Math.round(value * 100) / 100 : undefined;
const count = value => Number.isInteger(value) && value >= 0 && value <= 100000 ? value : undefined;

export function summarySections(snapshot) {
  if (snapshot?.sections) return snapshot.sections;
  return {
    ...(snapshot?.totals ? { income: snapshot.totals.income, expenses: snapshot.totals.expenses } : {}),
    ...(snapshot?.categories?.length ? { spending: snapshot.categories } : {}),
  };
}

export function buildFriendSummary({ c, finance, planning, month, note, selected, today = new Date() }) {
  const current = monthKey(today);
  const { income, expenses, list = [] } = finance.statsFor(month);
  const monthsSpending = finance.breakdownFor(month).data
    .filter(({ percent }) => Number.isInteger(percent) && percent >= 0 && percent <= 100)
    .map(({ key, percent }) => ({ key, percent }));
  const flow = Array.from({ length: 5 }, () => 0);
  for (const item of list) {
    if (item.type !== 'income' && item.type !== 'expense') continue;
    const day = Number(dayKey(item.date).slice(8, 10));
    flow[Math.floor((day - 1) / 7)] += item.type === 'income' ? item.amount : -item.amount;
  }
  const weeklyNet = flow.map(moneyValue);
  const currentList = month === current ? list : finance.statsFor(current).list;
  const budgets = budgetProgress(finance.budgets, currentList || []);
  const plan = planning.summary;
  const planReady = planning.loaded && !planning.error;
  const metrics = {
    income: moneyValue(income), expenses: moneyValue(expenses), savings: moneyValue(c.stats.savings),
    flow: weeklyNet.every(value => value !== undefined) ? weeklyNet : undefined,
    planning: planReady ? {
      bills: moneyValue(plan.bills.dueThisMonth), debt: moneyValue(plan.loans.total), owed: moneyValue(plan.receivables.total),
    } : undefined,
    budgets: planReady ? {
      budgets: count(budgets.length), onTrack: count(budgets.filter(item => item.percent < 100).length),
      plans: count(plan.plans.count), progress: plan.plans.count && plan.plans.target > 0
        ? Math.min(100, Math.max(0, Math.round(100 * plan.plans.saved / plan.plans.target))) : 0,
    } : undefined,
    spending: monthsSpending,
  };
  const sections = {};
  for (const key of SUMMARY_SECTIONS) {
    const value = metrics[key];
    if (!selected.includes(key) || value === undefined) continue;
    if (key === 'spending' || typeof value === 'number' || Object.values(value).every(Number.isFinite)) sections[key] = value;
  }
  const asOf = ['savings', 'planning', 'budgets'].some(key => key in sections) ? dayKey(today) : undefined;
  return { month: month || current, currency: finance.currency, ...(asOf ? { asOf } : {}), ...(note.trim() ? { note: note.trim() } : {}), sections };
}
