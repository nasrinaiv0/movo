/*
 * How the Home ram feels about this month's spending. Budgets come first: any category over its limit
 * makes it angry, one close to its limit (80%+) makes it disappointed, and everything comfortably under
 * (below 50%) makes it smile. Without budgets, the month's income stands in as the limit. With neither,
 * it stays cute and invites the person to set a limit.
 */
export const MOOD_WARN = 0.8;
export const MOOD_SMILE = 0.5;

export function mascotMood({ budgets = [], income = 0, expenses = 0 } = {}) {
  const tracked = budgets.filter(b => Number(b.monthly_limit) > 0);
  if (tracked.length) {
    const worst = [...tracked].sort((a, b) => (b.percent || 0) - (a.percent || 0))[0];
    const share = (worst.percent || 0) / 100;
    if (share >= 1) return { mood: 'angry', reason: 'budget-over', category: worst.category, share };
    if (share >= MOOD_WARN) return { mood: 'sad', reason: 'budget-near', category: worst.category, share };
    if (share < MOOD_SMILE) return { mood: 'smile', reason: 'budget-ok', share };
    return { mood: 'cute', reason: 'budget-fine', share };
  }
  if (income > 0) {
    const share = expenses / income;
    if (share > 1) return { mood: 'angry', reason: 'income-over', share };
    if (share >= MOOD_WARN) return { mood: 'sad', reason: 'income-near', share };
    if (share < MOOD_SMILE) return { mood: 'smile', reason: 'income-ok', share };
    return { mood: 'cute', reason: 'income-fine', share };
  }
  return { mood: 'cute', reason: expenses > 0 ? 'no-limit' : 'empty', share: 0 };
}

/** The ram's one-line explanation, in plain English (translated by the caller). */
export function moodMessage({ reason, category }) {
  switch (reason) {
    case 'budget-over': return ['Grr! {category} is over its limit.', { category }];
    case 'budget-near': return ['Oh no, {category} is close to its limit.', { category }];
    case 'budget-ok': return ['Yay! Every budget is well under its limit.', {}];
    case 'budget-fine': return ['Your budgets are on track. Keep it steady!', {}];
    case 'income-over': return ['Grr! You spent more than you earned this month.', {}];
    case 'income-near': return ['Careful, spending is close to this month’s income.', {}];
    case 'income-ok': return ['Yay! Spending is well under this month’s income.', {}];
    case 'income-fine': return ['Spending is on track this month.', {}];
    case 'no-limit': return ['Set a monthly limit and I’ll keep watch.', {}];
    default: return ['Log an expense and I’ll keep watch.', {}];
  }
}
