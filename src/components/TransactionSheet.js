import React, { useEffect, useState } from 'react';
import { PRIMARY, NEEDS_REVIEW, categoryOf, subcategoriesFor, guessCategory } from '../lib/categories';
import Icon from './Icon';
import { Sheet } from './ui';
import AccountPicker from './AccountPicker';
import { evaluate, press, tokenize } from '../lib/calc';
import { currencySymbol, number, getFormatLocale } from '../lib/format';
import { t as tr } from '../lib/i18n';

/* The 12 compact categories (docs/TRANSACTION_CATEGORIES.md §5) as [id, label, icon, tone], for pickers. */
export const CATEGORY_ICONS = PRIMARY.map(p => [p.id, p.label, p.icon, p.tone]);
const KEYS = [['⌫', 'AC', '%', '÷'], ['7', '8', '9', '×'], ['4', '5', '6', '−'], ['1', '2', '3', '+'], ['00', '0', '.', '=']];
const TYPE_LABEL = { expense: 'Expense', income: 'Income', transfer: 'Transfer' };
const keyFor = (k) => ({ '*': '×', x: '×', '/': '÷', '-': '−', Enter: '=', Backspace: '⌫', Escape: null, Delete: 'AC' }[k] ?? k);
const pretty = (expr) => tokenize(expr).map(t => (/^\d/.test(t) || t.startsWith('.') ? Number(t).toLocaleString(getFormatLocale(), { maximumFractionDigits: 2 }) + (t.endsWith('.') ? '.' : '') : ` ${t} `)).join('');

const RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const RECEIPT_MAX = 10 * 1024 * 1024;
const fileSize = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/**
 * Receipt picker (owner, 2026-11-12): a tappable card instead of the browser's file input. Shows a thumbnail (or a
 * PDF mark), the file name, size and where it is kept, with Replace and Remove. Wrong types and files over 10 MB are
 * refused at once (the save checks again). Removing an existing receipt marks it for deletion on save.
 */
export function ReceiptField({ form, setForm, cloudMode }) {
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');
  const file = form.receipt_file || null;
  const attached = !!file || !!form.receipt_path;
  const isImage = !!file && file.type.startsWith('image/');
  useEffect(() => {
    if (!isImage || typeof URL === 'undefined' || !URL.createObjectURL) { setPreview(''); return undefined; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);
  const pick = (event) => {
    const chosen = event.target.files?.[0];
    event.target.value = '';
    if (!chosen) return;
    if (!RECEIPT_TYPES.includes(chosen.type) || chosen.size > RECEIPT_MAX) { setError(tr('Use a JPG, PNG, WebP or PDF receipt smaller than 10 MB.')); return; }
    setError('');
    setForm({ ...form, receipt_file: chosen });
  };
  const remove = () => {
    setError('');
    // A receipt already saved with this record is deleted when the change is saved.
    setForm({ ...form, receipt_file: null, receipt_path: '', receipt_path_to_delete: form.receipt_path_to_delete || form.receipt_path || '' });
  };
  const where = cloudMode ? tr('Stored with your cloud record') : tr('Saved on this device');
  const input = <input type="file" className="tx-receipt-input" accept={RECEIPT_TYPES.join(',')} aria-label={attached ? tr('Replace') : tr('Add receipt')} onChange={pick} />;
  return <div className="tx-receipt-wrap">
    {attached ? <div className="tx-receipt has-file">
      <span className="tx-receipt-thumb" aria-hidden="true">{preview ? <img src={preview} alt="" /> : <Icon name={file && !isImage ? 'doc' : 'receipt'} size={22} />}</span>
      <span className="tx-receipt-text"><strong>{file ? file.name : tr('Receipt attached')}</strong><small>{file ? `${fileSize(file.size)} · ${where}` : where}</small></span>
      <label className="tx-receipt-replace">{tr('Replace')}{input}</label>
      <button type="button" className="tx-receipt-remove" onClick={remove} aria-label={tr('Remove receipt')}><Icon name="close" size={16} /></button>
    </div> : <label className="tx-receipt">
      <span className="tx-receipt-thumb" aria-hidden="true"><Icon name="receipt" size={22} /></span>
      <span className="tx-receipt-text"><strong>{tr('Add receipt')}</strong><small>{tr('Photo or PDF · up to 10 MB')}</small></span>
      <span className="tx-receipt-plus" aria-hidden="true"><Icon name="plus" size={18} /></span>
      {input}
    </label>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </div>;
}

/** Calculator-first add/edit transaction sheet: type the amount on the keypad, pick a category, save. */
export default function TransactionSheet({ currency = 'PHP', form, setForm, editing, accounts, cloudMode, busy, error, onSave, onClose, onScan, autoCategory = false, showBalance = true }) {
  // Auto categorization: suggest a category from the description until the person picks one themselves.
  const [expr, setExpr] = useState(form.amount ? String(Number(form.amount)) : '');
  const [allCats, setAllCats] = useState(false);
  const [padOpen, setPadOpen] = useState(true);
  const [now, setNow] = useState(() => new Date().toLocaleTimeString(getFormatLocale(), { hour: 'numeric', minute: '2-digit', second: '2-digit' }));
  useEffect(() => {
    if (form.time) return undefined;
    const t = setInterval(() => setNow(new Date().toLocaleTimeString(getFormatLocale(), { hour: 'numeric', minute: '2-digit', second: '2-digit' })), 1000);
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
  const current = categoryOf(form.category);
  const canSave = !busy && Number.isFinite(value) && value > 0 && form.merchant.trim();
  const submit = (e) => { e.preventDefault(); const v = evaluate(expr); if (hasOp && Number.isFinite(v)) setExpr(String(v)); onSave(e); };

  return <Sheet label={label} onClose={onClose} hideClose className={`tx-sheet tone-${type}`}>{(close) => <form className="tx-form" onSubmit={submit}>
    <div className="tx-top">
      <button type="button" className="tx-round tx-close-compact" onClick={close} aria-label={tr('Close {name}', { name: label })}><Icon name="close" size={18} /></button>
      <div className="tx-seg" role="group" aria-label={tr('Transaction type')}>
        {Object.keys(TYPE_LABEL).map(t => <button type="button" key={t} className={type === t ? 'selected' : ''} aria-pressed={type === t} onClick={() => setForm({ ...form, transaction_type: t })}>{tr(TYPE_LABEL[t])}</button>)}
      </div>
      {onScan ? <button type="button" className="tx-round" onClick={onScan} aria-label={tr('Scan a receipt')}><Icon name="scan" size={18} /></button> : <span className="tx-round ghost" />}
    </div>

    <div className="tx-amount" aria-live="polite">
      <span className="tx-currency">{currencySymbol(currency)}</span>
      <div className="tx-figures">
        {hasOp && <small className="tx-expr">{pretty(expr)}</small>}
        <output className={`tx-value${expr ? '' : ' empty'}`} aria-label={tr('Amount')}>{Number.isFinite(value) ? (expr ? number(value, 2) : '0') : tr('Can’t divide by 0')}</output>
      </div>
    </div>

    <label className="tx-note"><Icon name="doc" size={18} /><input aria-label={tr('Description')} required maxLength={160} value={form.merchant} onChange={e => { const merchant = e.target.value; const category = autoCategory && type === 'expense' ? guessCategory(merchant) : form.category; setForm({ ...form, merchant, category }); }} placeholder={type === 'income' ? tr('Where is it from?') : type === 'transfer' ? tr('What is the transfer for?') : tr('What was it for?')} /></label>

    {(cloudMode || accounts.length > 0) ? <div className={`tx-accounts${type === 'transfer' ? ' two' : ''}`}>
      <AccountPicker id="tx-account" label={type === 'transfer' ? tr('From') : type === 'income' ? tr('To account') : tr('Paid with')} ariaLabel={type === 'transfer' ? tr('From account') : tr('Account')} accounts={accounts} value={form.account_id} showBalance={showBalance} required={cloudMode} onChange={v => setForm({ ...form, account_id: v })} />
      {type === 'transfer' && <AccountPicker id="tx-to-account" label={tr('To')} ariaLabel={tr('To account')} accounts={accounts.filter(a => a.id !== form.account_id)} value={form.transfer_to_account_id} showBalance={showBalance} onChange={v => setForm({ ...form, transfer_to_account_id: v })} />}
    </div> : <p className="tx-local">{tr('Saved on this device')}</p>}

    {type === 'expense' && <section className={`tx-cats${allCats ? ' all' : ''}`} aria-label={tr('Category')}>
      <div className="tx-cats-head"><span>{tr('Category')}</span>
        {/* Subcategory: optional detail inside the chosen category, or "Needs review" when unsure. */}
        <label className={`tx-sub${current.sub ? ' has-value' : ''}`}>
        <span className="tx-sub-value">{current.id === NEEDS_REVIEW ? tr('Needs review') : current.sub ? tr(current.subLabel) : tr('Subcategory')}</span>
        <select aria-label={tr('Subcategory')} value={current.custom ? '' : current.id === current.primary ? '' : current.id} onChange={e => { setForm({ ...form, category: e.target.value || current.primary }); }}>
          <option value="">{tr('None')}</option>
          {subcategoriesFor(current.primary).map(g => <optgroup key={g.group} label={tr(g.label)}>{g.subs.map(([id, label]) => <option key={id} value={id}>{tr(label)}</option>)}</optgroup>)}
          {current.primary !== 'other' && <optgroup label={tr('Other')}><option value={NEEDS_REVIEW}>{tr('Needs review')}</option></optgroup>}
        </select>
      </label>
        <button type="button" onClick={() => setAllCats(v => !v)}>{allCats ? tr('Less') : tr('View all')}<Icon name="down" size={14} className={allCats ? 'flip' : ''} /></button></div>
      <div className="tx-chips">{cats.map(([value, name, icon, tone]) => <button type="button" key={value} className={current.primary === value ? 'selected' : ''} aria-pressed={current.primary === value} onClick={() => { if (current.primary !== value) setForm({ ...form, category: value }); }}><span className={`tx-chip-icon tone-${tone}`}><Icon name={icon} size={14} strokeWidth={2} /></span>{tr(name)}</button>)}</div>
    </section>}

    <div className="tx-meta">
      <label><span>{tr('Date')}</span><input type="date" required value={form.occurred_at} onChange={e => setForm({ ...form, occurred_at: e.target.value })} /></label>
      {form.time ? <label><span>{tr('Time')}</span><input type="time" step="1" aria-label={tr('Time')} value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></label>
        : <button type="button" className="tx-clock" onClick={() => setForm({ ...form, time: new Date().toTimeString().slice(0, 8) })} aria-label={tr('Time recorded automatically when saved, now {time}. Tap to set a time.', { time: now })}><span>{tr('Time · auto')}</span><b>{now}</b></button>}
    </div>

    {padOpen ? <div className="tx-pad" role="group" aria-label={tr('Amount keypad')}>
      {KEYS.flat().map(k => <button type="button" key={k} className={`k${/[÷×−+%]/.test(k) ? ' op' : ''}${k === '=' ? ' eq' : ''}${k === '⌫' || k === 'AC' ? ' clear' : ''}`} onClick={() => tap(k)} aria-label={{ '⌫': 'Delete digit', AC: 'Clear amount', '÷': 'Divide', '×': 'Multiply', '−': 'Minus', '+': 'Plus', '=': 'Equals', '%': 'Percent' }[k] || k}>{k === '⌫' ? <Icon name="backspace" size={20} /> : k}</button>)}
      <button type="button" className="tx-pad-toggle" onClick={() => setPadOpen(false)} aria-label={tr('Hide keypad')}><Icon name="down" size={18} /></button>
    </div> : <button type="button" className="tx-pad-show" onClick={() => setPadOpen(true)}><Icon name="calc" size={16} /> {tr('Show keypad')}</button>}

    <ReceiptField form={form} setForm={setForm} cloudMode={cloudMode} />
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="tx-bottom">
      <button type="submit" className="primary-button tx-save" disabled={!canSave}>{busy ? tr('Saving…') : editing ? tr('Save changes') : tr(`Save ${TYPE_LABEL[type]}`)}</button>
    </div>
  </form>}</Sheet>;
}
