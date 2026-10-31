/**
 * MOVO's canonical accounting projections. Inputs to summary helpers must already use one reporting currency.
 * Persistence and UI must not invent their own sign rules.
 */
const amountOf = value => { const n = Number(value); return Number.isFinite(n) && n >= 0 ? n : 0; };
const active = row => row && row.is_archived !== true && row.status !== 'archived';

export function loanOutstanding(loan, events = []) {
  if (!loan) return 0;
  const opening = amountOf(loan.opening_principal ?? loan.principal_amount ?? loan.amount);
  const delta = (Array.isArray(events) ? events : []).filter(e => e.loan_id === loan.id).reduce((sum, e) => {
    const amount = amountOf(e.amount);
    if (e.event_type === 'borrowed' || e.event_type === 'principal_increase') return sum + amount;
    if (e.event_type === 'principal_payment') return sum - amount;
    return sum;
  }, 0);
  return Math.max(0, opening + delta);
}

export function receivableOutstanding(receivable, events = []) {
  if (!receivable) return 0;
  const opening = amountOf(receivable.opening_amount ?? receivable.amount);
  const delta = (Array.isArray(events) ? events : []).filter(e => e.receivable_id === receivable.id).reduce((sum, e) => {
    const amount = amountOf(e.amount);
    if (e.event_type === 'lent' || e.event_type === 'amount_increased') return sum + amount;
    if (e.event_type === 'collected' || e.event_type === 'written_off') return sum - amount;
    return sum;
  }, 0);
  return Math.max(0, opening + delta);
}

export function loanEventEffect(event) {
  const amount = amountOf(event?.amount);
  switch (event?.event_type) {
    case 'borrowed': case 'principal_increase': return { accountDelta: amount, liabilityDelta: amount, income: 0, expense: 0 };
    case 'principal_payment': return { accountDelta: -amount, liabilityDelta: -amount, income: 0, expense: 0 };
    case 'interest_payment': case 'fee': return { accountDelta: -amount, liabilityDelta: 0, income: 0, expense: amount };
    default: return { accountDelta: 0, liabilityDelta: 0, income: 0, expense: 0 };
  }
}

export function receivableEventEffect(event) {
  const amount = amountOf(event?.amount);
  switch (event?.event_type) {
    case 'lent': case 'amount_increased': return { accountDelta: -amount, receivableDelta: amount, income: 0, expense: 0 };
    case 'collected': return { accountDelta: amount, receivableDelta: -amount, income: 0, expense: 0 };
    case 'written_off': return { accountDelta: 0, receivableDelta: -amount, income: 0, expense: amount };
    default: return { accountDelta: 0, receivableDelta: 0, income: 0, expense: 0 };
  }
}

export function creditCardEventEffect(event) {
  const amount = amountOf(event?.amount);
  switch (event?.event_type) {
    case 'purchase': return { cashDelta: 0, liabilityDelta: amount, income: 0, expense: amount };
    case 'payment': return { cashDelta: -amount, liabilityDelta: -amount, income: 0, expense: 0 };
    case 'interest': case 'fee': return { cashDelta: -amount, liabilityDelta: amount, income: 0, expense: amount };
    default: return { cashDelta: 0, liabilityDelta: 0, income: 0, expense: 0 };
  }
}

export function goalProgress(goal, allocations = []) {
  const target = amountOf(goal?.target_amount);
  const saved = (Array.isArray(allocations) ? allocations : []).filter(a => a.goal_id === goal?.id && a.status !== 'released').reduce((sum, a) => sum + amountOf(a.amount), 0);
  return { target, saved, remaining: Math.max(0, target - saved), percent: target > 0 ? Math.min(100, (saved / target) * 100) : 0 };
}

export function financialPosition({ accounts = [], loans = [], receivables = [], goalAllocations = [], otherAssets = 0, otherLiabilities = 0 } = {}) {
  const activeAccounts = accounts.filter(active);
  const assetAccounts = activeAccounts.filter(a => a.account_type !== 'card' || a.card_kind === 'debit');
  const liquidAccounts = assetAccounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);
  const spendableAccounts = activeAccounts.filter(a => ['bank','e_wallet','cash'].includes(a.account_type));
  const cardLiabilities = activeAccounts.filter(a => a.account_type === 'card' && a.card_kind === 'credit')
    .reduce((sum, a) => sum + Math.max(0, Number(a.liability_balance ?? -Number(a.balance || 0))), 0);
  const loanLiabilities = loans.filter(active).reduce((sum, l) => sum + amountOf(l.outstanding_balance ?? l.outstanding_principal ?? l.amount), 0);
  const receivableAssets = receivables.filter(active).reduce((sum, r) => sum + amountOf(r.outstanding_balance ?? r.opening_amount ?? r.amount), 0);
  const assets = liquidAccounts + amountOf(otherAssets) + receivableAssets;
  const liabilities = cardLiabilities + loanLiabilities + amountOf(otherLiabilities);
  const reserved = goalAllocations.filter(a => a.status !== 'released' && (!a.account_type || ['bank','e_wallet','cash'].includes(a.account_type))).reduce((sum, a) => sum + amountOf(a.amount), 0);
  const spendable = spendableAccounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);
  const unclassifiedCardAccounts = activeAccounts.filter(a => a.account_type === 'card' && !['credit','debit'].includes(a.card_kind)).length;
  return { liquidAccounts, receivableAssets, assets, liabilities, netWorth: assets - liabilities, reservedForGoals: reserved, availableMoney: spendable - reserved, unclassifiedCardAccounts };
}

export function validateGoalAllocation({ amount, currentAllocated = 0, eligibleFunds = 0 }) {
  const requested = Number(amount), allocated = amountOf(currentAllocated), eligible = amountOf(eligibleFunds);
  if (!Number.isFinite(requested) || requested <= 0) return { valid: false, reason: 'amount_must_be_positive' };
  if (allocated + requested > eligible + 0.000001) return { valid: false, reason: 'allocation_exceeds_available_funds' };
  return { valid: true, reason: null };
}
