import React, { useState } from 'react';
import Icon from './Icon';
import { Sheet, Money } from './ui';
import { CATEGORY_ICONS } from './TransactionSheet';
import { categoryOf } from '../lib/categories';
import { evaluate } from '../lib/calc';
import { baseCurrency } from '../lib/format';
import { estimateSavingsGrowth } from '../lib/savingsProjection';
import { t as tr, rich } from '../lib/i18n';

// A budget's category may be a compact id or an older label; both resolve to the compact category.
const iconFor = (cat) => { const c = categoryOf(cat); return CATEGORY_ICONS.find(x => x[0] === c.primary) || ['other', c.label, 'layout', 'gray']; };
const pct = (a, b) => (b > 0 ? Math.min(999, Math.round((a / b) * 100)) : 0);
const level = (p) => (p >= 100 ? 'over' : p >= 80 ? 'warn' : 'ok');
const monthsLeft = (due) => { if (!due) return 0; const d = new Date(`${due}T00:00:00`); const n = new Date(); return Math.max(1, (d.getFullYear() - n.getFullYear()) * 12 + d.getMonth() - n.getMonth()); };

/** Monthly spending limits per category, with live progress from this month's expenses. */
export function budgetProgress(budgets, monthList) {
  return budgets.map(b => {
    const spent = monthList.filter(t => t.type === 'expense' && categoryOf(t.categoryId || t.category).primary === categoryOf(b.category).primary).reduce((s, t) => s + t.amount, 0);
    const p = pct(spent, b.monthly_limit);
    return { ...b, spent, left: b.monthly_limit - spent, percent: p, level: level(p) };
  });
}

const ROWS = { S: [1, 1], M: [3, 2], L: [8, 5] };

/** Size S shows the single most urgent row, M the top three budgets and two plans, L nearly everything. */
export function BudgetsCard({ progress, plans, show, onOpen, size = 'M' }) {
  const [budgetRows, planRows] = ROWS[size] || ROWS.M;
  const watch = [...progress].sort((a, b) => b.percent - a.percent).slice(0, budgetRows);
  const planList = plans.slice(0, size === 'S' && watch.length ? 0 : planRows);
  return <section className="card budget-card" aria-label={tr('Budgets and plans')}>
    <div className="budget-head"><h2>{tr('Budgets & Plans')}</h2><button type="button" className="link-button" onClick={onOpen}>{tr('Manage')} <Icon name="chevron" size={14} /></button></div>
    {!progress.length && !plans.length && <button type="button" className="budget-empty" onClick={onOpen}><Icon name="target" size={20} /><span><strong>{tr('Set a monthly limit')}</strong><small>{tr('Get a heads-up before a category runs over, and plan savings goals.')}</small></span></button>}
    {watch.map(b => { const [, name, icon, tone] = iconFor(b.category); return <div className={`budget-row ${b.level}`} key={b.id}>
      <span className={`tx-chip-icon tone-${tone}`}><Icon name={icon} size={14} strokeWidth={2} /></span>
      <span className="budget-main"><span><strong>{tr(name)}</strong><small>{b.level === 'over' ? `${tr('Over by')} ` : ''}<Money value={Math.abs(b.left)} show={show} />{b.level === 'over' ? '' : ` ${tr('left')}`}</small></span><span className="budget-meter"><i style={{ width: `${Math.min(100, b.percent)}%` }} /></span></span>
      <b>{b.percent}%</b>
    </div>; })}
    {planList.map(p => <div className="budget-row plan" key={p.id}>
      <span className="tx-chip-icon tone-blue"><Icon name="target" size={14} strokeWidth={2} /></span>
      <span className="budget-main"><span><strong>{p.name}</strong><small><Money value={p.saved} show={show} /> {tr('of')} <Money value={p.target} show={show} /></small></span><span className="budget-meter"><i style={{ width: `${Math.min(100, pct(p.saved, p.target))}%` }} /></span></span>
      <b>{pct(p.saved, p.target)}%</b>
    </div>)}
  </section>;
}

export function BudgetsSheet({ progress, plans, show, cloudMode, onSaveBudget, onDeleteBudget, onSavePlan, onDeletePlan, onOpenLimits, onClose, initialTab = 'budgets' }) {
  const [tab, setTab] = useState(initialTab === 'plans' ? 'plans' : 'budgets');
  const [draft, setDraft] = useState(null);
  const [err, setErr] = useState('');
  const used = new Set(progress.map(b => categoryOf(b.category).primary));
  const save = async (e) => {
    e.preventDefault(); setErr('');
    try {
      if (tab === 'budgets') {
        const limit = evaluate(String(draft.limit || ''));
        if (!(limit > 0)) throw new Error(tr('Enter a monthly limit greater than zero.'));
        await onSaveBudget({ id: draft.id, category: draft.category, monthly_limit: limit });
      } else {
        const target = evaluate(String(draft.target || '')); const saved = evaluate(String(draft.saved || '0'));
        if (!draft.name.trim()) throw new Error(tr('Name your plan.'));
        if (!(target > 0) || !(saved >= 0)) throw new Error(tr('Enter a target above zero and a saved amount of zero or more.'));
        onSavePlan({ id: draft.id, name: draft.name.trim().slice(0, 60), target, saved, due: draft.due || '', annual_rate: Math.max(0, Math.min(100, Number(draft.annual_rate) || 0)), compounding: draft.compounding || 'monthly' });
      }
      setDraft(null);
    } catch (cause) { setErr(tr(cause.message || 'Could not save. Please try again.')); }
  };
  return <Sheet title={tr('Budgets & Plans')} subtitle={tab === 'budgets' ? (cloudMode ? tr('Monthly limits per category, synced to your account.') : tr('Monthly limits per category, saved on this device.')) : tr('Savings goals with a target and optional date, saved on this device.')} onClose={onClose} label={tr('Budgets and plans')} center>
    <div className="seg-control two" role="group" aria-label={tr('Section')}>{[['budgets', 'Budgets'], ['plans', 'Plans']].map(([k, l]) => <button type="button" key={k} className={tab === k ? 'selected' : ''} aria-pressed={tab === k} onClick={() => { setTab(k); setDraft(null); setErr(''); }}>{tr(l)}</button>)}</div>
    {tab === 'budgets' && onOpenLimits && <button type="button" className="link-button" onClick={onOpenLimits}><Icon name="limits" size={16} /> {tr('Account & merchant limits')}</button>}
    {!draft && <div className="sheet-list">
      {tab === 'budgets' && progress.map(b => { const [, name, icon, tone] = iconFor(b.category); return <button type="button" key={b.id} className={`sheet-card budget-item ${b.level}`} onClick={() => setDraft({ id: b.id, category: b.category, limit: String(b.monthly_limit) })}>
        <span className={`tx-chip-icon tone-${tone}`}><Icon name={icon} size={14} strokeWidth={2} /></span>
        <span className="budget-main"><span><strong>{tr(name)}</strong><small><Money value={b.spent} show={show} /> {tr('of')} <Money value={b.monthly_limit} show={show} /></small></span><span className="budget-meter"><i style={{ width: `${Math.min(100, b.percent)}%` }} /></span></span>
        <b>{b.percent}%</b></button>; })}
      {tab === 'plans' && plans.map(p => { const need = Math.max(0, p.target - p.saved); const m = monthsLeft(p.due); const horizon = m || 12; const projection = Number(p.annual_rate) > 0 ? estimateSavingsGrowth(p.saved, need / horizon, p.annual_rate, horizon, p.compounding || 'monthly') : null; return <button type="button" key={p.id} className="sheet-card budget-item" onClick={() => setDraft({ ...p, target: String(p.target), saved: String(p.saved), annual_rate: String(p.annual_rate || ''), compounding: p.compounding || 'monthly' })}>
        <span className="tx-chip-icon tone-blue"><Icon name="target" size={14} strokeWidth={2} /></span>
        <span className="budget-main"><span><strong>{p.name}</strong><small>{need ? (m ? rich('Save {amount}/month to reach it', { amount: <Money value={need / m} show={show} /> }) : <><Money value={need} show={show} /> {tr('to go')}</>) : tr('Goal reached')}</small>{projection && <small>{rich('Estimated interest over {months} months: {amount}', { months: horizon, amount: <Money value={projection.interestEarned} show={show} /> })}</small>}</span><span className="budget-meter"><i style={{ width: `${Math.min(100, pct(p.saved, p.target))}%` }} /></span></span>
        <b>{pct(p.saved, p.target)}%</b></button>; })}
      <button type="button" className="manage-button" onClick={() => setDraft(tab === 'budgets' ? { category: CATEGORY_ICONS.find(c => !used.has(c[0]))?.[0] || 'Other', limit: '' }  : { name: '', target: '', saved: '', due: '', annual_rate: '', compounding: 'monthly' })}><Icon name="plus" size={18} /> {tab === 'budgets' ? tr('Add budget') : tr('Add plan')}</button>
    </div>}
    {draft && <form className="sheet-form" onSubmit={save}>
      {tab === 'budgets' ? <>
        <label>{tr('Category')}<select value={categoryOf(draft.category).primary} onChange={e => setDraft({ ...draft, category: e.target.value })} disabled={!!draft.id}>{CATEGORY_ICONS.filter(c => c[0] === categoryOf(draft.category).primary || !used.has(c[0])).map(c => <option key={c[0]} value={c[0]}>{tr(c[1])}</option>)}</select></label>
        <label>{tr('Monthly limit ({code})', { code: baseCurrency() })}<input inputMode="decimal" autoFocus value={draft.limit} onChange={e => setDraft({ ...draft, limit: e.target.value.replace(/[^\d.]/g, '') })} placeholder="e.g. 5000" /></label>
      </> : <>
        <label>{tr('Plan name')}<input autoFocus maxLength={60} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder={tr('e.g. Emergency fund, Japan trip')} /></label>
        <div className="form-grid"><label>{tr('Target ({code})', { code: baseCurrency() })}<input inputMode="decimal" value={draft.target} onChange={e => setDraft({ ...draft, target: e.target.value.replace(/[^\d.]/g, '') })} placeholder="50000" /></label>
          <label>{tr('Saved so far')}<input inputMode="decimal" value={draft.saved} onChange={e => setDraft({ ...draft, saved: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0" /></label></div>
        <label>{tr('Estimated annual interest (%)')}<input inputMode="decimal" value={draft.annual_rate || ''} onChange={e => setDraft({ ...draft, annual_rate: e.target.value.replace(/[^\d.]/g, '') })} placeholder="e.g. 4.5" /></label>
        <label>{tr('Compounding')}<select value={draft.compounding || 'monthly'} onChange={e => setDraft({ ...draft, compounding: e.target.value })}><option value="monthly">{tr('Monthly')}</option><option value="quarterly">{tr('Quarterly')}</option><option value="annually">{tr('Annually')}</option></select></label>
        <label>{tr('Target date (optional)')}<input type="date" value={draft.due} onChange={e => setDraft({ ...draft, due: e.target.value })} /></label>
      </>}
      {err && <p className="form-error" role="alert">{err}</p>}
      <div className="sheet-actions">
        {draft.id ? <button type="button" className="danger-button" onClick={async () => { try { const removed = tab === 'budgets' ? await onDeleteBudget(draft.id) : await onDeletePlan(draft.id); if (removed !== false) setDraft(null); } catch { setErr(tr('Could not remove it. Please try again.')); } }}>{tr('Remove')}</button> : <button type="button" className="secondary-button" onClick={() => setDraft(null)}>{tr('Cancel')}</button>}
        <button type="submit" className="primary-button">{tr('Save')}</button>
      </div>
    </form>}
  </Sheet>;
}


export function SpendingLimitsSheet({ limits = [], accounts = [], show, onSave, onDelete, onClose }) {
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const startDraft = (row = null) => {
    setError('');
    setDraft(row ? { ...row, limit: String(row.monthly_limit), alert_percent: String(row.alert_percent || 80) }
      : { scope: accounts.length ? 'account' : 'merchant', account_id: accounts[0]?.id || '', merchant: '', limit: '', alert_percent: '80' });
  };
  const save = async (event) => {
    event.preventDefault(); setError('');
    const amount = evaluate(String(draft.limit || ''));
    const threshold = Number(draft.alert_percent || 80);
    if (!(amount > 0)) { setError(tr('Enter a monthly limit greater than zero.')); return; }
    if (!(threshold >= 1 && threshold <= 100)) { setError(tr('Alert threshold must be between 1 and 100.')); return; }
    if (draft.scope === 'account' && !draft.account_id) { setError(tr('Choose an account.')); return; }
    if (draft.scope === 'merchant' && !String(draft.merchant || '').trim()) { setError(tr('Enter a merchant name')); return; }
    await onSave({ id: draft.id, scope: draft.scope, account_id: draft.scope === 'account' ? draft.account_id : '', merchant: draft.scope === 'merchant' ? String(draft.merchant).trim().slice(0, 100) : '', monthly_limit: amount, alert_percent: threshold });
    setDraft(null);
  };
  return <Sheet title={tr('Spending limits')} subtitle={tr('Set monthly caps for a specific account or merchant.')} onClose={onClose} label={tr('Spending limits')} center>
    {!draft && <div className="sheet-list">
      {limits.map(limit => <button type="button" key={limit.id} className={`sheet-card budget-item ${limit.level}`} onClick={() => startDraft(limit)}>
        <span className="tx-chip-icon tone-blue"><Icon name="limits" size={14} /></span>
        <span className="budget-main"><span><strong>{limit.scope === 'account' ? (limit.account_name || tr('Account')) : limit.merchant}</strong><small><Money value={limit.spent} show={show} /> {tr('of')} <Money value={limit.monthly_limit} show={show} /></small></span><span className="budget-meter"><i style={{ width: `${Math.min(100, limit.percent)}%` }} /></span></span>
        <b>{limit.percent}%</b>
      </button>)}
      {!limits.length && <p className="empty-state">{tr('No spending limits yet.')}</p>}
      <button type="button" className="manage-button" onClick={() => startDraft()}><Icon name="plus" size={18} /> {tr('Add spending limit')}</button>
    </div>}
    {draft && <form className="sheet-form" onSubmit={save}>
      <label>{tr('Scope')}<select value={draft.scope} onChange={e => setDraft({ ...draft, scope: e.target.value })}><option value="account">{tr('Account')}</option><option value="merchant">{tr('Merchant')}</option></select></label>
      {draft.scope === 'account' ? <label>{tr('Select an account')}<select value={draft.account_id} onChange={e => setDraft({ ...draft, account_id: e.target.value })}><option value="">{tr('Select an account')}</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        : <label>{tr('Enter a merchant name')}<input autoFocus maxLength={100} value={draft.merchant} onChange={e => setDraft({ ...draft, merchant: e.target.value })} placeholder={tr('e.g. Grocery store')} /></label>}
      <label>{tr('Monthly limit ({code})', { code: baseCurrency() })}<input inputMode="decimal" value={draft.limit} onChange={e => setDraft({ ...draft, limit: e.target.value.replace(/[^\d.]/g, '') })} placeholder="e.g. 5000" /></label>
      <label>{tr('Alert threshold (%)')}<input inputMode="numeric" type="number" min="1" max="100" value={draft.alert_percent} onChange={e => setDraft({ ...draft, alert_percent: e.target.value })} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="sheet-actions">
        {draft.id ? <button type="button" className="danger-button" onClick={async () => { if (await onDelete(draft.id) !== false) setDraft(null); }}>{tr('Remove')}</button> : <button type="button" className="secondary-button" onClick={() => setDraft(null)}>{tr('Cancel')}</button>}
        <button type="submit" className="primary-button">{tr('Save')}</button>
      </div>
    </form>}
  </Sheet>;
}
