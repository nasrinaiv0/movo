import React, { useState } from 'react';
import Icon from './Icon';
import { Sheet } from './ui';
import AccountTile, { ACCOUNT_TYPES, ACCOUNT_COLORS, ACCOUNT_ICONS, typeMeta } from './AccountTile';
import { evaluate, press } from '../lib/calc';

export const CURRENCIES = [['PHP', 'Philippine Peso', '₱'], ['USD', 'US Dollar', '$'], ['EUR', 'Euro', '€'], ['JPY', 'Japanese Yen', '¥'], ['SGD', 'Singapore Dollar', 'S$'], ['AED', 'UAE Dirham', 'د.إ'], ['SAR', 'Saudi Riyal', '﷼'], ['GBP', 'British Pound', '£']];
const PAD = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '.', '0', '⌫', '+'];

/** Full-height add/edit account screen with a live preview card, as in the account setup design. */
export default function AccountSheet({ form, setForm, editing, cloudMode, busy, error, onSave, onClose }) {
  const [openStyle, setOpenStyle] = useState(false);
  const [openMore, setOpenMore] = useState(!!(form.institution_name || form.mask));
  const [pad, setPad] = useState(false);
  const meta = typeMeta(form.account_type);
  const color = form.color || meta.color; const icon = form.icon || meta.icon;
  const balance = evaluate(String(form.opening_balance || '').replace(/[^\d.+−×÷]/g, '').replace(/-/g, '−'));
  const currency = CURRENCIES.find(c => c[0] === form.currency) || CURRENCIES[0];
  const label = editing ? 'Edit account' : 'Add account';
  const set = (patch) => setForm({ ...form, ...patch });

  return <Sheet label={label} onClose={onClose} hideClose className="acct-sheet">{(close) => <form className="acct-form" onSubmit={onSave}>
    <div className="acct-head"><button type="button" className="tx-round" onClick={close} aria-label={`Close ${label}`}><Icon name="back" size={18} /></button><h2>{editing ? 'Edit Account' : 'Add Account'}</h2><span className="tx-round ghost" /></div>
    <div className="acct-preview"><AccountTile a={{ name: form.name.trim() || 'Account preview', account_type: form.account_type, balance: Number.isFinite(balance) ? balance : 0, currency: currency[0] }} style={{ color, icon }} size="preview" /></div>

    <div className="acct-panel">
      <label className="acct-label" htmlFor="acct-type">Account type</label>
      <div className="acct-field select"><span><strong>{meta.label}</strong><small>{meta.sub}</small></span><span className="acct-field-icon" style={{ color }}><Icon name={meta.icon} size={18} /></span><Icon name="down" size={16} />
        <select id="acct-type" aria-label="Account type" value={form.account_type} onChange={e => set({ account_type: e.target.value })}>{ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>

      <label className="acct-label" htmlFor="acct-name">Account name</label>
      <input id="acct-name" className="acct-input" required maxLength="100" value={form.name} onChange={e => set({ name: e.target.value })} placeholder="Account name (e.g. BPI, GCash, Cash)" />

      <label className="acct-label" htmlFor="acct-currency">Account currency</label>
      <div className="acct-field select"><span><strong>{currency[0]}</strong><small>{currency[1]}</small></span><span className="acct-field-icon" style={{ color }}>{currency[2]}</span><Icon name="chevron" size={16} />
        <select id="acct-currency" aria-label="Account currency" value={currency[0]} onChange={e => set({ currency: e.target.value })} disabled={editing && cloudMode}>{CURRENCIES.map(c => <option key={c[0]} value={c[0]}>{c[0]} · {c[1]}</option>)}</select></div>
      <p className="acct-hint">New accounts start in pesos; change it here before saving.</p>

      <div className={`acct-field acct-style${openStyle ? ' open' : ''}`}>
        <button type="button" className="acct-style-head" onClick={() => setOpenStyle(v => !v)} aria-expanded={openStyle}>
          <span className="acct-style-swatch" style={{ background: color }}><Icon name={icon} size={18} strokeWidth={2} /></span>
          <span><strong>Account style</strong><small>Custom icon and color</small></span><em>Edit</em><Icon name="down" size={16} />
        </button>
        {openStyle && <div className="acct-style-body">
          <div className="acct-swatches" role="radiogroup" aria-label="Account color">{ACCOUNT_COLORS.map(c => <button type="button" key={c} role="radio" aria-checked={color === c} aria-label={`Color ${c}`} style={{ background: c }} onClick={() => set({ color: c })}>{color === c && <Icon name="check" size={14} strokeWidth={3} />}</button>)}</div>
          <div className="acct-icons" role="radiogroup" aria-label="Account icon">{ACCOUNT_ICONS.map(i => <button type="button" key={i} role="radio" aria-checked={icon === i} aria-label={`Icon ${i}`} className={icon === i ? 'on' : ''} onClick={() => set({ icon: i })}><Icon name={i} size={18} /></button>)}</div>
        </div>}
      </div>

      <label className="acct-label" htmlFor="acct-balance">{editing ? 'Opening balance' : 'Starting balance'}</label>
      <div className="acct-input with-action">
        <input id="acct-balance" inputMode="decimal" value={form.opening_balance} onChange={e => set({ opening_balance: e.target.value.replace(/[^\d.+\-−×÷*/]/g, '').replace(/\*/g, '×').replace(/\//g, '÷') })} placeholder="Starting balance (e.g. 5,000)" />
        <button type="button" onClick={() => setPad(v => !v)} aria-label={pad ? 'Hide calculator' : 'Show calculator'} aria-pressed={pad}><Icon name="calc" size={18} /></button>
      </div>
      {pad && <div className="acct-pad">{PAD.map(k => <button type="button" key={k} className={/[÷×−+]/.test(k) ? 'op' : ''} onClick={() => set({ opening_balance: press(String(form.opening_balance || '').replace(/^0$/, ''), k) })}>{k === '⌫' ? <Icon name="backspace" size={18} /> : k}</button>)}<button type="button" className="eq" onClick={() => set({ opening_balance: Number.isFinite(balance) ? String(balance) : '' })}>=</button></div>}
      <p className="acct-hint">Your account's starting point before expenses, income, transfers and adjustments.</p>

      <div className={`acct-field acct-more${openMore ? ' open' : ''}`}>
        <button type="button" className="acct-style-head" onClick={() => setOpenMore(v => !v)} aria-expanded={openMore}><span><strong>More options</strong><small>Institution and card number display.</small></span><Icon name="down" size={16} /></button>
        {openMore && <div className="acct-style-body">
          <label className="acct-label" htmlFor="acct-inst">Bank / institution</label>
          <input id="acct-inst" className="acct-input" maxLength="100" value={form.institution_name} onChange={e => set({ institution_name: e.target.value })} placeholder="e.g. BPI, Metrobank, Visa" />
          {form.account_type === 'card' && <><label className="acct-label" htmlFor="acct-mask">Last 4 digits (optional)</label><input id="acct-mask" className="acct-input" inputMode="numeric" maxLength="4" value={form.mask || ''} onChange={e => set({ mask: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="1234" /></>}
          <p className="acct-hint">Never enter a full card number, CVV or PIN. MOVO only needs the last 4 digits to label the card.</p>
        </div>}
      </div>
      {!cloudMode && <p className="acct-hint">Stored on this device only. Sign in to sync it to your MOVO account.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
    <div className="tx-bottom"><button type="submit" className="primary-button acct-save" disabled={busy || !form.name.trim() || !Number.isFinite(balance)}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add account'}</button></div>
  </form>}</Sheet>;
}
