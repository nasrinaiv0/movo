import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AccountOptions } from '../components/AccountPicker';
import { RootHeader } from '../components/ui';
import { money } from '../lib/format';
import { t as tr } from '../lib/i18n';
import { allocateToGoal, createGoal, createLoan, createReceivable, listGoals, listGoalAllocations, listLoans, listReceivables, recordLoanEvent, recordReceivableEvent, releaseGoalAllocation } from '../lib/obligationsRepository';
import { financialPosition, goalProgress } from '../lib/accounting';
import BillsPanel from '../components/BillsPanel';

const TABS = ['Overview', 'Bills', 'Loans & debts', 'Owed to you', 'Goals'];
const blankLoan = { name: '', obligation_type: 'loan', lender: '', principal_amount: '', currency: 'PHP', interest_rate: '0', due_date: '', account_id: '', new_proceeds: false, notes: '' };
const blankReceivable = { name: '', counterparty: '', reason: '', opening_amount: '', currency: 'PHP', due_date: '', account_id: '', new_lending: false, notes: '' };
const blankGoal = { name: '', target_amount: '', currency: 'PHP', target_date: '', notes: '' };
const blankEvent = { event_type: '', amount: '', currency: 'PHP', account_id: '', note: '' };
const cash = (value, currency) => money(Number(value) || 0, currency || 'PHP');

export default function FinancialPlanning({ c }) {
  const [tab, setTab] = useState('Overview');
  const [loans, setLoans] = useState([]);
  const [receivables, setReceivables] = useState([]);
  const [goals, setGoals] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loanForm, setLoanForm] = useState({ ...blankLoan, currency: c.base || 'PHP' });
  const [receivableForm, setReceivableForm] = useState({ ...blankReceivable, currency: c.base || 'PHP' });
  const [goalForm, setGoalForm] = useState({ ...blankGoal, currency: c.base || 'PHP' });
  const [eventForm, setEventForm] = useState(blankEvent);
  const [selected, setSelected] = useState(null);
  const [allocationForm, setAllocationForm] = useState({ goal_id: '', account_id: '', amount: '', currency: c.base || 'PHP', note: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const accounts = (c.accountsView || []).filter(a => !a.is_archived && a.account_type !== 'card' || (!a.is_archived && a.account_type === 'card' && a.cardKind === 'debit'));

  const reload = useCallback(async () => {
    if (!c.cloudMode) return;
    const [l, r, g] = await Promise.all([listLoans(), listReceivables(), listGoals()]);
    const alloc = await Promise.all((g || []).map(goal => listGoalAllocations(goal.id).catch(() => [])));
    setLoans(l || []); setReceivables(r || []); setGoals(g || []); setAllocations(alloc.flat());
  }, [c.cloudMode]);

  useEffect(() => { let live = true; reload().catch(e => { if (live) setError(e.message || 'Could not load financial records.'); }); return () => { live = false; }; }, [reload]);

  const spendableAccounts = accounts.filter(a => ['bank','e_wallet','cash'].includes(a.account_type));

  const position = useMemo(() => financialPosition({
    accounts: accounts.map(a => ({ ...a, balance: c.toBase ? c.toBase(a.balance, a.currency) : a.balance, card_kind: a.account_type === 'card' ? (a.cardKind === 'credit' ? 'credit' : a.cardKind === 'debit' ? 'debit' : 'unknown') : undefined })),
    loans: loans.map(l => ({ ...l, outstanding_balance: c.toBase ? c.toBase(l.outstanding_principal, l.currency) : l.outstanding_principal })),
    receivables: receivables.map(r => ({ ...r, outstanding_balance: c.toBase ? c.toBase(r.outstanding_amount, r.currency) : r.outstanding_amount })),
    goalAllocations: allocations.filter(a => a.status === 'allocated').map(a => ({ ...a, amount: c.toBase ? c.toBase(a.amount, a.currency) : a.amount })),
  }), [accounts, loans, receivables, allocations, c.toBase]);

  const run = async (fn, success) => {
    setBusy(true); setError(''); setNotice('');
    try { await fn(); await reload(); if (c.refreshFinance) await c.refreshFinance(); setNotice(success); return true; }
    catch (e) { setError(e?.message || 'Could not save. Please try again.'); return false; }
    finally { setBusy(false); }
  };
  const beginEvent = (kind, item) => {
    setSelected({ kind, item });
    setEventForm({ ...blankEvent, event_type: kind === 'loan' ? 'principal_payment' : 'collected', currency: item.currency || 'PHP', account_id: item.account_id || spendableAccounts.find(a => a.currency === item.currency)?.id || '' });
  };
  const saveEvent = (e) => {
    e.preventDefault();
    if (!selected) return;
    const input = { ...eventForm, amount: Number(eventForm.amount), currency: selected.item.currency || eventForm.currency };
    const fn = selected.kind === 'loan'
      ? () => recordLoanEvent({ ...input, loan_id: selected.item.id })
      : () => recordReceivableEvent({ ...input, receivable_id: selected.item.id });
    run(fn, 'Payment or adjustment recorded.').then(ok => { if (ok) { setSelected(null); setEventForm(blankEvent); } });
  };

  if (!c.cloudMode) return <>
    <RootHeader title={tr('Financial planning')} onSearch={c.openSearch} onBell={() => c.go('Notifications')} onSettings={() => c.go('Settings')} unread={c.unread} />
    <section className="card pad"><h2>{tr('Sign in to manage your financial records')}</h2><p>{tr('Bills, loans, debts, receivables and goal allocations use secure cloud records so balances stay consistent across your devices.')}</p><button type="button" className="primary-button" onClick={() => c.go('Sign in')}>{tr('Sign in')}</button></section>
  </>;

  return <>
    <RootHeader title={tr('Financial planning')} subtitle={tr('Bills, loans, debts, money owed to you and goals.')} onSearch={c.openSearch} onBell={() => c.go('Notifications')} onSettings={() => c.go('Settings')} unread={c.unread} />
    <div className="chip-bar" role="tablist" aria-label={tr('Financial planning sections')}>{TABS.map(t => <button type="button" role="tab" aria-selected={tab === t} className={`chip${tab === t ? ' active' : ''}`} key={t} onClick={() => { setTab(t); setError(''); setNotice(''); }}>{tr(t)}</button>)}</div>
    {error && <p className="app-alert" role="alert">{error}</p>}{notice && <p className="form-note" role="status">{notice}</p>}

    {tab === 'Overview' && <>
      <section className="stat-grid" aria-label={tr('Financial position')}>
        {[['Assets', position.assets], ['Liabilities', position.liabilities], ['Net worth', position.netWorth], ['Available money', position.availableMoney]].map(([label, value]) => <article className="card stat-card" key={label}><span>{tr(label)}</span><strong>{cash(value, c.base)}</strong></article>)}
      </section>
      <section className="card pad"><h2>{tr('At a glance')}</h2><p>{tr('Outstanding loans and debts')}: <strong>{loans.filter(l => l.status === 'active').length}</strong></p><p>{tr('People who owe you')}: <strong>{receivables.filter(r => r.status === 'active').length}</strong></p><p>{tr('Active savings goals')}: <strong>{goals.filter(g => g.status === 'active').length}</strong></p><p className="form-note">{tr('Loans are liabilities; receivables are assets but are not available cash. Goal allocations reserve existing funds and do not create new assets.')}</p></section>
    </>}

    {tab === 'Bills' && <BillsPanel c={c} accounts={(c.accountsView || []).filter(a => !a.is_archived)} onChanged={c.refreshFinance} />}

    {tab === 'Loans & debts' && <>
      <form className="card pad sheet-form" onSubmit={e => { e.preventDefault(); run(() => createLoan({ ...loanForm, currency: loanForm.currency || c.base }, c.session?.user?.id), 'Loan or debt added.').then(ok => { if (ok) setLoanForm({ ...blankLoan, currency: c.base || 'PHP' }); }); }}>
        <h2>{tr('Add a loan or debt')}</h2>
        <label>{tr('Record type')}<select value={loanForm.obligation_type} onChange={e => setLoanForm({ ...loanForm, obligation_type: e.target.value })}><option value="loan">{tr('Loan')}</option><option value="debt">{tr('Other debt')}</option></select></label>
        <label>{tr('Name')}<input required maxLength="120" value={loanForm.name} onChange={e => setLoanForm({ ...loanForm, name: e.target.value })} /></label>
        <label>{tr('Lender / creditor')}<input maxLength="120" value={loanForm.lender} onChange={e => setLoanForm({ ...loanForm, lender: e.target.value })} /></label>
        <label>{tr('Original principal')}<input required type="number" min="0.01" step="0.01" value={loanForm.principal_amount} onChange={e => setLoanForm({ ...loanForm, principal_amount: e.target.value })} /></label>
        <label>{tr('Interest rate (% per year)')}<input type="number" min="0" step="0.001" value={loanForm.interest_rate} onChange={e => setLoanForm({ ...loanForm, interest_rate: e.target.value })} /></label>
        <label className="legal-disclosure-check"><input type="checkbox" checked={loanForm.new_proceeds} onChange={e => setLoanForm({ ...loanForm, new_proceeds: e.target.checked })} /><span>{tr('This is a new loan draw; add the proceeds to the account balance')}</span></label>
        <label>{tr('Payment account')}<select required={loanForm.new_proceeds} value={loanForm.account_id} onChange={e => setLoanForm({ ...loanForm, account_id: e.target.value })}><option value="">{tr('Choose account (optional)')}</option><AccountOptions accounts={spendableAccounts.filter(a => a.currency === (loanForm.currency || c.base))} currency /></select></label>
        <label>{tr('Due date')}<input type="date" value={loanForm.due_date} onChange={e => setLoanForm({ ...loanForm, due_date: e.target.value })} /></label>
        <button className="primary-button" disabled={busy}>{tr('Save loan / debt')}</button>
      </form>
      {loans.map(l => <article className="card pad" key={l.id}><div className="detail-row"><span><strong>{l.name}</strong><small>{tr(l.obligation_type || 'loan')} · {l.lender || tr('Creditor not set')}</small></span><b>{cash(l.outstanding_principal, l.currency)}</b></div><p className="form-note">{l.due_date ? `${tr('Due')}: ${l.due_date}` : tr('No due date set')} · {tr(l.status)}</p><button className="secondary-button" type="button" onClick={() => beginEvent('loan', l)}>{tr('Record payment / interest')}</button></article>)}
      {!loans.length && <p className="empty">{tr('No loans or debts recorded yet.')}</p>}
    </>}

    {tab === 'Owed to you' && <>
      <form className="card pad sheet-form" onSubmit={e => { e.preventDefault(); run(() => createReceivable({ ...receivableForm, currency: receivableForm.currency || c.base }, c.session?.user?.id), 'Receivable added.').then(ok => { if (ok) setReceivableForm({ ...blankReceivable, currency: c.base || 'PHP' }); }); }}>
        <h2>{tr('Record money owed to you')}</h2>
        <label>{tr('Description')}<input required maxLength="120" value={receivableForm.name} onChange={e => setReceivableForm({ ...receivableForm, name: e.target.value })} /></label>
        <label>{tr('Person / organization')}<input maxLength="120" value={receivableForm.counterparty} onChange={e => setReceivableForm({ ...receivableForm, counterparty: e.target.value })} /></label>
        <label>{tr('Reason')}<input maxLength="500" value={receivableForm.reason} onChange={e => setReceivableForm({ ...receivableForm, reason: e.target.value })} /></label>
        <label>{tr('Amount owed')}<input required type="number" min="0.01" step="0.01" value={receivableForm.opening_amount} onChange={e => setReceivableForm({ ...receivableForm, opening_amount: e.target.value })} /></label>
        <label className="legal-disclosure-check"><input type="checkbox" checked={receivableForm.new_lending} onChange={e => setReceivableForm({ ...receivableForm, new_lending: e.target.checked })} /><span>{tr('This is money I am lending now; subtract it from my account')}</span></label>
        <label>{tr('Deposit / collection account')}<select required={receivableForm.new_lending} value={receivableForm.account_id} onChange={e => setReceivableForm({ ...receivableForm, account_id: e.target.value })}><option value="">{tr('Choose account (optional)')}</option><AccountOptions accounts={spendableAccounts} currency /></select></label>
        <label>{tr('Due date')}<input type="date" value={receivableForm.due_date} onChange={e => setReceivableForm({ ...receivableForm, due_date: e.target.value })} /></label>
        <button className="primary-button" disabled={busy}>{tr('Save receivable')}</button>
      </form>
      {receivables.map(r => <article className="card pad" key={r.id}><div className="detail-row"><span><strong>{r.name}</strong><small>{r.counterparty || tr('Person not set')} · {r.reason || tr('No reason added')}</small></span><b>{cash(r.outstanding_amount, r.currency)}</b></div><p className="form-note">{r.due_date ? `${tr('Due')}: ${r.due_date}` : tr('No due date set')} · {tr(r.status)}</p><button className="secondary-button" type="button" onClick={() => beginEvent('receivable', r)}>{tr('Record collection')}</button></article>)}
      {!receivables.length && <p className="empty">{tr('No one currently owes you money in MOVO.')}</p>}
    </>}

    {tab === 'Goals' && <>
      <form className="card pad sheet-form" onSubmit={e => { e.preventDefault(); run(() => createGoal({ ...goalForm, currency: goalForm.currency || c.base }, c.session?.user?.id), 'Savings goal created.').then(ok => { if (ok) setGoalForm({ ...blankGoal, currency: c.base || 'PHP' }); }); }}>
        <h2>{tr('Create a savings goal')}</h2>
        <label>{tr('Goal name')}<input required maxLength="120" value={goalForm.name} onChange={e => setGoalForm({ ...goalForm, name: e.target.value })} /></label>
        <label>{tr('Target amount')}<input required type="number" min="0.01" step="0.01" value={goalForm.target_amount} onChange={e => setGoalForm({ ...goalForm, target_amount: e.target.value })} /></label>
        <label>{tr('Target date')}<input type="date" value={goalForm.target_date} onChange={e => setGoalForm({ ...goalForm, target_date: e.target.value })} /></label>
        <button className="primary-button" disabled={busy}>{tr('Create goal')}</button>
      </form>
      <form className="card pad sheet-form" onSubmit={e => { e.preventDefault(); run(() => allocateToGoal(allocationForm), 'Funds allocated to goal.').then(ok => { if (ok) setAllocationForm({ ...allocationForm, amount: '' }); }); }}>
        <h2>{tr('Allocate existing funds')}</h2>
        <label>{tr('Goal')}<select required value={allocationForm.goal_id} onChange={e => { const goal = goals.find(g => g.id === e.target.value); setAllocationForm({ ...allocationForm, goal_id: e.target.value, currency: goal?.currency || 'PHP' }); }}><option value="">{tr('Choose goal')}</option>{goals.filter(g => g.status === 'active').map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
        <label>{tr('Account to reserve from')}<select required value={allocationForm.account_id} onChange={e => { const account = accounts.find(a => a.id === e.target.value); setAllocationForm({ ...allocationForm, account_id: e.target.value, currency: account?.currency || 'PHP' }); }}><option value="">{tr('Choose account')}</option><AccountOptions accounts={spendableAccounts} currency /></select></label>
        <label>{tr('Amount')}<input required type="number" min="0.01" step="0.01" value={allocationForm.amount} onChange={e => setAllocationForm({ ...allocationForm, amount: e.target.value })} /></label>
        <button className="primary-button" disabled={busy}>{tr('Allocate funds')}</button>
      </form>
      {goals.map(g => { const progress = goalProgress(g, allocations.filter(a => a.currency === g.currency)); return <article className="card pad" key={g.id}><div className="detail-row"><span><strong>{g.name}</strong><small>{tr('Target')}: {cash(g.target_amount, g.currency)}</small></span><b>{cash(progress.saved, g.currency)}</b></div><div className="progress-track"><span style={{ width: `${progress.percent}%` }} /></div><p className="form-note">{Math.round(progress.percent)}% · {cash(progress.remaining, g.currency)} {tr('remaining')}</p></article>; })}
      {allocations.filter(a => a.status === 'allocated').map(a => <div className="card pad detail-row" key={a.id}><span><strong>{goals.find(g => g.id === a.goal_id)?.name || tr('Savings goal')}</strong><small>{accounts.find(ac => ac.id === a.account_id)?.name || tr('Account')}</small></span><b>{cash(a.amount, a.currency)}</b><button className="secondary-button" type="button" onClick={() => run(() => releaseGoalAllocation(a.id), 'Goal allocation released.')}>{tr('Release')}</button></div>)}
      {!goals.length && <p className="empty">{tr('Create a goal, then allocate money already in an account. This does not add to your balance.')}</p>}
    </>}

    {selected && <section className="card pad"><form className="sheet-form" onSubmit={saveEvent}><h2>{tr(selected.kind === 'loan' ? 'Record loan event' : 'Record collection')}</h2><p>{selected.item.name}</p><label>{tr('Event type')}<select value={eventForm.event_type} onChange={e => setEventForm({ ...eventForm, event_type: e.target.value })}>{(selected.kind === 'loan' ? [['principal_payment','Principal repayment'],['interest_payment','Interest payment'],['fee','Fee'],['principal_increase','Increase principal']] : [['collected','Collection'],['amount_increased','Increase amount owed'],['written_off','Write off']]).map(([v,l]) => <option value={v} key={v}>{tr(l)}</option>)}</select></label><label>{tr('Amount')}<input required type="number" min="0.01" step="0.01" value={eventForm.amount} onChange={e => setEventForm({ ...eventForm, amount: e.target.value })} /></label><label>{tr('Account')}<select required={!(selected.kind === 'receivable' && eventForm.event_type === 'written_off')} value={eventForm.account_id} onChange={e => setEventForm({ ...eventForm, account_id: e.target.value })}><option value="">{tr('No cash account')}</option>{spendableAccounts.filter(a => a.currency === selected.item.currency).map(a => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></label><label>{tr('Note')}<input maxLength="1000" value={eventForm.note} onChange={e => setEventForm({ ...eventForm, note: e.target.value })} /></label><div className="sheet-actions"><button type="button" className="secondary-button" onClick={() => setSelected(null)}>{tr('Cancel')}</button><button className="primary-button" disabled={busy}>{tr('Save event')}</button></div></form></section>}
  </>;
}
