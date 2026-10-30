import React, { useState } from 'react';
import Icon from './Icon';
import { Sheet, Money } from './ui';
import { CATEGORY_ICONS } from './TransactionSheet';
import { evaluate } from '../lib/calc';
import { baseCurrency } from '../lib/format';
import { t as tr, rich } from '../lib/i18n';

const iconFor = (cat) => CATEGORY_ICONS.find(c => c[0] === cat) || ['Other', cat, 'layout', 'gray'];
const pct = (a, b) => (b > 0 ? Math.min(999, Math.round((a / b) * 100)) : 0);
const level = (p) => (p >= 100 ? 'over' : p >= 80 ? 'warn' : 'ok');
const monthsLeft = (due) => { if (!due) return 0; const d = new Date(`${due}T00:00:00`); const n = new Date(); return Math.max(1, (d.getFullYear() - n.getFullYear()) * 12 + d.getMonth() - n.getMonth()); };

/** Monthly spending limits per category, with live progress from this month's expenses. */
export function budgetProgress(budgets, monthList) {
  return budgets.map(b => {
    const spent = monthList.filter(t => t.type === 'expense' && t.category === b.category).reduce((s, t) => s + t.amount, 0);
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
      <span className="budget-main"><span><strong>{tr(name)}</strong><small>{b.level === 'over' ? `${tr('Over by')} ` : ''}<Money value={Math.abs(b.left)} show={show} digits={0} />{b.level === 'over' ? '' : ` ${tr('left')}`}</small></span><span className="budget-meter"><i style={{ width: `${Math.min(100, b.percent)}%` }} /></span></span>
      <b>{b.percent}%</b>
    </div>; })}
    {planList.map(p => <div className="budget-row plan" key={p.id}>
      <span className="tx-chip-icon tone-blue"><Icon name="target" size={14} strokeWidth={2} /></span>
      <span className="budget-main"><span><strong>{p.name}</strong><small><Money value={p.saved} show={show} digits={0} /> {tr('of')} <Money value={p.target} show={show} digits={0} /></small></span><span className="budget-meter"><i style={{ width: `${Math.min(100, pct(p.saved, p.target))}%` }} /></span></span>
      <b>{pct(p.saved, p.target)}%</b>
    </div>)}
  </section>;
}

export function BudgetsSheet({ progress, plans, show, cloudMode, onSaveBudget, onDeleteBudget, onSavePlan, onDeletePlan, onClose, initialTab = 'budgets' }) {
  const [tab, setTab] = useState(initialTab === 'plans' ? 'plans' : 'budgets');
  const [draft, setDraft] = useState(null);
  const [err, setErr] = useState('');
  const used = new Set(progress.map(b => b.category));
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
        onSavePlan({ id: draft.id, name: draft.name.trim().slice(0, 60), target, saved, due: draft.due || '' });
      }
      setDraft(null);
    } catch (cause) { setErr(tr(cause.message || 'Could not save. Please try again.')); }
  };
  return <Sheet title={tr('Budgets & Plans')} subtitle={tab === 'budgets' ? (cloudMode ? tr('Monthly limits per category, synced to your account.') : tr('Monthly limits per category, saved on this device.')) : tr('Savings goals with a target and optional date, saved on this device.')} onClose={onClose} label={tr('Budgets and plans')} center>
    <div className="seg-control two" role="group" aria-label={tr('Section')}>{[['budgets', 'Budgets'], ['plans', 'Plans']].map(([k, l]) => <button type="button" key={k} className={tab === k ? 'selected' : ''} aria-pressed={tab === k} onClick={() => { setTab(k); setDraft(null); setErr(''); }}>{tr(l)}</button>)}</div>
    {!draft && <div className="sheet-list">
      {tab === 'budgets' && progress.map(b => { const [, name, icon, tone] = iconFor(b.category); return <button type="button" key={b.id} className={`sheet-card budget-item ${b.level}`} onClick={() => setDraft({ id: b.id, category: b.category, limit: String(b.monthly_limit) })}>
        <span className={`tx-chip-icon tone-${tone}`}><Icon name={icon} size={14} strokeWidth={2} /></span>
        <span className="budget-main"><span><strong>{tr(name)}</strong><small><Money value={b.spent} show={show} digits={0} /> {tr('of')} <Money value={b.monthly_limit} show={show} digits={0} /></small></span><span className="budget-meter"><i style={{ width: `${Math.min(100, b.percent)}%` }} /></span></span>
        <b>{b.percent}%</b></button>; })}
      {tab === 'plans' && plans.map(p => { const need = Math.max(0, p.target - p.saved); const m = monthsLeft(p.due); return <button type="button" key={p.id} className="sheet-card budget-item" onClick={() => setDraft({ ...p, target: String(p.target), saved: String(p.saved) })}>
        <span className="tx-chip-icon tone-blue"><Icon name="target" size={14} strokeWidth={2} /></span>
        <span className="budget-main"><span><strong>{p.name}</strong><small>{need ? (m ? rich('Save {amount}/month to reach it', { amount: <Money value={need / m} show={show} digits={0} /> }) : <><Money value={need} show={show} digits={0} /> {tr('to go')}</>) : tr('Goal reached')}</small></span><span className="budget-meter"><i style={{ width: `${Math.min(100, pct(p.saved, p.target))}%` }} /></span></span>
        <b>{pct(p.saved, p.target)}%</b></button>; })}
      <button type="button" className="manage-button" onClick={() => setDraft(tab === 'budgets' ? { category: CATEGORY_ICONS.find(c => !used.has(c[0]))?.[0] || 'Other', limit: '' } : { name: '', target: '', saved: '', due: '' })}><Icon name="plus" size={18} /> {tab === 'budgets' ? tr('Add budget') : tr('Add plan')}</button>
    </div>}
    {draft && <form className="sheet-form" onSubmit={save}>
      {tab === 'budgets' ? <>
        <label>{tr('Category')}<select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })} disabled={!!draft.id}>{CATEGORY_ICONS.filter(c => c[0] === draft.category || !used.has(c[0])).map(c => <option key={c[0]} value={c[0]}>{tr(c[1])}</option>)}</select></label>
        <label>{tr('Monthly limit ({code})', { code: baseCurrency() })}<input inputMode="decimal" autoFocus value={draft.limit} onChange={e => setDraft({ ...draft, limit: e.target.value.replace(/[^\d.]/g, '') })} placeholder="e.g. 5000" /></label>
      </> : <>
        <label>{tr('Plan name')}<input autoFocus maxLength={60} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder={tr('e.g. Emergency fund, Japan trip')} /></label>
        <div className="form-grid"><label>{tr('Target ({code})', { code: baseCurrency() })}<input inputMode="decimal" value={draft.target} onChange={e => setDraft({ ...draft, target: e.target.value.replace(/[^\d.]/g, '') })} placeholder="50000" /></label>
          <label>{tr('Saved so far')}<input inputMode="decimal" value={draft.saved} onChange={e => setDraft({ ...draft, saved: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0" /></label></div>
        <label>{tr('Target date (optional)')}<input type="date" value={draft.due} onChange={e => setDraft({ ...draft, due: e.target.value })} /></label>
      </>}
      {err && <p className="form-error" role="alert">{err}</p>}
      <div className="sheet-actions">
        {draft.id ? <button type="button" className="danger-button" onClick={async () => { try { if (tab === 'budgets') await onDeleteBudget(draft.id); else onDeletePlan(draft.id); setDraft(null); } catch { setErr(tr('Could not remove it. Please try again.')); } }}>{tr('Remove')}</button> : <button type="button" className="secondary-button" onClick={() => setDraft(null)}>{tr('Cancel')}</button>}
        <button type="submit" className="primary-button">{tr('Save')}</button>
      </div>
    </form>}
  </Sheet>;
}
