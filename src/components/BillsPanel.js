import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AccountPicker from './AccountPicker';
import Icon from './Icon';
import { SectionTitle, Sheet } from './ui';
import { formatDate } from '../lib/format';
import { money } from '../lib/format';
import { t as tr } from '../lib/i18n';
import { BILL_CATEGORIES, BILL_FREQUENCIES, amountDue, amountRemaining, billsSummary, occurrenceState, paymentKey, validateBillSplits } from '../lib/bills';
import { createBill, listBillPayments, listBills, listOccurrences, recordBillPayment, setBillStatus, updateOccurrence } from '../lib/billsRepository';
import { subscriptionBillData } from '../lib/financialPlanningIntegrations';

const todayKey = () => new Date().toLocaleDateString('en-CA');
const shift = (day, n) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const blankBill = (base) => ({ name: '', category: 'Utilities', amount: '', amount_type: 'fixed', currency: base, frequency: 'monthly', first_due_date: todayKey(), account_id: '' });
const STATE_LABEL = { scheduled: 'Scheduled', due_soon: 'Due soon', due_today: 'Due today', overdue: 'Overdue', partially_paid: 'Partially paid', paid: 'Paid', cancelled: 'Cancelled' };
const newNonce = () => window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/* Bills & Payments: what is due, paid, late and next. Recording a payment records what the
 * person says happened; it never moves money. */
export default function BillsPanel({ c, accounts, subscriptions = [], onLogSubscription, onChanged, adding = false, onAdding = () => {} }) {
  const base = c.base || 'PHP';
  const today = todayKey();
  const [bills, setBills] = useState([]);
  const [occurrences, setOccurrences] = useState([]);
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState(() => blankBill(base));
  const [pay, setPay] = useState(null); // { occ, amount, account_id, paid_at, actual, nonce }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const reload = useCallback(async () => {
    const since = shift(today, -62);
    const [b, o, p] = await Promise.all([listBills(), listOccurrences(shift(today, 62), since), listBillPayments(`${shift(today, -62)}T00:00:00Z`)]);
    setBills(b || []); setOccurrences(o || []); setPayments(p || []);
  }, [today]);
  useEffect(() => { let live = true; reload().catch(e => { if (live) setError(e?.message || tr('Could not load your bills.')); }); return () => { live = false; }; }, [reload]);

  const run = async (fn, success) => {
    setBusy(true); setError(''); setNotice('');
    try { await fn(); await reload(); if (onChanged) await onChanged(); setNotice(success); return true; }
    catch (e) { setError(e?.message || tr('Could not save. Please try again.')); return false; }
    finally { setBusy(false); }
  };

  const toBase = c.toBase || ((v) => v);
  const subscriptionData = useMemo(() => subscriptionBillData(subscriptions, today, shift(today, 45)), [subscriptions, today]);
  const allOccurrences = useMemo(() => [...occurrences, ...subscriptionData.occurrences], [occurrences, subscriptionData]);
  const allPayments = useMemo(() => [...payments, ...subscriptionData.payments], [payments, subscriptionData]);
  const allBills = useMemo(() => [...bills, ...subscriptionData.bills], [bills, subscriptionData]);
  const summary = useMemo(() => billsSummary(allOccurrences, allPayments, today, toBase), [allOccurrences, allPayments, today, toBase]);
  const billOf = (o) => allBills.find(b => b.id === o.bill_id);
  const payAccounts = (currency) => accounts.filter(a => a.currency === currency);
  const shown = summary.upcoming.filter(o => o.due_date <= shift(today, 45));

  const openPay = (o) => {
    const bill = billOf(o);
    const remaining=amountRemaining(o);const accountId=bill?.account_id&&payAccounts(o.currency).some(a=>a.id===bill.account_id)?bill.account_id:'';setPay({ occ:o, amount:String(remaining), remaining, account_id:accountId, paid_at:today, actual:o.is_estimate&&o.actual_amount==null?'':null, split_enabled:false, splits:[{id:newNonce(),key:paymentKey(o.id,newNonce()),account_id:accountId,amount:String(remaining)}], nonce:newNonce() });
    setError(''); setNotice('');
  };
  const submitPay = (method) => run(async () => {
    if (pay.actual) await updateOccurrence(pay.occ.id, { actual_amount: Number(pay.actual) });
    if(method==='external'){
      await recordBillPayment({occurrence_id:pay.occ.id,amount:pay.amount,method,account_id:null,paid_at:`${pay.paid_at}T12:00:00Z`,key:paymentKey(pay.occ.id,pay.nonce)});
      return;
    }
    const parts=pay.split_enabled?pay.splits:[{account_id:pay.account_id,amount:pay.amount,key:paymentKey(pay.occ.id,pay.nonce)}];
    const valid=parts.filter(part=>Number(part.amount)>0);
    const total=valid.reduce((sum,part)=>sum+Number(part.amount),0);
    let remaining=Number(pay.remaining??amountRemaining(pay.occ));
    if(!valid.length||valid.some(part=>!part.account_id)||new Set(valid.map(part=>part.account_id)).size!==valid.length)throw new Error(tr('Choose a different account for each payment split.'));
    if(total>remaining+0.005)throw new Error(tr('The payment total cannot exceed the remaining bill balance.'));
    let pending=[...valid];
    for(const part of valid){
      const partAmount=Number(part.amount);
      await recordBillPayment({occurrence_id:pay.occ.id,amount:partAmount,method:'recorded',account_id:part.account_id,paid_at:`${pay.paid_at}T12:00:00Z`,key:part.key||paymentKey(pay.occ.id,pay.nonce)});
      remaining=Math.max(0,remaining-partAmount);
      pending=pending.filter(row=>row.id!==part.id);
      setPay(current=>current?{...current,remaining,amount:String(remaining),splits:pending}:current);
    }
  }, method === 'recorded' ? tr('Payment recorded.') : tr('Marked as paid elsewhere. No account was charged.')).then(ok => { if (ok) setPay(null); });

  return <>
    {error && <p className="app-alert" role="alert">{error}</p>}{notice && <p className="form-note" role="status">{notice}</p>}
    <section className="stat-grid two fp-bill-stats" aria-label={tr('Bills this month')}>
      <article className="card stat-card"><span>{tr('Due this month')}</span><strong>{money(summary.dueThisMonth, base)}</strong>{summary.estimatedThisMonth > 0 && <small>{tr('{amount} estimated', { amount: money(summary.estimatedThisMonth, base) })}</small>}</article>
      <article className="card stat-card"><span>{tr('Paid this month')}</span><strong>{money(summary.paidThisMonth, base)}</strong></article>
      <article className="card stat-card"><span>{tr('Remaining')}</span><strong>{money(summary.remaining, base)}</strong></article>
      <article className={`card stat-card${summary.overdueCount ? ' tint-red' : ''}`}><span>{tr('Overdue')}</span><strong>{money(summary.overdue, base)}</strong><small>{tr('{n} bills', { n: summary.overdueCount })}</small></article>
    </section>

    <SectionTitle action={tr('Add')} onAction={() => onAdding(true)}>{tr('Upcoming and overdue')}</SectionTitle>
    <section className="card pad bills-list" aria-label={tr('Upcoming and overdue bills')}>
      
      {!shown.length && <p className="empty">{tr('Nothing due in the next 45 days.')}</p>}
      {shown.map(o => { const state = occurrenceState(o, today); const bill = billOf(o); const subscription = o.source === 'subscription' ? subscriptions.find(item => item.id === o.subscription_id) : null; return <article className={`bill-row bill-row-compact is-${state}`} key={o.id}>
        <div className="bill-row-main">
          <span className="bill-row-copy">
            <strong>{bill?.name || tr('Bill')}</strong>
            <small className="bill-row-meta">
              {tr('Due {date}', { date: formatDate(o.due_date) })} · {o.source === 'subscription' ? tr('Subscription') : tr(bill?.category || 'Bill')}
              {o.is_estimate && o.actual_amount == null ? ' · ' + tr('Estimate') : ''}
            </small>
          </span>
          <span className="bill-row-side">
            <b className="bill-row-amount">{money(amountRemaining(o), o.currency)}</b>
            <em className={'bill-state is-' + state}>{tr(STATE_LABEL[state])}</em>
          </span>
        </div>
        {Number(o.paid_amount) > 0 && <div className="progress-track" aria-label={tr('{paid} of {due} paid', { paid: money(Number(o.paid_amount), o.currency), due: money(amountDue(o), o.currency) })}><span style={{ width: `${Math.min(100, (Number(o.paid_amount) / amountDue(o)) * 100)}%` }} /></div>}
        <div className="bill-actions"><button type="button" className="primary-button bill-log-action" disabled={o.source === 'subscription' && !subscription} onClick={() => subscription ? onLogSubscription?.(subscription) : openPay(o)}>{tr('Log payment')}</button>{o.source !== 'subscription' && !(Number(o.paid_amount) > 0) && <button type="button" className="link-button bill-skip-action" disabled={busy} onClick={() => run(() => updateOccurrence(o.id, { cancel: true }), tr('This due date was skipped.'))}>{tr('Skip this one')}</button>}</div>
      </article>; })}
    </section>

    {pay && <Sheet title={tr('Bill payment due')} subtitle={billOf(pay.occ)?.name || tr('Bill')} onClose={() => setPay(null)} label={tr('Record bill payment')} className="bill-payment-sheet">
      <form className="sheet-form bill-pay" onSubmit={e => { e.preventDefault(); submitPay('recorded'); }}>
        {pay.actual !== null && <label>{tr('Actual bill amount')}<input type="number" min="0.01" step="0.01" value={pay.actual} onChange={e=>{const actual=e.target.value;const remaining=actual?Math.max(0,Number(actual)-Number(pay.occ.paid_amount||0)):amountRemaining(pay.occ);setPay({...pay,actual,remaining,amount:actual||pay.amount,splits:pay.split_enabled&&pay.splits.length===1?pay.splits.map(x=>({...x,amount:actual||pay.amount})):pay.splits});}} placeholder={String(pay.occ.expected_amount)} /></label>}
        <div className="bill-payment-fields">
        <label>{tr('Amount paid')}<input required type="number" min="0.01" step="0.01" value={pay.amount} onChange={e => setPay({ ...pay, amount: e.target.value, splits:pay.split_enabled&&pay.splits.length===1?pay.splits.map(x=>({...x,amount:e.target.value})):pay.splits })} /></label>
        <label>{tr('Date paid')}<input type="date" required value={pay.paid_at} max={today} onChange={e => setPay({ ...pay, paid_at: e.target.value })} /></label>
        </div>
        <label className="bill-split-toggle"><input type="checkbox" checked={!!pay.split_enabled} onChange={e=>setPay({...pay,split_enabled:e.target.checked})}/><span>{tr('Split payment across accounts')}</span></label>
        {!pay.split_enabled?<AccountPicker id="bill-payment-account" label={tr('Paid from')} accounts={payAccounts(pay.occ.currency)} value={pay.account_id} onChange={v => setPay({ ...pay, account_id: v })} showBalance={c.show} required />:<section className="bill-payment-splits">
          {pay.splits.map((part,index)=><div className="bill-payment-split" key={part.id}>
            <div className="bill-split-account"><AccountPicker id={`bill-split-${part.id}`} label={tr('Account {number}',{number:index+1})} accounts={payAccounts(pay.occ.currency)} value={part.account_id} onChange={v=>setPay({...pay,splits:pay.splits.map(x=>x.id===part.id?{...x,account_id:v}:x)})} showBalance={c.show} required /></div>
            <label className="bill-split-amount">{tr('Split amount')}<input required type="number" min="0.01" step="0.01" value={part.amount} onChange={e=>setPay({...pay,splits:pay.splits.map(x=>x.id===part.id?{...x,amount:e.target.value}:x)})}/></label>
            {pay.splits.length>1&&<button type="button" className="link-button bill-split-remove" aria-label={tr('Remove split')} onClick={()=>setPay({...pay,splits:pay.splits.filter(x=>x.id!==part.id)})}><Icon name="close" size={16} /></button>}
          </div>)}
          <button type="button" className="secondary-button bill-split-add" onClick={()=>setPay({...pay,splits:[...pay.splits,{id:newNonce(),key:paymentKey(pay.occ.id,newNonce()),account_id:'',amount:''}]})}>{tr('Add another account')}</button>
          <p className="form-note">{tr('Split total')}: {money(pay.splits.reduce((sum,x)=>sum+(Number(x.amount)||0),0),pay.occ.currency)} · {tr('Remaining')}: {money(pay.remaining??amountRemaining(pay.occ),pay.occ.currency)}</p>
        </section>}
        <p className="form-note">{tr('MOVO records what you paid; it does not send money to the biller.')}</p>
        <div className="sheet-actions"><button type="button" className="secondary-button" disabled={busy} onClick={() => submitPay('external')}>{tr('Paid elsewhere')}</button><button className="primary-button" disabled={busy || (pay.split_enabled ? !validateBillSplits(pay.splits, Number(pay.remaining ?? amountRemaining(pay.occ)), payAccounts(pay.occ.currency)).valid : !pay.account_id)}>{tr('Record payment')}</button></div>
      </form>
    </Sheet>}
    {adding && <Sheet title={tr('Add a bill')} onClose={() => onAdding(false)} label={tr('Add a bill')}><form className="sheet-form" onSubmit={e => { e.preventDefault(); run(() => createBill({ ...form, currency: form.currency || base }, c.session?.user?.id), tr('Bill added.')).then(ok => { if (ok) { setForm(blankBill(base)); onAdding(false); } }); }}>
      {error && <p className="app-alert" role="alert">{error}</p>}
      <label>{tr('Name')}<input required maxLength="120" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={tr('e.g. Electricity')} /></label>
      <label>{tr('Category')}<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{BILL_CATEGORIES.map(k => <option key={k} value={k}>{tr(k)}</option>)}</select></label>
      <label>{tr('Amount')}<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></label>
      <label className="legal-disclosure-check"><input type="checkbox" checked={form.amount_type === 'variable'} onChange={e => setForm({ ...form, amount_type: e.target.checked ? 'variable' : 'fixed' })} /><span>{tr('The amount changes each time (use it as an estimate)')}</span></label>
      <label>{tr('Repeats')}<select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>{BILL_FREQUENCIES.map(([k, l]) => <option key={k} value={k}>{tr(l)}</option>)}</select></label>
      <label>{tr('Next due date')}<input required type="date" value={form.first_due_date} onChange={e => setForm({ ...form, first_due_date: e.target.value })} /></label>
      <AccountPicker id="bill-default-account" label={tr('Usually paid from')} accounts={payAccounts(form.currency || base)} value={form.account_id} onChange={v => setForm({ ...form, account_id: v })} showBalance={c.show} placeholder={tr('Not set')} />
      <button className="primary-button" disabled={busy}>{tr('Save bill')}</button>
    </form></Sheet>}

    {bills.length > 0 && <><SectionTitle>{tr('Your bills')}</SectionTitle><div className="card list-card">{bills.map(b => <div className="fp-row" key={b.id}>
      <span className="stat-icon tone-orange"><Icon name="receipt" size={17} strokeWidth={2} /></span>
      <span className="fp-main"><strong>{b.name}</strong><small>{tr(b.category)} · {tr(BILL_FREQUENCIES.find(([k]) => k === b.frequency)?.[1] || 'Monthly')}{b.amount_type === 'variable' ? ` · ${tr('Estimate')}` : ''}</small></span>
      <span className="fp-amount"><b>{money(Number(b.amount), b.currency)}</b>{b.status !== 'cancelled' ? <button type="button" className="link-button" disabled={busy} onClick={() => run(() => setBillStatus(b.id, b.status === 'active' ? 'paused' : 'active'), b.status === 'active' ? tr('Bill paused.') : tr('Bill resumed.'))}>{b.status === 'active' ? tr('Pause') : tr('Resume')}</button> : <em className="fp-status is-cancelled">{tr('Cancelled')}</em>}</span>
    </div>)}</div></>}
    {!bills.length && <button type="button" className="budget-empty" onClick={() => onAdding(true)}><Icon name="plus" size={20} /><span><strong>{tr('Add a bill')}</strong><small>{tr('Add rent, utilities, phone, insurance or any bill to see what is due and what is paid.')}</small></span></button>}
  </>;
}
