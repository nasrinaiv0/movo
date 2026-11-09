import React, { useState } from 'react';
import Icon from '../components/Icon';
import BrandLogo from '../components/BrandLogo';
import AccountPicker, { accountName, accountKind } from '../components/AccountPicker';
import { Chips, Money, SectionTitle, Sheet, Skeleton, SubHeader } from '../components/ui';
import { formatDate, money, shown } from '../lib/format';
import { t as tr } from '../lib/i18n';
import { deleteRecord, useConfirm } from '../components/ConfirmDialog';
import { allocateToGoal, allocatePlanFunds, createGoal, createLoan, createReceivable, updateLoan, deleteLoan, updateReceivable, deleteReceivable, recordLoanEvent, recordReceivableEvent, releaseGoalAllocation, releasePlanFundingAllocation } from '../lib/obligationsRepository';
import { goalProgress } from '../lib/accounting';
import { creditCardOutstanding } from '../lib/financialPlanningIntegrations';
import { creditCardPlanningMetrics, creditRepaymentEstimate } from '../lib/creditCard';
import { cardNetworkLogoUrl, institutionLogoCandidates } from '../lib/institutions';
import { convert } from '../lib/fx';
import usePlanning from '../lib/usePlanning';
import BillsPanel from '../components/BillsPanel';

/*
 * Financial planning: bills, loans and debts, money owed to you, and savings goals, with the overall position
 * (assets, liabilities, net worth, money available). Records what the person says happened; it never moves money.
 */
const TABS = [['overview', 'Overview'], ['cards', 'Credit cards'], ['bills', 'Bills'], ['loans', 'Loans & debts'], ['owed', 'Owed to you'], ['goals', 'Goals & Plans']];
const blankLoan = (cur) => ({ name: '', obligation_type: 'loan', lender: '', principal_amount: '', currency: cur, interest_rate: '0', inconsistent_interest: false, interest_months: '12', monthly_interest_rates: Array(12).fill(''), due_date: '', account_id: '', new_proceeds: false, notes: '' });
const blankReceivable = (cur) => ({ name: '', counterparty: '', reason: '', opening_amount: '', currency: cur, due_date: '', account_id: '', new_lending: false, notes: '' });
const blankGoal = (cur) => ({ name: '', target_amount: '', currency: cur, target_date: '', notes: '' });
const LOAN_EVENTS = [['principal_payment', 'Principal repayment'], ['interest_payment', 'Interest payment'], ['fee', 'Fee'], ['principal_increase', 'Increase principal']];
const RECEIVABLE_EVENTS = [['collected', 'Collection'], ['amount_increased', 'Increase amount owed'], ['written_off', 'Write off']];
const STATUS = { active: 'Active', paid_off: 'Paid off', closed: 'Closed', collected: 'Collected', written_off: 'Written off', cancelled: 'Cancelled', completed: 'Completed', archived: 'Archived' };
const pct = (part, whole) => (whole > 0 ? Math.max(0, Math.min(100, (part / whole) * 100)) : 0);

export default function FinancialPlanning({ c }) {
  const base = c.base || 'PHP';
  const { show } = c;
  const p = usePlanning(c);
  const { summary } = p;
  const [tab, setTab] = useState(() => (TABS.some(([k]) => k === c.planTab) ? c.planTab : 'overview'));
  const [sheet, setSheet] = useState(null); // { kind: 'loan' | 'receivable' | 'goal' | 'allocate' | 'event' | 'bill', ... }
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cardDraft, setCardDraft] = useState(null);
  const [creditSpendDraft, setCreditSpendDraft] = useState(null);
  const [expandedCreditCards, setExpandedCreditCards] = useState({});
  const creditCards = (c.accountsView || []).filter(a => !a.is_archived && a.account_type === 'card' && a.cardKind === 'credit');
  const cardStyles = c.prefs?.accountStyles || {};
  const cardPayments = c.prefs?.creditCardPayments || {};
  const creditSpendLogs = c.prefs?.creditSpendLogs || {};
  const saveCreditSpendLog = (id, entry) => c.setPref?.('creditSpendLogs', { ...creditSpendLogs, [id]: [...(creditSpendLogs[id] || []), entry] });
  const saveCardStyle = (id, patch) => c.setPref?.('accountStyles', { ...cardStyles, [id]: { ...(cardStyles[id] || {}), ...patch } });
  const saveCardPayment = (id, payment) => c.setPref?.('creditCardPayments', { ...cardPayments, [id]: [...(cardPayments[id] || []), payment] });
  const activeTransactionIds = Array.isArray(c.txs) ? new Set(c.txs.map(tx => String(tx.id))) : null;
  const cash = (value, currency) => shown(show, money(Number(value) || 0, currency || base));
  const spendable = p.accounts.filter(a => ['bank', 'e_wallet', 'cash'].includes(a.account_type));
  const inCurrency = (cur) => spendable.filter(a => a.currency === cur);
  const reservedForAccount = (accountId) => {
    // Reservations and account balances are both expressed in the source account currency here.
    const goalReserved = live
      .filter(item => item.account_id === accountId)
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const planReserved = (p.planAllocations || [])
      .filter(item => item.status === 'allocated' && item.account_id === accountId)
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    return goalReserved + planReserved;
  };
  const availableForAllocation = (account) => Math.max(0, (Number(account?.balance) || 0) - reservedForAccount(account?.id));
  const pick = (k) => { setTab(k); setError(''); setNotice(''); };

  const open = (kind, init) => { setError(''); setNotice(''); setForm(init); setSheet({ kind }); };
  const set = (patch) => setForm(f => ({ ...f, ...patch }));
  const releasePlanAllocation = (planId, allocationId) => releasePlanFundingAllocation(allocationId);

  const confirm = useConfirm();
  /* Loans and receivables are archived, never erased: recorded payments, collections and balances stay. Nothing
     changes until the person confirms; a failure is shown in the dialog. */
  const removeObligation = (kind, item) => confirm({
    ...deleteRecord(item.name, { impact: kind === 'loan'
      ? tr('Recorded payments and account balances will be kept. This does not cancel the debt with your lender.')
      : tr('Recorded collections and account balances will remain unchanged. This does not forgive or cancel a real-world debt.') }),
    failure: tr('Could not delete it. Nothing was changed. Please try again.'),
    action: async () => {
      if (kind === 'loan') await deleteLoan(item.id, c.session?.user?.id); else await deleteReceivable(item.id, c.session?.user?.id);
      const success = kind === 'loan' ? 'Loan or debt deleted.' : 'Receivable deleted.';
      setNotice(tr(success)); c.notify?.(tr(success));
      // Refresh the totals; a failed refresh never turns a finished deletion into an error.
      await Promise.resolve(p.reload()).catch(() => {});
      if (c.refreshFinance) await Promise.resolve(c.refreshFinance()).catch(() => {});
    },
  });
  const run = async (fn, success) => {
    if (busy) return false;
    setBusy(true); setError(''); setNotice('');
    try {
      await fn(); setSheet(null); await p.reload(); if (c.refreshFinance) await c.refreshFinance();
      setNotice(tr(success)); c.notify?.(tr(success)); return true;
    } catch (e) { setError(e?.message || tr('Could not save. Please try again.')); return false; }
    finally { setBusy(false); }
  };

  const header = <SubHeader title={tr('Financial planning')} onBack={() => c.go('Menu')} right={p.cloud ? <button type="button" className="round-button accent" aria-label={tr('Add')} onClick={() => setSheet({ kind: 'add' })}><Icon name="plus" size={20} /></button> : null} />;
  const hero = <section className="card sub-hero fp-hero" aria-label={tr('Financial position')}>
    <small>{tr('Net worth')}</small>
    <div className="balance-amount"><Money value={summary.position.netWorth} show={show} currency={base} /></div>
    <div className="sub-hero-row">
      <span><b><Money value={summary.position.assets} show={show} currency={base} /></b><small>{tr('Assets')}</small></span>
      <span><b><Money value={summary.position.liabilities} show={show} currency={base} /></b><small>{tr('Liabilities')}</small></span>
      <span><b><Money value={summary.position.availableMoney} show={show} currency={base} /></b><small>{tr('Available money')}</small></span>
    </div>
  </section>;

  if (!p.cloud) return <>
    {header}
    {hero}
    <button type="button" className="budget-empty" onClick={() => c.go('Sign in')}><Icon name="lock" size={20} /><span><strong>{tr('Sign in to manage your financial records')}</strong><small>{tr('Bills, loans, debts, receivables and goal allocations use secure cloud records so balances stay consistent across your devices.')}</small></span></button>
  </>;

  const loans = p.loans.filter(loan => loan.status !== 'archived' && !loan.is_archived); const receivables = p.receivables.filter(item => item.status !== 'archived' && !item.is_archived); const goals = p.goals;
  const plans = p.plans;
  const creditCardDebts = p.accounts.filter(a => creditCardOutstanding(a) > 0);
  const live = p.allocations.filter(a => a.status === 'allocated');
  const bills = summary.bills;
  const glance = [
    { key: 'bills', icon: 'receipt', tone: 'orange', title: 'Bills', sub: bills.overdueCount ? tr('{n} overdue', { n: bills.overdueCount }) : bills.next ? tr('Next due {date}', { date: formatDate(bills.next.due_date) }) : tr('Nothing overdue or due in the current billing cycle.'), amount: bills.totalDue, note: tr('Overdue + current cycle'), alert: bills.overdueCount > 0 },
    { key: 'loans', icon: 'bank', tone: 'red', title: 'Loans & debts', sub: summary.loans.count ? tr('{n} active', { n: summary.loans.count }) : tr('No loans or debts recorded yet.'), amount: summary.loans.total, note: tr('Outstanding') },
    { key: 'owed', icon: 'user', tone: 'green', title: 'Owed to you', sub: summary.receivables.count ? tr('{n} active', { n: summary.receivables.count }) : tr('No one currently owes you money in MOVO.'), amount: summary.receivables.total, note: tr('To collect') },
    { key: 'goals', icon: 'target', tone: 'blue', title: 'Goals & Plans', sub: summary.goals.count ? tr('{n}% saved', { n: Math.round(summary.goals.percent) }) : tr('No goals or plans yet.'), amount: summary.goals.saved, note: tr('Saved') },
  ];

  const statusChip = (s) => <em className={`fp-status is-${s}`}>{tr(STATUS[s] || s)}</em>;
  const due = (d) => (d ? tr('Due {date}', { date: formatDate(d) }) : tr('No due date set'));

  // Until the cloud records arrive, show their shape rather than a ₱0.00 net worth.
  if (!p.loaded && !p.error) return <>
    {header}
    <section className="card sub-hero fp-hero"><Skeleton figure lines={2} /></section>
    <section className="card pad"><Skeleton lines={4} /></section>
  </>;
  return <>
    {header}
    {hero}
    <Chips items={TABS.map(([k, l]) => ({ key: k, label: tr(l), dot: k === 'bills' && bills.overdueCount > 0 }))} value={tab} onChange={pick} label={tr('Financial planning sections')} />
    {(error || p.error) && <div className="app-alert" role="alert"><span>{error || tr(p.error)}</span>{p.error && <button type="button" className="link-button" aria-label="↻" onClick={() => p.reload()}>↻</button>}</div>}
    {notice && <p className="form-note fp-notice" role="status">{notice}</p>}

    {tab === 'overview' && <>
      <SectionTitle>{tr('At a glance')}</SectionTitle>
      <div className="card list-card fp-glance">{glance.map(g => <button type="button" className="fp-row" key={g.key} onClick={() => pick(g.key)}>
        <span className={`stat-icon tone-${g.tone}`}><Icon name={g.icon} size={17} strokeWidth={2} /></span>
        <span className="fp-main"><strong>{tr(g.title)}</strong><small className={g.alert ? 'is-alert' : ''}>{g.sub}</small></span>
        <span className="fp-amount"><b>{cash(g.amount, base)}</b><small>{g.note}</small></span>
        <Icon name="chevron" size={15} />
      </button>)}</div>
      {summary.position.reservedForGoals > 0 && <p className="form-note">{tr('{amount} of your money is set aside for goals and is not counted as available.', { amount: cash(summary.position.reservedForGoals, base) })}</p>}
      <p className="form-note">{tr('Loans are liabilities; receivables are assets but are not available cash. Goal allocations reserve existing funds and do not create new assets.')}</p>
    </>}

    {tab === 'cards' && <>
      <SectionTitle>{tr('Credit cards')}</SectionTitle>
      {!creditCards.length ? <div className="budget-empty"><Icon name="credit-card" size={20} /><span><strong>{tr('No credit cards added yet.')}</strong><small>{tr('Add a credit card in Wallet to track its balance, due date and payments.')}</small></span></div> : creditCards.map(card => {
        const style = cardStyles[card.id] || {};
        const dueDate = style.paymentDueDate || '';
        const payments = cardPayments[card.id] || [];
        const creditSpends = (creditSpendLogs[card.id] || []).filter(entry => !entry.transaction_id || !activeTransactionIds || activeTransactionIds.has(String(entry.transaction_id)));
        const metrics = creditCardPlanningMetrics({ card, transactions: c.txs || [], payments, annualInterestRate: style.annualInterestRate, statementBalance: style.statementBalance, convertAmount: (amount, from, to) => convert(amount, from, to, c.fx?.rates) });
        const spendLimit = Number(style.creditSpendLimit) > 0 ? Number(style.creditSpendLimit) : metrics.limit;
        const spendLimitPercent = spendLimit > 0 ? Math.max(0, metrics.amountSpent / spendLimit * 100) : null;
        const paidMonths = metrics.monthsPaid;
        const detailsExpanded = Boolean(expandedCreditCards[card.id]);
        const today = new Date().toISOString().slice(0, 10);
        const overdue = dueDate && dueDate < today && metrics.outstandingAfterPayments > 0;
        const issuerBank = card.issuerBankId
          ? (c.accountsView || []).find(account => String(account.id) === String(card.issuerBankId))
          : null;
        const institution = card.institution_name || issuerBank?.institution_name || issuerBank?.name || card.name;
        const logoCandidates = institutionLogoCandidates(institution, { size: 64 });
        const network = c.prefs?.cardNetworks?.[card.id] || card.cardNetwork || card.network || card.card_network || '';
        const networkLogo = cardNetworkLogoUrl(network, 64);
        const logoFallbacks = [...logoCandidates.slice(1), networkLogo].filter(Boolean);
        return <article className="card fp-goal fp-credit-card" key={card.id}>
          <div className="fp-goal-head"><BrandLogo src={logoCandidates[0]} name={institution} fallbackSrcs={logoFallbacks} size={36} className="fp-credit-card-logo" fallback={<span className="stat-icon tone-red"><Icon name="credit-card" size={17} /></span>} /><span className="fp-main"><strong>{institution}</strong><small>{tr('•••• {last4}', { last4: card.mask || '----' })}</small></span><span className="fp-amount"><b>{cash(metrics.outstandingAfterPayments, card.currency)}</b><small>{tr('Outstanding after payments')}{metrics.totalPayments > 0 ? ` · ${cash(metrics.totalPayments, card.currency)} ${tr('Payments applied')}` : ''}</small></span></div>
          <div className="fp-credit-card-metrics">
            <div><small>{tr('Amount Spent')}</small><b>{cash(metrics.amountSpent, card.currency)}</b></div>
            <div><small>{tr('Amount After Interest')}</small><b>{cash(metrics.amountAfterInterest, card.currency)}</b><span>+ {cash(metrics.estimatedMonthlyInterest, card.currency)} {tr('Estimated interest')}</span></div>
            <div className="fp-credit-utilization"><small>{tr('Spent / Limit')}</small><b>{spendLimitPercent === null ? '—' : `${spendLimitPercent.toFixed(1)}%`}</b>{spendLimit > 0 ? <><div className="fp-credit-utilization-track"><span style={{ width: `${Math.min(100, spendLimitPercent)}%` }} /></div><span>{cash(metrics.amountSpent, card.currency)} / {cash(spendLimit, card.currency)} {tr('Spend limit')}</span></> : <span>{tr('Set a spend limit below')}</span>}</div>
          </div>
          <div className="fp-credit-card-stats"><span><Icon name="calendar" size={23} strokeWidth={1.8} className="fp-stat-icon-calendar" /><span className="fp-credit-card-stat-copy"><b>{dueDate ? formatDate(dueDate) : '—'}</b><small>{tr('Payment due')}</small></span></span><span><Icon name="layers" size={23} strokeWidth={1.8} className="fp-stat-icon-layers" /><span className="fp-credit-card-stat-copy"><b>{paidMonths}</b><small>{tr('Months paid')}</small></span></span><span><Icon name="receipt" size={23} strokeWidth={1.8} className="fp-stat-icon-receipt" /><span className="fp-credit-card-stat-copy"><b>{metrics.paymentCount}</b><small>{tr('Payments logged')}</small></span></span></div>
          <button type="button" className="fp-credit-card-toggle" aria-expanded={detailsExpanded} aria-controls={`credit-card-details-${card.id}`} onClick={() => setExpandedCreditCards(current => ({ ...current, [card.id]: !current[card.id] }))}>
            <span>{detailsExpanded ? tr('Hide card details') : tr('Show card details')}</span>
            <span className="fp-credit-card-toggle-meta">{tr('{n} payments · {m} credit logs', { n: metrics.paymentCount, m: metrics.creditTransactionCount })}</span>
            <Icon name={detailsExpanded ? 'chevron-up' : 'chevron-down'} size={17} />
          </button>
          {detailsExpanded && <div className="fp-credit-card-details" id={`credit-card-details-${card.id}`}>
            {overdue && <p className="app-alert">{tr('Payment may be overdue. Confirm the latest statement.')}</p>}
            <div className="form-grid fp-credit-card-fields"><label>{tr('Payment due date')}<input type="date" value={dueDate} onChange={e => saveCardStyle(card.id, { paymentDueDate: e.target.value })} /></label><label>{tr('Minimum due')}<input type="number" min="0" step="0.01" value={style.minimumDue ?? ''} placeholder="0.00" onChange={e => saveCardStyle(card.id, { minimumDue: e.target.value })} /></label></div>
            <div className="form-grid fp-credit-card-fields"><label>{tr('Credit spend limit')}<input type="number" min="0" step="0.01" value={style.creditSpendLimit ?? ''} placeholder={String(metrics.limit || '')} onChange={e => saveCardStyle(card.id, { creditSpendLimit: e.target.value })} /></label><label>{tr('Statement balance')}<input type="number" min="0" step="0.01" value={style.statementBalance ?? ''} placeholder={String(metrics.outstandingAfterPayments)} onChange={e => saveCardStyle(card.id, { statementBalance: e.target.value })} /></label><label>{tr('Billing day')}<input type="number" min="1" max="31" value={style.billingDay ?? ''} placeholder="—" onChange={e => saveCardStyle(card.id, { billingDay: e.target.value })} /></label></div>
            <div className="fp-credit-card-rate"><label>{tr('Annual interest rate (%)')}<input type="number" min="0" max="100" step="0.01" value={style.annualInterestRate ?? ''} placeholder="e.g. 24" onChange={e => saveCardStyle(card.id, { annualInterestRate: e.target.value })} /></label><small>{tr('Estimated interest uses the statement balance, when entered, or the remaining balance × APR ÷ 12. It is not added to your ledger.')}</small></div>
            <div className="fp-credit-card-actions"><button type="button" className="secondary-button wide-button" onClick={() => setCardDraft({ id: card.id, name: institution, amount: '', date: today, month: today.slice(0,7), fromId: (c.accountsView || []).some(a => a.id === style.issuerBankId && !a.is_archived) ? style.issuerBankId : '' })}>{tr('Record payment')}</button><button type="button" className="primary-button wide-button" onClick={() => setCreditSpendDraft({ account_id: card.id, cardName: institution, currency: card.currency || base, merchant: '', amount: '', annual_rate: String(style.annualInterestRate ?? ''), months: '12', date: today })}>{tr('Log credits')}</button></div>
            {metrics.paymentCount > 0 && <div className="fp-credit-ledger-history"><strong>{tr('Payment history')} · {metrics.paymentCount}</strong><ul className="fp-allocs">{metrics.payments.map((payment,i) => <li key={payment.id || `${payment.date}-${i}`}><span>{payment.month} · {payment.date}</span><b>{cash(payment.amount, card.currency)}</b></li>)}</ul></div>}
            {creditSpends.length > 0 && <div className="fp-credit-spend-history"><strong>{tr('Recent credit spends')} · {creditSpends.length}</strong><ul className="fp-allocs">{creditSpends.slice().reverse().map((entry,i) => <li key={entry.id || i}><span>{entry.merchant} · {entry.date} <small>{entry.months} {tr('months')} · {Number(entry.annual_rate).toFixed(2)}% APR</small></span><b>{cash(entry.amount, card.currency)}</b></li>)}</ul></div>}
            <p className="form-note">{tr('Outstanding includes recorded purchases and payments once. Estimated interest is shown separately and does not change your recorded balance.')}</p>
          </div>}
        </article>;
      })}
    </>}

    {tab === 'bills' && <BillsPanel c={c} accounts={(c.accountsView || []).filter(a => !a.is_archived)} subscriptions={c.subscriptions || []} onLogSubscription={c.logSubscription} onChanged={async () => { await p.reload(); if (c.refreshFinance) await c.refreshFinance(); }} adding={sheet?.kind === 'bill'} onAdding={(v) => setSheet(v ? { kind: 'bill' } : null)} />}

    {tab === 'loans' && <>
      <SectionTitle action={tr('Add')} onAction={() => open('loan', blankLoan(base))}>{tr('Loans & debts')}</SectionTitle>
      {creditCardDebts.length > 0 && <>
        <SectionTitle>{tr('Credit card balances')}</SectionTitle>
        <div className="card list-card">{creditCardDebts.map(card => {
          const owed = creditCardOutstanding(card);
          const limit = Number(card.creditLimit) || 0;
          return <button type="button" className="fp-row" key={card.id} onClick={() => pick('cards')}>
            <span className="stat-icon tone-red"><Icon name="credit-card" size={17} strokeWidth={2} /></span>
            <span className="fp-main"><strong>{card.institution_name || card.name}</strong><small>{tr('Credit card spending is added automatically from recorded transactions.')}{limit > 0 ? ` · ${tr('Available credit')}: ${cash(Math.max(0, limit - owed), card.currency)}` : ''}</small></span>
            <span className="fp-amount"><b>{cash(owed, card.currency)}</b><small>{tr('Outstanding')}</small></span>
            <Icon name="chevron" size={15} />
          </button>;
        })}</div>
      </>}
      {loans.length > 0 ? <div className="fp-loan-list">{loans.map(l => { const principal = Number(l.principal_amount) || 0; const left = Number(l.outstanding_principal) || 0; const pay = () => open('event', { target: 'loan', item: l, event_type: 'principal_payment', amount: '', account_id: l.account_id && inCurrency(l.currency).some(a => a.id === l.account_id) ? l.account_id : (inCurrency(l.currency)[0]?.id || ''), note: '' }); return <article className="card fp-loan-card" key={l.id}><button type="button" className="fp-row" onClick={() => open('event', { target: 'loan', item: l, event_type: 'principal_payment', amount: '', account_id: l.account_id && inCurrency(l.currency).some(a => a.id === l.account_id) ? l.account_id : (inCurrency(l.currency)[0]?.id || ''), note: '' })}>
        <span className="stat-icon tone-red"><Icon name="bank" size={17} strokeWidth={2} /></span>
        <span className="fp-main"><strong>{l.name}</strong><small>{l.lender || tr(l.obligation_type === 'debt' ? 'Other debt' : 'Loan')} · {due(l.due_date)}</small>
          {Array.isArray(l.interest_schedule) && l.interest_schedule.length > 0 && <small title={l.interest_schedule.map(x => `M${x.month}: ${x.rate}%`).join(' · ')}>{tr('Monthly rates')}: {l.interest_schedule.slice(0, 3).map(x => `M${x.month} ${x.rate}%`).join(' · ')}{l.interest_schedule.length > 3 ? ` · +${l.interest_schedule.length - 3}` : ''}</small>}
          {principal > 0 && <span className="progress-track" aria-label={tr('{n}% paid', { n: Math.round(pct(principal - left, principal)) })}><span style={{ width: `${pct(principal - left, principal)}%` }} /></span>}</span>
        <span className="fp-amount"><b>{cash(left, l.currency)}</b>{statusChip(l.status)}</span>
      </button><div className="fp-loan-actions" role="group" aria-label={tr('Actions for {name}', { name: l.name })}>
        <button type="button" className="primary-button" disabled={busy || left <= 0} onClick={pay}><Icon name="wallet" size={16}/>{tr('Pay')}</button>
        <button type="button" className="secondary-button" disabled={busy} onClick={() => open('edit-loan', { ...l, inconsistent_interest: !!l.interest_schedule?.length, interest_months: String(l.interest_schedule?.length || 12), monthly_interest_rates: l.interest_schedule?.map(item => String(item.rate)) || Array(12).fill('') })}><Icon name="edit" size={16}/>{tr('Edit')}</button>
        <button type="button" className="secondary-button" disabled={busy} onClick={() => removeObligation('loan', l)}><Icon name="trash" size={16}/>{tr('Delete')}</button>
      </div></article>; })}</div>
        : !creditCardDebts.length && <button type="button" className="budget-empty" onClick={() => open('loan', blankLoan(base))}><Icon name="plus" size={20} /><span><strong>{tr('Add a loan or debt')}</strong><small>{tr('No loans or debts recorded yet.')}</small></span></button>}
    </>}

    {tab === 'owed' && <>
      <SectionTitle action={tr('Add')} onAction={() => open('receivable', blankReceivable(base))}>{tr('Owed to you')}</SectionTitle>
      {receivables.length ? <div className="fp-loan-list">{receivables.map(r => {
        const opening = Number(r.opening_amount) || 0;
        const left = Number(r.outstanding_amount) || 0;
        const canCollect = r.status === 'active' && left > 0;
        const collect = () => open('event', {
          target: 'receivable', item: r, event_type: 'collected', amount: '',
          account_id: r.account_id && inCurrency(r.currency).some(a => a.id === r.account_id)
            ? r.account_id : (inCurrency(r.currency)[0]?.id || ''), note: '',
        });
        return <article className="card fp-loan-card" key={r.id}>
          <button type="button" className="fp-row" disabled={busy || !canCollect} onClick={collect}>
            <span className="stat-icon tone-green"><Icon name="user" size={17} strokeWidth={2} /></span>
            <span className="fp-main"><strong>{r.name}</strong><small>{r.counterparty || tr('Person not set')} · {due(r.due_date)}</small>
              {opening > 0 && <span className="progress-track" aria-label={tr('{n}% collected', { n: Math.round(pct(opening - left, opening)) })}><span style={{ width: pct(opening - left, opening) + '%' }} /></span>}</span>
            <span className="fp-amount"><b>{cash(left, r.currency)}</b>{statusChip(r.status)}</span>
          </button>
          <div className="fp-loan-actions" role="group" aria-label={tr('Actions for {name}', { name: r.name })}>
            <button type="button" className="primary-button" disabled={busy || !canCollect} onClick={collect}><Icon name="wallet" size={16}/>{tr('Collect')}</button>
            <button type="button" className="secondary-button" disabled={busy} onClick={() => open('edit-receivable', { ...r, due_date: r.due_date || '' })}><Icon name="edit" size={16}/>{tr('Edit')}</button>
            <button type="button" className="secondary-button" disabled={busy} onClick={() => removeObligation('receivable', r)}><Icon name="trash" size={16}/>{tr('Delete')}</button>
          </div>
        </article>;
      })}</div>
        : <button type="button" className="budget-empty" onClick={() => open('receivable', blankReceivable(base))}><Icon name="plus" size={20} /><span><strong>{tr('Record money owed to you')}</strong><small>{tr('No one currently owes you money in MOVO.')}</small></span></button>}
    </>}

    {tab === 'goals' && <>
      <SectionTitle action={tr('Add')} onAction={() => open('goal', blankGoal(base))}>{tr('Goals & Plans')}</SectionTitle>
      {plans.length > 0 && <section className="fp-plan-list">
        <div className="fp-plan-list-head"><strong>{tr('Your plans')}</strong><button type="button" className="link-button" onClick={() => c.openBudgets?.('plans')}>{tr('Manage plans')}</button></div>
        {plans.map(plan => {
          const target = Math.max(0, Number(plan.target) || 0);
          const saved = Math.max(0, Number(plan.saved) || 0);
          const progress = target > 0 ? Math.min(100, saved / target * 100) : 0;
          const remaining = Math.max(0, target - saved);
          const activePlanAllocations = (p.planAllocations || []).filter(allocation => allocation.plan_id === String(plan.id) && allocation.status === 'allocated');
          return <article className="card fp-goal" key={`plan-${plan.id}`}>
            <div className="fp-goal-head"><span className="stat-icon tone-blue"><Icon name="target" size={17} strokeWidth={2} /></span>
              <span className="fp-main"><strong>{plan.name}</strong><small>{tr('Plan')}: {cash(target, plan.currency)}{plan.due ? ` · ${formatDate(plan.due)}` : ''}</small></span>
              <span className="fp-amount"><b>{cash(saved, plan.currency)}</b><small>{Math.round(progress)}%</small></span></div>
            <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
            <p className="form-note">{cash(remaining, plan.currency)} {tr('remaining')}</p>
            {activePlanAllocations.length > 0 && <div className="fp-plan-funding">
              <div className="fp-plan-funding-title"><Icon name="wallet" size={14} /><span>{tr('Funded from')}</span></div>
              <ul className="fp-allocs">{activePlanAllocations.map(allocation => {
                const source = p.accounts.find(account => String(account.id) === String(allocation.account_id));
                const sourceName = source ? accountName(source) : tr('Account not available');
                return <li key={allocation.id}>
                  <span><strong>{sourceName}</strong><small>{source ? accountKind(source) : tr('Account')}</small></span>
                  <b>{cash(allocation.amount, allocation.currency || plan.currency)}</b>
                  <button type="button" className="link-button" aria-label={tr('Release allocation from {account}', { account: sourceName })} disabled={busy} onClick={() => run(() => releasePlanAllocation(plan.id, allocation.id), 'Plan allocation released.')}>{tr('Release')}</button>
                </li>;
              })}</ul>
            </div>}
            {plan.status !== 'completed' && plan.status !== 'archived' && remaining > 0 && <button type="button" className="secondary-button wide-button" disabled={busy || !inCurrency(plan.currency).length} onClick={() => open('allocatePlan', { plan, plan_id: plan.id, currency: plan.currency, account_id: inCurrency(plan.currency)[0]?.id || '', amount: '', note: '' })}>{tr('Allocate funds')}</button>}
            {plan.status !== 'completed' && plan.status !== 'archived' && remaining > 0 && !inCurrency(plan.currency).length && <p className="form-note">{tr('Add a bank account, e-wallet or cash account in {currency} to allocate funds.', { currency: plan.currency })}</p>}
          </article>;
        })}
      </section>}
      {goals.length > 0 && <>
        <SectionTitle>{tr('Savings goals')}</SectionTitle>
        {goals.map(g => { const prog = goalProgress(g, live); const mine = live.filter(a => a.goal_id === g.id); return <article className="card fp-goal" key={g.id}>
          <div className="fp-goal-head"><span className="stat-icon tone-blue"><Icon name="target" size={17} strokeWidth={2} /></span>
            <span className="fp-main"><strong>{g.name}</strong><small>{tr('Target')}: {cash(g.target_amount, g.currency)}{g.target_date ? ` · ${formatDate(g.target_date)}` : ''}</small></span>
            <span className="fp-amount"><b>{cash(prog.saved, g.currency)}</b><small>{Math.round(prog.percent)}%</small></span></div>
          <div className="progress-track"><span style={{ width: `${prog.percent}%` }} /></div>
          <p className="form-note">{cash(prog.remaining, g.currency)} {tr('remaining')}</p>
          {mine.length > 0 && <ul className="fp-allocs">{mine.map(a => <li key={a.id}><span>{p.accounts.find(ac => ac.id === a.account_id)?.name || tr('Account')}</span><b>{cash(a.amount, a.currency)}</b><button type="button" className="link-button" disabled={busy} onClick={() => run(() => releaseGoalAllocation(a.id), 'Goal allocation released.')}>{tr('Release')}</button></li>)}</ul>}
          {g.status === 'active' && <button type="button" className="secondary-button" onClick={() => open('allocate', { goal_id: g.id, goal: g, account_id: inCurrency(g.currency)[0]?.id || '', amount: '', currency: g.currency, note: '' })}>{tr('Allocate funds')}</button>}
        </article>; })}
      </>}
      {plans.length === 0 && goals.length === 0 && <button type="button" className="budget-empty" onClick={() => open('goal', blankGoal(base))}><Icon name="plus" size={20} /><span><strong>{tr('Create a savings goal')}</strong><small>{tr('Create a savings goal or add a plan to see everything together here.')}</small></span></button>}
      <button type="button" className="secondary-button wide-button" onClick={() => c.openBudgets?.('plans')}>{tr('Add plan')}</button>
    </>}

    {creditSpendDraft && <Sheet title={tr('Log credit spend')} subtitle={creditSpendDraft.cardName} onClose={() => setCreditSpendDraft(null)} label={tr('Log credit spend')}>
      {(() => {
        const principal = Number(creditSpendDraft.amount);
        const apr = Number(creditSpendDraft.annual_rate);
        const months = Number(creditSpendDraft.months);
        const estimate = creditRepaymentEstimate(creditSpendDraft.amount, creditSpendDraft.annual_rate, creditSpendDraft.months);
        const monthlyPayment = estimate?.monthlyPayment || 0;
        const afterInterest = estimate?.total || 0;
        const valid = !!creditSpendDraft.merchant.trim() && !!estimate && creditCards.some(card => String(card.id) === String(creditSpendDraft.account_id));
        return <form className="sheet-form fp-credit-log-form" onSubmit={async e => { e.preventDefault(); setError(''); if (!valid) { setError(tr('Enter a merchant, a positive amount and valid repayment terms.')); return; } setBusy(true); try { const transaction = await c.recordCreditSpend({ ...creditSpendDraft, amount: principal, annual_rate: apr, months, after_interest_amount: afterInterest }); if (!transaction?.id) throw new Error(tr('Could not save this transaction. Check the selected account and try again.')); saveCreditSpendLog(creditSpendDraft.account_id, { id: window.crypto?.randomUUID?.() || String(Date.now()), transaction_id: String(transaction.id), merchant: creditSpendDraft.merchant.trim(), amount: Math.round(principal * 100) / 100, annual_rate: apr, months, after_interest_amount: Math.round(afterInterest * 100) / 100, monthly_payment: Math.round(monthlyPayment * 100) / 100, date: creditSpendDraft.date }); setCreditSpendDraft(null); setNotice(tr('Credit purchase recorded.')); } catch (err) { setError(err?.message || tr('Could not save this transaction. Check the selected account and try again.')); } finally { setBusy(false); } }}>
          <label>{tr('Merchant')}<input required maxLength={160} autoFocus value={creditSpendDraft.merchant} onChange={e => setCreditSpendDraft({ ...creditSpendDraft, merchant: e.target.value })} placeholder={tr('Where did you spend?')} /></label>
          <AccountPicker id="fp-credit-spend-card" label={tr('Credit card used')} accounts={creditCards} value={creditSpendDraft.account_id} onChange={value => { const selected = creditCards.find(a => String(a.id) === String(value)); setCreditSpendDraft({ ...creditSpendDraft, account_id: value, cardName: selected?.institution_name || selected?.name || creditSpendDraft.cardName, currency: selected?.currency || base }); }} showBalance={show} required />
          <label>{tr('Before interest amount')}<input required type="number" min="0.01" step="0.01" value={creditSpendDraft.amount} onChange={e => setCreditSpendDraft({ ...creditSpendDraft, amount: e.target.value })} /></label>
          <div className="form-grid fp-credit-log-fields"><label>{tr('Annual interest rate (APR %)')}<input required type="number" min="0" max="100" step="0.01" value={creditSpendDraft.annual_rate} onChange={e => setCreditSpendDraft({ ...creditSpendDraft, annual_rate: e.target.value })} /></label><label>{tr('Months to pay')}<input required type="number" min="1" max="600" step="1" value={creditSpendDraft.months} onChange={e => setCreditSpendDraft({ ...creditSpendDraft, months: e.target.value })} /></label></div>
          <label>{tr('Purchase date')}<input required type="date" value={creditSpendDraft.date} onChange={e => setCreditSpendDraft({ ...creditSpendDraft, date: e.target.value })} /></label>
          <div className="fp-credit-log-summary"><div><small>{tr('After interest amount')}</small><b>{cash(afterInterest, creditSpendDraft.currency)}</b></div><div><small>{tr('Estimated monthly payment')}</small><b>{cash(monthlyPayment, creditSpendDraft.currency)}</b></div><small>{tr('Estimate assumes a fixed monthly repayment with APR ÷ 12. Credit-card issuers usually calculate interest daily on the average daily balance; statement timing, fees, new purchases and payment dates can change the actual amount. Pay the full statement balance by the due date to avoid purchase interest when your issuer offers a grace period.')}</small></div>
          <button type="submit" className="primary-button wide-button" disabled={busy || !valid}>{busy ? tr('Saving…') : tr('Save credit spend')}</button>
        </form>;
      })()}
    </Sheet>}
    {cardDraft && <Sheet title={tr('Record card payment')} subtitle={cardDraft.name} onClose={() => setCardDraft(null)} label={tr('Record card payment')}>
      <form className="sheet-form" onSubmit={async e => { e.preventDefault(); const amount = Number(cardDraft.amount); if (!Number.isFinite(amount) || amount <= 0) { setError(tr('Enter an amount greater than zero.')); return; }
        setError('');
        try {
          // Paid from an account: recorded as a transfer so the total balance stays right (see lib/totalBalance.js).
          if (c.recordCardPayment) await c.recordCardPayment({ cardId: cardDraft.id, amount, date: cardDraft.date, fromAccountId: cardDraft.fromId || '' });
          else saveCardPayment(cardDraft.id, { id: window.crypto?.randomUUID?.() || String(Date.now()), amount: Math.round(amount * 100) / 100, date: cardDraft.date, month: cardDraft.month });
          setCardDraft(null); setNotice(tr('Card payment recorded.'));
        } catch (err) { setError(err?.message || tr('Could not save this transaction. Check the selected account and try again.')); } }}>
        <AccountPicker id="fp-card-payment-card" label={tr('Credit card')} accounts={creditCards} value={cardDraft.id} showBalance={show} required onChange={id => { const selected = creditCards.find(a => String(a.id) === String(id)); setCardDraft({ ...cardDraft, id, name: selected?.institution_name || selected?.name || cardDraft.name }); }} />
        <label>{tr('Amount paid')}<input required type="number" min="0.01" step="0.01" value={cardDraft.amount} onChange={e => setCardDraft({ ...cardDraft, amount: e.target.value })} /></label>
        <AccountPicker id="fp-card-payment-from" label={tr('Paid from')} accounts={(c.accountsView || []).filter(a => !a.is_archived && ['bank', 'e_wallet', 'cash'].includes(a.account_type))} value={cardDraft.fromId || ''} showBalance={show} onChange={id => setCardDraft({ ...cardDraft, fromId: id })} />
        <p className="form-note">{tr('Choose the account the money came from so your total balance stays right. Leave it empty if that account is not in MOVO.')}</p>
        <label>{tr('Payment date')}<input required type="date" value={cardDraft.date} onChange={e => setCardDraft({ ...cardDraft, date: e.target.value, month: e.target.value.slice(0,7) })} /></label>
        {error && <p className="app-alert" role="alert">{error}</p>}
        <button className="primary-button">{tr('Save payment')}</button>
      </form>
    </Sheet>}
    {sheet?.kind === 'add' && <Sheet title={tr('Add')} onClose={() => setSheet(null)} label={tr('Add')}>
      <div className="sheet-menu">
        <button type="button" onClick={() => { setTab('bills'); setSheet({ kind: 'bill' }); }}><Icon name="receipt" size={18} />{tr('Add a bill')}</button>
        <button type="button" onClick={() => { setTab('loans'); open('loan', blankLoan(base)); }}><Icon name="bank" size={18} />{tr('Add a loan or debt')}</button>
        <button type="button" onClick={() => { setTab('owed'); open('receivable', blankReceivable(base)); }}><Icon name="user" size={18} />{tr('Record money owed to you')}</button>
        <button type="button" onClick={() => { setTab('goals'); open('goal', blankGoal(base)); }}><Icon name="target" size={18} />{tr('Create a savings goal')}</button>
        <button type="button" onClick={() => { setSheet(null); c.openBudgets?.('plans'); }}><Icon name="target" size={18} />{tr('Add plan')}</button>
      </div>
    </Sheet>}

    {sheet?.kind === 'edit-loan' && <Sheet title={tr('Edit loan or debt')} subtitle={form.name} onClose={() => !busy && setSheet(null)} label={tr('Edit loan or debt')}>
      <form className="sheet-form" onSubmit={e => { e.preventDefault(); if (!busy) run(() => updateLoan(form.id, form, c.session?.user?.id), 'Loan or debt updated.'); }}>
        {error && <p className="app-alert" role="alert">{error}</p>}
        <label>{tr('Name')}<input required maxLength={120} value={form.name} onChange={e => set({ name: e.target.value })}/></label>
        <div className="form-grid"><label>{tr('Record type')}<select value={form.obligation_type} onChange={e => set({ obligation_type: e.target.value })}><option value="loan">{tr('Loan')}</option><option value="debt">{tr('Debt')}</option></select></label><label>{tr('Due date')}<input type="date" value={form.due_date || ''} onChange={e => set({ due_date: e.target.value })}/></label></div>
        <label>{tr('Lender / creditor')}<input maxLength={120} value={form.lender || ''} onChange={e => set({ lender: e.target.value })}/></label>
        {form.inconsistent_interest ? <div className="form-grid">{form.monthly_interest_rates.map((rate,index) => <label key={index}>{tr('Month {number} interest (%)', { number: index + 1 })}<input required type="number" min="0" max="100" step="0.001" value={rate} onChange={e => set({ monthly_interest_rates: form.monthly_interest_rates.map((value,i) => i === index ? e.target.value : value) })}/></label>)}</div> : <label>{tr('Annual interest rate (%)')}<input required type="number" min="0" max="100" step="0.001" value={form.interest_rate ?? 0} onChange={e => set({ interest_rate: e.target.value })}/></label>}
        <label>{tr('Notes')}<textarea rows={2} maxLength={2000} value={form.notes || ''} onChange={e => set({ notes: e.target.value })}/></label>
        <p className="form-note">{tr('Use Pay to record a repayment or principal adjustment. Editing these details keeps your payment history and outstanding balance.')}</p>
        <button type="submit" className="primary-button" disabled={busy}>{busy ? tr('Saving…') : tr('Save changes')}</button>
      </form>
    </Sheet>}

    {sheet?.kind === 'loan' && <Sheet title={tr('Add a loan or debt')} onClose={() => setSheet(null)} label={tr('Add a loan or debt')}>
      <form className="sheet-form" onSubmit={e => { e.preventDefault(); run(() => createLoan(form, c.session?.user?.id), 'Loan or debt added.'); }}>
        {error && <p className="app-alert" role="alert">{error}</p>}
        <label>{tr('Record type')}<select value={form.obligation_type} onChange={e => set({ obligation_type: e.target.value })}><option value="loan">{tr('Loan')}</option><option value="debt">{tr('Other debt')}</option></select></label>
        <label>{tr('Name')}<input required maxLength="120" value={form.name} onChange={e => set({ name: e.target.value })} /></label>
        <label>{tr('Lender / creditor')}<input maxLength="120" value={form.lender} onChange={e => set({ lender: e.target.value })} /></label>
        <label>{tr('Original principal')}<input required type="number" inputMode="decimal" min="0.01" step="0.01" value={form.principal_amount} onChange={e => set({ principal_amount: e.target.value })} /></label>
        <label className="legal-disclosure-check"><input type="checkbox" checked={!!form.inconsistent_interest} onChange={e => set({ inconsistent_interest: e.target.checked })} /><span>{tr('Interest changes each month')}</span></label>
        {form.inconsistent_interest ? <>
          <label>{tr('Number of months')}<input required type="number" inputMode="numeric" min="1" max="600" step="1" value={form.interest_months} onChange={e => { const count = Math.max(1, Math.min(600, Number(e.target.value) || 1)); set({ interest_months: e.target.value, monthly_interest_rates: Array.from({ length: count }, (_, i) => form.monthly_interest_rates?.[i] ?? '') }); }} /></label>
          <p className="form-note">{tr('Enter the interest rate for each month of the loan.')}</p>
          <div className="form-grid">{Array.from({ length: Math.max(1, Math.min(600, Number(form.interest_months) || 1)) }, (_, i) => <label key={i}>{tr('Month {number} interest (%)', { number: i + 1 })}<input required type="number" inputMode="decimal" min="0" max="100" step="0.001" value={form.monthly_interest_rates?.[i] ?? ''} onChange={e => set({ monthly_interest_rates: Array.from({ length: Math.max(1, Math.min(600, Number(form.interest_months) || 1)) }, (_, index) => index === i ? e.target.value : (form.monthly_interest_rates?.[index] ?? '')) })} /></label>)}</div>
        </> : <label>{tr('Interest rate (% per year)')}<input type="number" inputMode="decimal" min="0" step="0.001" value={form.interest_rate} onChange={e => set({ interest_rate: e.target.value })} /></label>}
        <label>{tr('Due date')}<input type="date" value={form.due_date} onChange={e => set({ due_date: e.target.value })} /></label>
        <label className="legal-disclosure-check"><input type="checkbox" checked={form.new_proceeds} onChange={e => set({ new_proceeds: e.target.checked })} /><span>{tr('This is a new loan draw; add the proceeds to the account balance')}</span></label>
        <AccountPicker id="loan-payment-account" label={tr('Payment account')} accounts={inCurrency(form.currency)} value={form.account_id} onChange={v => set({ account_id: v })} showBalance={show} required={form.new_proceeds} placeholder={tr('Choose account (optional)')} />
        <button className="primary-button" disabled={busy}>{tr('Save loan / debt')}</button>
      </form>
    </Sheet>}

    {sheet?.kind === 'receivable' && <Sheet title={tr('Record money owed to you')} onClose={() => setSheet(null)} label={tr('Record money owed to you')}>
      <form className="sheet-form" onSubmit={e => { e.preventDefault(); run(() => createReceivable(form, c.session?.user?.id), 'Receivable added.'); }}>
        {error && <p className="app-alert" role="alert">{error}</p>}
        <label>{tr('Description')}<input required maxLength="120" value={form.name} onChange={e => set({ name: e.target.value })} /></label>
        <label>{tr('Person / organization')}<input maxLength="120" value={form.counterparty} onChange={e => set({ counterparty: e.target.value })} /></label>
        <label>{tr('Reason')}<input maxLength="500" value={form.reason} onChange={e => set({ reason: e.target.value })} /></label>
        <label>{tr('Amount owed')}<input required type="number" inputMode="decimal" min="0.01" step="0.01" value={form.opening_amount} onChange={e => set({ opening_amount: e.target.value })} /></label>
        <label>{tr('Due date')}<input type="date" value={form.due_date} onChange={e => set({ due_date: e.target.value })} /></label>
        <label className="legal-disclosure-check"><input type="checkbox" checked={form.new_lending} onChange={e => set({ new_lending: e.target.checked })} /><span>{tr('This is money I am lending now; subtract it from my account')}</span></label>
        <AccountPicker id="receivable-account" label={tr('Deposit / collection account')} accounts={inCurrency(form.currency)} value={form.account_id} onChange={v => set({ account_id: v })} showBalance={show} required={form.new_lending} placeholder={tr('Choose account (optional)')} />
        <button className="primary-button" disabled={busy}>{tr('Save receivable')}</button>
      </form>
    </Sheet>}

    {sheet?.kind === 'edit-receivable' && <Sheet title={tr('Edit receivable')} subtitle={form.name} onClose={() => !busy && setSheet(null)} label={tr('Edit receivable')}>
      <form className="sheet-form" onSubmit={e => { e.preventDefault(); if (!busy) run(() => updateReceivable(form.id, form, c.session?.user?.id), 'Receivable updated.'); }}>
        {error && <p className="app-alert" role="alert">{error}</p>}
        <label>{tr('Description')}<input required maxLength={120} value={form.name || ''} onChange={e => set({ name: e.target.value })} /></label>
        <label>{tr('Person / organization')}<input maxLength={120} value={form.counterparty || ''} onChange={e => set({ counterparty: e.target.value })} /></label>
        <label>{tr('Reason')}<input maxLength={500} value={form.reason || ''} onChange={e => set({ reason: e.target.value })} /></label>
        <label>{tr('Due date')}<input type="date" value={form.due_date || ''} onChange={e => set({ due_date: e.target.value })} /></label>
        <label>{tr('Notes')}<textarea rows={2} maxLength={2000} value={form.notes || ''} onChange={e => set({ notes: e.target.value })} /></label>
        <p className="form-note">{tr('Original amount and recorded collections cannot be changed here.')}</p>
        <button type="submit" className="primary-button" disabled={busy}>{busy ? tr('Saving…') : tr('Save changes')}</button>
      </form>
    </Sheet>}

    {sheet?.kind === 'goal' && <Sheet title={tr('Create a savings goal')} onClose={() => setSheet(null)} label={tr('Create a savings goal')}>
      <form className="sheet-form" onSubmit={e => { e.preventDefault(); run(() => createGoal(form, c.session?.user?.id), 'Savings goal created.'); }}>
        {error && <p className="app-alert" role="alert">{error}</p>}
        <label>{tr('Goal name')}<input required maxLength="120" value={form.name} onChange={e => set({ name: e.target.value })} /></label>
        <label>{tr('Target amount')}<input required type="number" inputMode="decimal" min="0.01" step="0.01" value={form.target_amount} onChange={e => set({ target_amount: e.target.value })} /></label>
        <label>{tr('Target date')}<input type="date" value={form.target_date} onChange={e => set({ target_date: e.target.value })} /></label>
        <button className="primary-button" disabled={busy}>{tr('Create goal')}</button>
      </form>
    </Sheet>}

    {sheet?.kind === 'allocatePlan' && <Sheet title={tr('Allocate funds to plan')} subtitle={form.plan?.name} onClose={() => setSheet(null)} label={tr('Allocate funds to plan')}>
      <form className="sheet-form" onSubmit={e => {
        e.preventDefault();
        const amount = Math.round(Number(form.amount) * 100) / 100;
        if (!Number.isFinite(amount) || amount <= 0) { setError(tr('Enter an amount greater than zero.')); return; }
        if (amount > Math.max(0, Number(form.plan?.target) - Number(form.plan?.saved)) + 0.000001) { setError(tr('Allocation cannot exceed the remaining plan amount.')); return; }
        const account = p.accounts.find(item => item.id === form.account_id && item.currency === form.currency && ['bank', 'e_wallet', 'cash'].includes(item.account_type));
        if (!account) { setError(tr('Choose a valid account in the plan currency.')); return; }
        if (amount > availableForAllocation(account) + 0.000001) { setError(tr('Allocation exceeds the unreserved account balance.')); return; }
        run(() => allocatePlanFunds({ plan_id: form.plan_id, plan_name: form.plan.name, account_id: account.id, amount, currency: account.currency || form.currency, note: form.note }), 'Plan allocation recorded.');
      }}>
        {error && <p className="app-alert" role="alert">{error}</p>}
        <AccountPicker id="plan-funding-account" label={tr('Choose a bank account or e-wallet')} accounts={inCurrency(form.currency)} value={form.account_id} showBalance={show} onChange={account_id => set({ account_id })} required />
        {form.account_id && p.accounts.find(account => String(account.id) === String(form.account_id)) && <p className="form-note">{tr('Available to allocate')}: {cash(availableForAllocation(p.accounts.find(account => String(account.id) === String(form.account_id))), form.currency)}</p>}
        <label>{tr('Amount')}<input required type="number" inputMode="decimal" min="0.01" max={Math.max(0, Number(form.plan?.target) - Number(form.plan?.saved))} step="0.01" value={form.amount} onChange={e => set({ amount: e.target.value })} /></label>
        <p className="form-note">{tr('This earmarks funds for the plan without moving money or changing the account balance.')}</p>
        <button className="primary-button" disabled={busy || !form.account_id}>{tr('Allocate funds')}</button>
      </form>
    </Sheet>}

    {sheet?.kind === 'allocate' && <Sheet title={tr('Allocate existing funds')} subtitle={form.goal?.name} onClose={() => setSheet(null)} label={tr('Allocate existing funds')}>
      <form className="sheet-form" onSubmit={e => { e.preventDefault(); run(() => allocateToGoal({ goal_id: form.goal_id, account_id: form.account_id, amount: form.amount, currency: form.currency, note: form.note }), 'Funds allocated to goal.'); }}>
        {error && <p className="app-alert" role="alert">{error}</p>}
        <AccountPicker id="goal-reserve-account" label={tr('Account to reserve from')} accounts={inCurrency(form.currency)} value={form.account_id} onChange={v => set({ account_id: v })} showBalance={show} required />
        <label>{tr('Amount')}<input required type="number" inputMode="decimal" min="0.01" step="0.01" value={form.amount} onChange={e => set({ amount: e.target.value })} /></label>
        <p className="form-note">{tr('Create a goal, then allocate money already in an account. This does not add to your balance.')}</p>
        <button className="primary-button" disabled={busy || !form.account_id}>{tr('Allocate funds')}</button>
      </form>
    </Sheet>}

    {sheet?.kind === 'event' && <Sheet title={tr(form.target === 'loan' ? 'Record loan event' : 'Record collection')} subtitle={`${form.item.name} · ${cash(form.target === 'loan' ? form.item.outstanding_principal : form.item.outstanding_amount, form.item.currency)}`} onClose={() => setSheet(null)} label={tr(form.target === 'loan' ? 'Record loan event' : 'Record collection')}>
      <form className="sheet-form" onSubmit={e => {
        e.preventDefault();
        const input = { event_type: form.event_type, amount: Number(form.amount), currency: form.item.currency, account_id: form.account_id, note: form.note };
        run(() => (form.target === 'loan' ? recordLoanEvent({ ...input, loan_id: form.item.id }) : recordReceivableEvent({ ...input, receivable_id: form.item.id })), 'Payment or adjustment recorded.');
      }}>
        {error && <p className="app-alert" role="alert">{error}</p>}
        <label>{tr('Event type')}<select value={form.event_type} onChange={e => set({ event_type: e.target.value })}>{(form.target === 'loan' ? LOAN_EVENTS : RECEIVABLE_EVENTS).map(([v, l]) => <option value={v} key={v}>{tr(l)}</option>)}</select></label>
        <label>{tr('Amount')}<input required type="number" inputMode="decimal" min="0.01" step="0.01" value={form.amount} onChange={e => set({ amount: e.target.value })} /></label>
        <AccountPicker id="obligation-event-account" label={tr('Account')} accounts={inCurrency(form.item.currency)} value={form.account_id} onChange={v => set({ account_id: v })} showBalance={show} required={!(form.target === 'receivable' && form.event_type === 'written_off')} placeholder={tr('No cash account')} />
        <label>{tr('Note')}<input maxLength="1000" value={form.note} onChange={e => set({ note: e.target.value })} /></label>
        <button className="primary-button" disabled={busy}>{tr('Save event')}</button>
      </form>
    </Sheet>}
  </>;
}
