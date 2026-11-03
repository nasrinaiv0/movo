import { useCallback, useEffect, useMemo, useState } from 'react';
import { financialPosition, goalProgress } from './accounting';
import { billsSummary } from './bills';
import { listBillPayments, listOccurrences } from './billsRepository';
import { listGoalAllocations, listGoals, listLoans, listReceivables } from './obligationsRepository';

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

export function planningSummary({ accounts = [], loans = [], receivables = [], goals = [], allocations = [], occurrences = [], payments = [], toBase = (v) => v, today = todayKey() }) {
  const live = allocations.filter(a => a.status === 'allocated');
  const position = financialPosition({
    accounts: accounts.map(a => ({ ...a, balance: toBase(Number(a.balance) || 0, a.currency), card_kind: a.account_type === 'card' ? (a.cardKind === 'credit' ? 'credit' : a.cardKind === 'debit' ? 'debit' : 'unknown') : undefined })),
    loans: loans.map(l => ({ ...l, outstanding_balance: toBase(Number(l.outstanding_principal) || 0, l.currency) })),
    receivables: receivables.map(r => ({ ...r, outstanding_balance: toBase(Number(r.outstanding_amount) || 0, r.currency) })),
    goalAllocations: live.map(a => ({ ...a, amount: toBase(Number(a.amount) || 0, a.currency) })),
  });
  const activeLoans = loans.filter(l => l.status === 'active' && Number(l.outstanding_principal) > 0);
  const activeReceivables = receivables.filter(r => r.status === 'active' && Number(r.outstanding_amount) > 0);
  const activeGoals = goals.filter(g => g.status === 'active');
  const goalTotals = activeGoals.reduce((s, g) => { const p = goalProgress(g, live); return { saved: s.saved + toBase(p.saved, g.currency), target: s.target + toBase(p.target, g.currency) }; }, { saved: 0, target: 0 });
  const bills = billsSummary(occurrences, payments, today, toBase);
  return {
    position,
    loans: { count: activeLoans.length, total: activeLoans.reduce((s, l) => s + toBase(Number(l.outstanding_principal) || 0, l.currency), 0) },
    receivables: { count: activeReceivables.length, total: activeReceivables.reduce((s, r) => s + toBase(Number(r.outstanding_amount) || 0, r.currency), 0) },
    goals: { count: activeGoals.length, saved: goalTotals.saved, target: goalTotals.target, percent: goalTotals.target > 0 ? Math.min(100, (goalTotals.saved / goalTotals.target) * 100) : 0 },
    bills: { ...bills, next: bills.upcoming[0] || null },
  };
}

export default function usePlanning(c) {
  const cloud = !!c.cloudMode;
  const [data, setData] = useState({ loans: [], receivables: [], goals: [], allocations: [], occurrences: [], payments: [] });
  const [loaded, setLoaded] = useState(!cloud);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!cloud) { setLoaded(true); return; }
    const today = todayKey();
    const settle = (p) => p.then(v => v || [], () => null);
    const [loans, receivables, goals, occurrences, payments] = await Promise.all([
      settle(listLoans()), settle(listReceivables()), settle(listGoals()),
      settle(listOccurrences(shift(today, 62), shift(today, -62))), settle(listBillPayments(`${shift(today, -62)}T00:00:00Z`)),
    ]);
    const allocations = (await Promise.all((goals || []).map(g => listGoalAllocations(g.id).catch(() => [])))).flat();
    setData({ loans: loans || [], receivables: receivables || [], goals: goals || [], allocations, occurrences: occurrences || [], payments: payments || [] });
    setError([loans, receivables, goals].some(v => v === null) ? 'Some financial records could not be loaded. Pull to refresh or try again.' : '');
    setLoaded(true);
  }, [cloud]);

  useEffect(() => { reload().catch(() => setLoaded(true)); }, [reload]);

  const accounts = useMemo(() => planningAccounts(c.accountsView || []), [c.accountsView]);
  const toBase = c.toBase;
  const summary = useMemo(() => planningSummary({ ...data, accounts, toBase: toBase || ((v) => v) }), [data, accounts, toBase]);
  return { ...data, accounts, summary, loaded, error, reload, cloud };
}
