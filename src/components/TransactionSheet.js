import React, { useEffect, useState } from 'react';
import Icon from './Icon';
import { Sheet } from './ui';
import { evaluate, press, tokenize } from '../lib/calc';
import { currencySymbol, number } from '../lib/format';

export const CATEGORY_ICONS = [
  ['Food & drinks', 'Food', 'food', 'orange'], ['Groceries', 'Groceries', 'cart', 'green'], ['Transport', 'Transport', 'transfer', 'blue'],
  ['Bills', 'Bills', 'receipt', 'amber'], ['Shopping', 'Shopping', 'tag', 'violet'], ['Subscriptions', 'Subscriptions', 'refresh', 'teal'],
  ['Health', 'Health', 'shield', 'red'], ['Entertainment', 'Fun', 'star', 'violet'], ['Education', 'Education', 'doc', 'blue'], ['Other', 'Other', 'layout', 'gray'],
];
const KEYS = [['⌫', 'AC', '%', '÷'], ['7', '8', '9', '×'], ['4', '5', '6', '−'], ['1', '2', '3', '+'], ['00', '0', '.', '=']];
const TYPE_LABEL = { expense: 'Expense', income: 'Income', transfer: 'Transfer' };
const keyFor = (k) => ({ '*': '×', x: '×', '/': '÷', '-': '−', Enter: '=', Backspace: '⌫', Escape: null, Delete: 'AC' }[k] ?? k);
const pretty = (expr) => tokenize(expr).map(t => (/^\d/.test(t) || t.startsWith('.') ? Number(t).toLocaleString('en-PH', { maximumFractionDigits: 2 }) + (t.endsWith('.') ? '.' : '') : ` ${t} `)).join('');

/** Calculator-first add/edit transaction sheet: type the amount on the keypad, pick a category, save. */
export default function TransactionSheet({ currency = 'PHP', form, setForm, editing, accounts, cloudMode, busy, error, onSave, onClose, onScan }) {
  const [expr, setExpr] = useState(form.amount ? String(Number(form.amount)) : '');
  const [allCats, setAllCats] = useState(false);
  const [padOpen, setPadOpen] = useState(true);
  const [now, setNow] = useState(() => new Date().toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', second: '2-digit' }));
  useEffect(() => {
    if (form.time) return undefined;
    const t = setInterval(() => setNow(new Date().toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', second: '2-digit' })), 1000);
    return () => clearInterval(t);
  }, [form.time]);
  const value = evaluate(expr);
  const hasOp = /[+−×÷]/.test(expr.replace(/^−/, ''));
  const type = form.transaction_type;

  useEffect(() => { setForm(f => ({ ...f, amount: Number.isFinite(value) && value > 0 ? String(value) : '' })); }, [value, setForm]);
  const tap = (k) => setExpr(cur => press(cur, k));
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest('input, textarea, select') || e.metaKey || e.ctrlKey) return;
      const k = keyFor(e.key);
      if (k && /^(\d|00|[.%+−×÷=⌫]|AC)$/.test(k)) { e.preventDefault(); setExpr(cur => press(cur, k)); }
    };
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey);
  }, []);

  const label = editing ? 'Edit transaction' : 'Add transaction';
  const cats = CATEGORY_ICONS;
  const canSave = !busy && Number.isFinite(value) && value > 0 && form.merchant.trim();
  const submit = (e) => { e.preventDefault(); const v = evaluate(expr); if (hasOp && Number.isFinite(v)) setExpr(String(v)); onSave(e); };

  return <Sheet label={label} onClose={onClose} hideClose className={`tx-sheet tone-${type}`}>{(close) => <form className="tx-form" onSubmit={submit}>
    <div className="tx-top">
      <button type="button" className="tx-round" onClick={close} aria-label={`Close ${label}`}><Icon name="close" size={18} /></button>
      <div className="tx-seg" role="group" aria-label="Transaction type">
        {Object.keys(TYPE_LABEL).map(t => <button type="button" key={t} className={type === t ? 'selected' : ''} aria-pressed={type === t} onClick={() => setForm({ ...form, transaction_type: t })}>{TYPE_LABEL[t]}</button>)}
      </div>
      {onScan ? <button type="button" className="tx-round" onClick={onScan} aria-label="Scan a receipt"><Icon name="scan" size={18} /></button> : <span className="tx-round ghost" />}
    </div>

    <div className="tx-amount" aria-live="polite">
      <span className="tx-currency">{currencySymbol(currency)}</span>
      <div className="tx-figures">
        {hasOp && <small className="tx-expr">{pretty(expr)}</small>}
        <output className={`tx-value${expr ? '' : ' empty'}`} aria-label="Amount">{Number.isFinite(value) ? (expr ? number(value, 2) : '0') : 'Can’t divide by 0'}</output>
      </div>
    </div>

    <label className="tx-note"><Icon name="doc" size={18} /><input aria-label="Description" required maxLength={160} value={form.merchant} onChange={e => setForm({ ...form, merchant: e.target.value })} placeholder={type === 'income' ? 'Where is it from?' : type === 'transfer' ? 'What is the transfer for?' : 'What was it for?'} /></label>

    {type === 'expense' && <section className={`tx-cats${allCats ? ' all' : ''}`} aria-label="Category">
      <div className="tx-cats-head"><span>Category</span><button type="button" onClick={() => setAllCats(v => !v)}>{allCats ? 'Less' : 'View all'}<Icon name="down" size={14} className={allCats ? 'flip' : ''} /></button></div>
      <div className="tx-chips">{cats.map(([value, name, icon, tone]) => <button type="button" key={value} className={form.category === value ? 'selected' : ''} aria-pressed={form.category === value} onClick={() => setForm({ ...form, category: value })}><span className={`tx-chip-icon tone-${tone}`}><Icon name={icon} size={14} strokeWidth={2} /></span>{name}</button>)}</div>
    </section>}

    <div className="tx-meta">
      <label><span>Date</span><input type="date" required value={form.occurred_at} onChange={e => setForm({ ...form, occurred_at: e.target.value })} /></label>
      {form.time ? <label><span>Time</span><input type="time" step="1" aria-label="Time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></label>
        : <button type="button" className="tx-clock" onClick={() => setForm({ ...form, time: new Date().toTimeString().slice(0, 8) })} aria-label={`Time recorded automatically when saved, now ${now}. Tap to set a time.`}><span>Time · auto</span><b>{now}</b></button>}
      {type === 'transfer' && accounts.length > 0 && <label><span>To account</span><select aria-label="To account" value={form.transfer_to_account_id} onChange={e => setForm({ ...form, transfer_to_account_id: e.target.value })}><option value="">Choose</option>{accounts.filter(a => a.id !== form.account_id).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
    </div>

    {padOpen ? <div className="tx-pad" role="group" aria-label="Amount keypad">
      {KEYS.flat().map(k => <button type="button" key={k} className={`k${/[÷×−+%]/.test(k) ? ' op' : ''}${k === '=' ? ' eq' : ''}${k === '⌫' || k === 'AC' ? ' clear' : ''}`} onClick={() => tap(k)} aria-label={{ '⌫': 'Delete digit', AC: 'Clear amount', '÷': 'Divide', '×': 'Multiply', '−': 'Minus', '+': 'Plus', '=': 'Equals', '%': 'Percent' }[k] || k}>{k === '⌫' ? <Icon name="backspace" size={20} /> : k}</button>)}
      <button type="button" className="tx-pad-toggle" onClick={() => setPadOpen(false)} aria-label="Hide keypad"><Icon name="down" size={18} /></button>
    </div> : <button type="button" className="tx-pad-show" onClick={() => setPadOpen(true)}><Icon name="calc" size={16} /> Show keypad</button>}

    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="tx-bottom">
      {(cloudMode || accounts.length > 0) ? <label className="tx-account"><span>{type === 'transfer' ? 'From' : 'Account'}</span><select aria-label={type === 'transfer' ? 'From account' : 'Account'} required={cloudMode} value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })}><option value="">Choose account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label> : <p className="tx-local">Saved on this device</p>}
      <button type="submit" className="primary-button tx-save" disabled={!canSave}>{busy ? 'Saving…' : editing ? 'Save changes' : `Save ${TYPE_LABEL[type]}`}</button>
    </div>
  </form>}</Sheet>;
}
