import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { money } from '../lib/format';
import { t as tr } from '../lib/i18n';
import { BILL_CATEGORIES, BILL_FREQUENCIES, amountDue, amountRemaining, billsSummary, occurrenceState, paymentKey } from '../lib/bills';
import { createBill, listBillPayments, listBills, listOccurrences, recordBillPayment, setBillStatus, updateOccurrence } from '../lib/billsRepository';

const todayKey = () => new Date().toLocaleDateString('en-CA');
const shift = (day, n) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const blankBill = (base) => ({ name: '', category: 'Utilities', amount: '', amount_type: 'fixed', currency: base, frequency: 'monthly', first_due_date: todayKey(), account_id: '' });
const STATE_LABEL = { scheduled: 'Scheduled', due_soon: 'Due soon', due_today: 'Due today', overdue: 'Overdue', partially_paid: 'Partially paid', paid: 'Paid', cancelled: 'Cancelled' };
const newNonce = () => window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/* Bills & Payments: what is due, paid, late and next. Recording a payment records what the
 * person says happened; it never moves money. */
export default function BillsPanel({ c, accounts, onChanged }) {
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
  const summary = useMemo(() => billsSummary(occurrences, payments, today, toBase), [occurrences, payments, today, toBase]);
  const billOf = (o) => bills.find(b => b.id === o.bill_id);
  const payAccounts = (currency) => accounts.filter(a => a.currency === currency);
  const shown = summary.upcoming.filter(o => o.due_date <= shift(today, 45));

  const openPay = (o) => {
    const bill = billOf(o);
    setPay({ occ: o, amount: String(amountRemaining(o)), account_id: bill?.account_id && payAccounts(o.currency).some(a => a.id === bill.account_id) ? bill.account_id : (payAccounts(o.currency)[0]?.id || ''), paid_at: today, actual: o.is_estimate && o.actual_amount == null ? '' : null, nonce: newNonce() });
    setError(''); setNotice('');
  };
  const submitPay = (method) => run(async () => {
    if (pay.actual) await updateOccurrence(pay.occ.id, { actual_amount: Number(pay.actual) });
    await recordBillPayment({ occurrence_id: pay.occ.id, amount: pay.amount, method, account_id: method === 'recorded' ? pay.account_id : null, paid_at: `${pay.paid_at}T12:00:00Z`, key: paymentKey(pay.occ.id, pay.nonce) });
  }, method === 'recorded' ? tr('Payment recorded.') : tr('Marked as paid elsewhere. No account was charged.')).then(ok => { if (ok) setPay(null); });

  return <>
    {error && <p className="app-alert" role="alert">{error}</p>}{notice && <p className="form-note" role="status">{notice}</p>}
    <section className="stat-grid" aria-label={tr('Bills this month')}>
      <article className="card stat-card"><span>{tr('Due this month')}</span><strong>{money(summary.dueThisMonth, base)}</strong>{summary.estimatedThisMonth > 0 && <small>{tr('{amount} estimated', { amount: money(summary.estimatedThisMonth, base) })}</small>}</article>
      <article className="card stat-card"><span>{tr('Paid this month')}</span><strong>{money(summary.paidThisMonth, base)}</strong></article>
      <article className="card stat-card"><span>{tr('Remaining')}</span><strong>{money(summary.remaining, base)}</strong></article>
      <article className={`card stat-card${summary.overdueCount ? ' tint-red' : ''}`}><span>{tr('Overdue')}</span><strong>{money(summary.overdue, base)}</strong><small>{tr('{n} bills', { n: summary.overdueCount })}</small></article>
    </section>

    <section className="card pad bills-list" aria-label={tr('Upcoming and overdue bills')}>
      <h2>{tr('Upcoming and overdue')}</h2>
      {!shown.length && <p className="empty">{tr('Nothing due in the next 45 days.')}</p>}
      {shown.map(o => { const state = occurrenceState(o, today); const bill = billOf(o); return <article className={`bill-row is-${state}`} key={o.id}>
        <div className="detail-row"><span><strong>{bill?.name || tr('Bill')}</strong><small>{tr('Due {date}', { date: o.due_date })} · <em className={`bill-state is-${state}`}>{tr(STATE_LABEL[state])}</em>{o.is_estimate && o.actual_amount == null ? ` · ${tr('Estimate')}` : ''}</small></span><b>{money(amountRemaining(o), o.currency)}</b></div>
        {Number(o.paid_amount) > 0 && <div className="progress-track" aria-label={tr('{paid} of {due} paid', { paid: money(Number(o.paid_amount), o.currency), due: money(amountDue(o), o.currency) })}><span style={{ width: `${Math.min(100, (Number(o.paid_amount) / amountDue(o)) * 100)}%` }} /></div>}
        {pay?.occ.id === o.id ? <form className="sheet-form bill-pay" onSubmit={e => { e.preventDefault(); submitPay('recorded'); }}>
          {pay.actual !== null && <label>{tr('Actual bill amount')}<input type="number" min="0.01" step="0.01" value={pay.actual} onChange={e => setPay({ ...pay, actual: e.target.value, amount: e.target.value || pay.amount })} placeholder={String(o.expected_amount)} /></label>}
          <label>{tr('Amount paid')}<input required type="number" min="0.01" step="0.01" value={pay.amount} onChange={e => setPay({ ...pay, amount: e.target.value })} /></label>
          <label>{tr('Paid from')}<select value={pay.account_id} onChange={e => setPay({ ...pay, account_id: e.target.value })}><option value="">{tr('Choose account')}</option>{payAccounts(o.currency).map(a => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></label>
          <label>{tr('Date paid')}<input type="date" required value={pay.paid_at} max={today} onChange={e => setPay({ ...pay, paid_at: e.target.value })} /></label>
          <p className="form-note">{tr('MOVO records what you paid; it does not send money to the biller.')}</p>
          <div className="sheet-actions"><button type="button" className="secondary-button" disabled={busy} onClick={() => submitPay('external')}>{tr('Paid elsewhere')}</button><button className="primary-button" disabled={busy || !pay.account_id}>{tr('Record payment')}</button></div>
          <button type="button" className="link-button" onClick={() => setPay(null)}>{tr('Cancel')}</button>
        </form> : <div className="bill-actions"><button type="button" className="primary-button" onClick={() => openPay(o)}>{tr('Pay')}</button>{!(Number(o.paid_amount) > 0) && <button type="button" className="link-button" disabled={busy} onClick={() => run(() => updateOccurrence(o.id, { cancel: true }), tr('This due date was skipped.'))}>{tr('Skip this one')}</button>}</div>}
      </article>; })}
    </section>

    <form className="card pad sheet-form" onSubmit={e => { e.preventDefault(); run(() => createBill({ ...form, currency: form.currency || base }, c.session?.user?.id), tr('Bill added.')).then(ok => { if (ok) setForm(blankBill(base)); }); }}>
      <h2>{tr('Add a bill')}</h2>
      <label>{tr('Name')}<input required maxLength="120" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={tr('e.g. Electricity')} /></label>
      <label>{tr('Category')}<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{BILL_CATEGORIES.map(k => <option key={k} value={k}>{tr(k)}</option>)}</select></label>
      <label>{tr('Amount')}<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></label>
      <label className="legal-disclosure-check"><input type="checkbox" checked={form.amount_type === 'variable'} onChange={e => setForm({ ...form, amount_type: e.target.checked ? 'variable' : 'fixed' })} /><span>{tr('The amount changes each time (use it as an estimate)')}</span></label>
      <label>{tr('Repeats')}<select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>{BILL_FREQUENCIES.map(([k, l]) => <option key={k} value={k}>{tr(l)}</option>)}</select></label>
      <label>{tr('Next due date')}<input required type="date" value={form.first_due_date} onChange={e => setForm({ ...form, first_due_date: e.target.value })} /></label>
      <label>{tr('Usually paid from')}<select value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })}><option value="">{tr('Not set')}</option>{payAccounts(form.currency || base).map(a => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></label>
      <button className="primary-button" disabled={busy}>{tr('Save bill')}</button>
    </form>

    {bills.map(b => <article className="card pad detail-row" key={b.id}><span><strong>{b.name}</strong><small>{tr(b.category)} · {tr(BILL_FREQUENCIES.find(([k]) => k === b.frequency)?.[1] || 'Monthly')} · {money(Number(b.amount), b.currency)}{b.amount_type === 'variable' ? ` · ${tr('Estimate')}` : ''} · {tr(b.status === 'active' ? 'Active' : b.status === 'paused' ? 'Paused' : 'Cancelled')}</small></span>
      {b.status !== 'cancelled' && <button type="button" className="secondary-button" disabled={busy} onClick={() => run(() => setBillStatus(b.id, b.status === 'active' ? 'paused' : 'active'), b.status === 'active' ? tr('Bill paused.') : tr('Bill resumed.'))}>{b.status === 'active' ? tr('Pause') : tr('Resume')}</button>}
    </article>)}
    {!bills.length && <p className="empty">{tr('Add rent, utilities, phone, insurance or any bill to see what is due and what is paid.')}</p>}
  </>;
}
