import { useCallback, useEffect, useMemo, useState } from 'react';
import { financialPosition, goalProgress } from './accounting';
import { billsSummary } from './bills';
import { listBillPayments, listOccurrences } from './billsRepository';
import { listGoalAllocations, listGoals, listLoans, listReceivables, listPlanAllocations } from './obligationsRepository';
import { creditCardOutstanding, planGoalData, subscriptionBillData } from './financialPlanningIntegrations';

/*
 * Financial planning data shared by the Financial planning screen and the Home summary card:
 * loans and debts, money owed to you, savings goals with their allocations, and this month's bills.
 * Everything is the signed-in person's own cloud records (owner RLS); in local mode only the accounts count.
 * Amounts in `summary` are converted to the home currency with `toBase`.
 */
const todayKey = () => new Date().toLocaleDateString('en-CA');
const shift = (day, n) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

/**
 * Accounts that count toward the financial position: open accounts and debit/credit cards. A debit card linked to a
 * bank shows that bank's balance, so it is left out (the bank already counts); a credit card's negative balance is
 * what is owed on it, a liability.
 */
export const planningAccounts = (accounts = []) => accounts.filter(a => !a.is_archived && (a.account_type !== 'card'
  || (a.cardKind === 'debit' && !a.linkedAccountId) || a.cardKind === 'credit'));

export function planningSummary({ accounts = [], loans = [], receivables = [], goals = [], plans = [], allocations = [], planAllocations = [], occurrences = [], payments = [], toBase = (v) => v, today = todayKey() }) {
  const live = allocations.filter(a => a.status === 'allocated');
  const activePlans = planGoalData(plans, planAllocations, toBase);
  const position = financialPosition({
    accounts: accounts.map(a => ({ ...a, balance: toBase(Number(a.balance) || 0, a.currency), liability_balance: a.account_type === 'card' && a.cardKind === 'credit' ? toBase(creditCardOutstanding(a), a.currency) : a.liability_balance, card_kind: a.account_type === 'card' ? (a.cardKind === 'credit' ? 'credit' : a.cardKind === 'debit' ? 'debit' : 'unknown') : undefined })),
    loans: loans.map(l => ({ ...l, outstanding_balance: toBase(Number(l.outstanding_principal) || 0, l.currency) })),
    receivables: receivables.map(r => ({ ...r, outstanding_balance: toBase(Number(r.outstanding_amount) || 0, r.currency) })),
    goalAllocations: [
      ...live.map(a => ({ ...a, amount: toBase(Number(a.amount) || 0, a.currency) })),
      ...planAllocations.filter(a => a && a.status === 'allocated')
        .map(a => ({ ...a, amount: toBase(Number(a.amount) || 0, a.currency), currency: undefined })),
    ],
  });
  const activeLoans = loans.filter(l => l.status === 'active' && Number(l.outstanding_principal) > 0);
  const creditCardDebts = accounts.filter(a => creditCardOutstanding(a) > 0);
  const creditCardDebtTotal = creditCardDebts.reduce((sum, a) => sum + toBase(creditCardOutstanding(a), a.currency), 0);
  const activeReceivables = receivables.filter(r => r.status === 'active' && Number(r.outstanding_amount) > 0);
  const activeGoals = goals.filter(g => g.status === 'active');
  const goalTotals = activeGoals.reduce((s, g) => { const p = goalProgress(g, live); return { saved: s.saved + toBase(p.saved, g.currency), target: s.target + toBase(p.target, g.currency) }; }, { saved: 0, target: 0 });
  const planTotals = activePlans.reduce((s, p) => ({ saved: s.saved + toBase(p.saved, p.currency), target: s.target + toBase(p.target, p.currency) }), { saved: 0, target: 0 });
  const bills = billsSummary(occurrences, payments, today, toBase);
  return {
    position,
    loans: { count: activeLoans.length + creditCardDebts.length, total: activeLoans.reduce((s, l) => s + toBase(Number(l.outstanding_principal) || 0, l.currency), 0) + creditCardDebtTotal },
    creditCards: { count: creditCardDebts.length, total: creditCardDebtTotal },
    receivables: { count: activeReceivables.length, total: activeReceivables.reduce((s, r) => s + toBase(Number(r.outstanding_amount) || 0, r.currency), 0) },
    goals: { count: activeGoals.length + activePlans.length, saved: goalTotals.saved + planTotals.saved, target: goalTotals.target + planTotals.target, percent: goalTotals.target + planTotals.target > 0 ? Math.min(100, ((goalTotals.saved + planTotals.saved) / (goalTotals.target + planTotals.target)) * 100) : 0 },
    plans: { count: activePlans.length, saved: planTotals.saved, target: planTotals.target },
    bills: { ...bills, next: bills.upcoming[0] || null },
  };
}

export default function usePlanning(c) {
  const cloud = !!c.cloudMode;
  const [data, setData] = useState({ loans: [], receivables: [], goals: [], allocations: [], planAllocations: [], occurrences: [], payments: [] });
  const [loaded, setLoaded] = useState(!cloud);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!cloud) { setLoaded(true); return; }
    const today = todayKey();
    setError('');
    const requests = await Promise.allSettled([
      listLoans(), listReceivables(), listGoals(),
      listOccurrences(shift(today, 62), shift(today, -62)),
      listBillPayments(`${shift(today, -62)}T00:00:00Z`), listPlanAllocations(),
    ]);
    const values = requests.map(result => result.status === 'fulfilled' ? (result.value || []) : []);
    const [loans, receivables, goals, occurrences, payments, planAllocations] = values;
    const goalAllocationResults = await Promise.allSettled((goals || []).map(goal => listGoalAllocations(goal.id)));
    const allocations = goalAllocationResults.flatMap(result => result.status === 'fulfilled' ? (result.value || []) : []);
    const failed = requests.some(result => result.status === 'rejected') || goalAllocationResults.some(result => result.status === 'rejected');
    setData({ loans, receivables, goals, allocations, planAllocations, occurrences, payments });
    setError(failed
      ? 'Some financial data could not be loaded. Check your connection and database setup, then tap refresh. Your records have not been changed.'
      : '');
    setLoaded(true);
  }, [cloud]);

  useEffect(() => {
    reload().catch(error => {
      setError(error?.message || 'Financial data could not be loaded. Please refresh.');
      setLoaded(true);
    });
  }, [reload, c.accountsView]);

  const accounts = useMemo(() => planningAccounts(c.accountsView || []), [c.accountsView]);
  const toBase = c.toBase;
  const today = todayKey();
  const subscriptionData = useMemo(() => subscriptionBillData(c.subscriptions || [], today, shift(today, 62)), [c.subscriptions, today]);
  const integrations = useMemo(() => ({
    occurrences: [...data.occurrences, ...subscriptionData.occurrences],
    payments: [...data.payments, ...subscriptionData.payments],
  }), [data.occurrences, data.payments, subscriptionData]);
  const plans = useMemo(() => planGoalData(c.plans || [], data.planAllocations, toBase || ((v) => v)), [c.plans, data.planAllocations, toBase]);
  const summary = useMemo(() => planningSummary({ ...data, ...integrations, plans: c.plans || [], accounts, toBase: toBase || ((v) => v), today }), [data, integrations, c.plans, accounts, toBase, today]);
  return { ...data, accounts, plans, subscriptionData, summary, loaded, error, reload, cloud };
}
