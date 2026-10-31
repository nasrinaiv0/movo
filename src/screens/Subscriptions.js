import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon';
import { SubHeader, Sheet, Money } from '../components/ui';
import { formatDate, money, shown, currencySymbol } from '../lib/format';
import { CATALOG, CYCLES, SUB_CATEGORIES, catalogFor, summarize, renewalsBetween, monthlyCost, toDay, dayDiff } from '../lib/subscriptions';
import { evaluate } from '../lib/calc';
import { BRAND_LOGOS } from '../lib/brandLogos';
import { t as tr } from '../lib/i18n';

const TABS = [['upcoming', 'Upcoming'], ['calendar', 'Calendar'], ['insights', 'Insights']];
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const pad = (n) => String(n).padStart(2, '0');

/* Official marks load on demand in their own chunk; initials show until then and for services without a mark. */
let MARKS = null; let marksLoading = null;
function useMarks() {
  const [marks, setMarks] = useState(MARKS);
  useEffect(() => {
    if (MARKS) return undefined;
    let live = true;
    marksLoading = marksLoading || import('../lib/brandMarks').then(m => { MARKS = m.BRAND_MARKS; return MARKS; }).catch(() => null);
    marksLoading.then(m => { if (live && m) setMarks(m); });
    return () => { live = false; };
  }, []);
  return marks;
}
const isLight = (hex) => { const n = parseInt(String(hex).slice(1), 16); if (Number.isNaN(n)) return false; return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) > 186; };

/** Prefer bundled official logos, then Simple Icons, then official-site favicons, then initials. */
export function SubIcon({ sub, size = 40 }) {
  const marks = useMarks();
  const known = catalogFor(sub.name);
  const color = sub.color || known?.color || '#64748b';
  const mark = marks && known?.mark ? marks[known.mark] : null;
  const [broken, setBroken] = useState(false);
  const [faviconBroken, setFaviconBroken] = useState(false);
  const logo = known && !broken ? BRAND_LOGOS[known.id] : null;
  if (logo) {
    const fill = /\.(png|jpe?g|webp)$/.test(logo);
    return <span className={`sub-icon has-logo${fill ? ' fill' : ''}`} style={{ width: size, height: size, padding: fill ? 0 : Math.round(size * 0.14) }} aria-hidden="true">
      <img src={`${process.env.PUBLIC_URL || ''}/brands/${logo}`} alt="" width={size} height={size} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
    </span>;
  }
  if (mark && !broken) {
    return <span className="sub-icon has-mark" style={{ width: size, height: size, background: color }} aria-hidden="true">
      <svg viewBox="0 0 24 24" width={Math.round(size * 0.54)} height={Math.round(size * 0.54)}><path d={mark.path} fill={isLight(color) ? '#111' : '#fff'} /></svg>
    </span>;
  }
  if (known?.site && !faviconBroken) {
    return <span className="sub-icon has-logo favicon-logo" style={{ width: size, height: size, padding: Math.round(size * 0.18) }} aria-hidden="true">
      <img src={`https://${known.site}/favicon.ico`} alt="" width={size} height={size} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFaviconBroken(true)} />
    </span>;
  }
  const initials = String(sub.name || '?').replace(/[^A-Za-z0-9+ ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  return <span className="sub-icon" style={{ width: size, height: size, background: color, color: isLight(color) ? '#111' : '#fff', fontSize: Math.round(size * 0.36) }} aria-hidden="true">{initials}</span>;
}

/** Shown wherever brand marks appear. */
export const BrandNotice = () => <p className="form-note brand-notice">{tr('Brand names and logos are trademarks of their respective owners and are shown only to identify each service. MOVO is not affiliated with, endorsed or sponsored by, or advertising for any of these companies.')}</p>;

export const whenLabel = (days) => (days === 0 ? tr('Today') : days === 1 ? tr('Tomorrow') : days === -1 ? tr('Yesterday') : days < 0 ? tr('{n} days ago', { n: -days }) : tr('in {n} days', { n: days }));

/** Upcoming renewals, used on Home and in the tracker. */
export function UpcomingList({ upcoming, show, today, onOpen, limit = 99 }) {
  if (!upcoming.length) return <p className="empty">{tr('No upcoming renewals.')}</p>;
  return <div className="card list-card sub-list">{upcoming.slice(0, limit).map(s => <button type="button" key={s.id} className="sub-row" onClick={() => onOpen?.(s)}>
    <span className="sub-date"><b>{Number(s.next.slice(8, 10))}</b><small>{formatDate(`${s.next}T12:00:00`, { month: 'short' }, 'mon')}</small></span>
    <SubIcon sub={s} />
    <span className="sub-main"><strong>{s.name}</strong><small>{tr(s.category || 'Other')}</small></span>
    <span className="sub-amount"><b>{shown(show, money(Number(s.amount) || 0, s.currency))}</b><small>{whenLabel(dayDiff(today, s.next))}</small></span>
  </button>)}</div>;
}

function Calendar({ subs, show, onOpen }) {
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 });
  const [pick, setPick] = useState('');
  const first = `${cursor.y}-${pad(cursor.m)}-01`;
  const days = new Date(cursor.y, cursor.m, 0).getDate();
  const last = `${cursor.y}-${pad(cursor.m)}-${pad(days)}`;
  const byDay = useMemo(() => {
    const map = {};
    subs.forEach(s => renewalsBetween(s, first, last).forEach(d => { (map[d] = map[d] || []).push(s); }));
    return map;
  }, [subs, first, last]);
  const lead = (new Date(cursor.y, cursor.m - 1, 1).getDay() + 6) % 7;
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${cursor.y}-${pad(cursor.m)}-${pad(i + 1)}`)];
  const today = toDay(now);
  const move = (n) => { setPick(''); setCursor(({ y, m }) => { const d = new Date(y, m - 1 + n, 1); return { y: d.getFullYear(), m: d.getMonth() + 1 }; }); };
  const monthList = Object.entries(byDay).sort(([a], [b]) => (a < b ? -1 : 1)).flatMap(([d, list]) => list.map(s => ({ ...s, next: d })));
  const shownList = pick ? monthList.filter(s => s.next === pick) : monthList;
  return <>
    <section className="card sub-calendar" aria-label={tr('Renewal calendar')}>
      <div className="sub-cal-head">
        <button type="button" className="plain-icon" aria-label={tr('Previous month')} onClick={() => move(-1)}><Icon name="back" size={18} /></button>
        <strong>{formatDate(`${first}T12:00:00`, { month: 'long', year: 'numeric' }, 'monthLong')}</strong>
        <button type="button" className="plain-icon" aria-label={tr('Next month')} onClick={() => move(1)}><Icon name="chevron" size={18} /></button>
      </div>
      <div className="sub-cal-grid" role="grid">
        {WEEK.map(d => <span key={d} className="sub-cal-dow">{formatDate(`2026-11-0${d + 1}T12:00:00`, { weekday: 'narrow' }, 'dow')}</span>)}
        {cells.map((d, i) => d ? <button type="button" key={d} role="gridcell" className={`sub-cal-day${d === today ? ' today' : ''}${pick === d ? ' on' : ''}${byDay[d] ? ' has' : ''}`} aria-label={byDay[d] ? tr('{date}: {n} renewal(s)', { date: formatDate(`${d}T12:00:00`, { month: 'long', day: 'numeric' }, 'md'), n: byDay[d].length }) : formatDate(`${d}T12:00:00`, { month: 'long', day: 'numeric' }, 'md')} onClick={() => setPick(pick === d ? '' : d)}>
          <span>{Number(d.slice(8))}</span>
          {byDay[d] && <span className="sub-cal-icons">{byDay[d].slice(0, 2).map(s => <SubIcon key={s.id} sub={s} size={18} />)}</span>}
        </button> : <span key={`e${i}`} />)}
      </div>
    </section>
    <div className="sub-list-head"><h2>{pick ? formatDate(`${pick}T12:00:00`, { month: 'long', day: 'numeric' }, 'md') : tr('This month')}</h2><span className="count-pill">{shownList.length}</span></div>
    {shownList.length ? <UpcomingList upcoming={shownList} show={show} today={today} onOpen={onOpen} /> : <p className="empty">{tr('No renewals on this day.')}</p>}
  </>;
}

function Insights({ summary, show, income }) {
  const top = Math.max(1, ...summary.byCategory.map(c => c.amount));
  const priciest = summary.upcoming.slice().sort((a, b) => b.monthlyHome - a.monthlyHome)[0];
  return <>
    <section className="stat-grid two">
      <article className="card stat-card"><small>{tr('Per month')}</small><strong><Money value={summary.monthly} show={show} digits={0} /></strong></article>
      <article className="card stat-card"><small>{tr('Per year')}</small><strong><Money value={summary.annual} show={show} digits={0} /></strong></article>
    </section>
    {income > 0 && <p className="sub-note">{tr('Subscriptions use {pct} of this month’s income.', { pct: `${Math.round((summary.monthly / income) * 100)}%` })}</p>}
    {priciest && <p className="sub-note">{tr('Most expensive: {name}, {amount} a month.', { name: priciest.name, amount: shown(show, money(priciest.monthlyHome, undefined, 0)) })}</p>}
    <h2 className="group-title">{tr('By category')}</h2>
    <section className="card pad"><ul className="cat-bars">{summary.byCategory.map((c, i) => <li key={c.category} style={{ '--i': i }}>
      <span className="cat-bars-head"><span>{tr(c.category)}</span><b><Money value={c.amount} show={show} digits={0} /> {tr('/month')}</b></span>
      <span className="cat-bars-track"><i style={{ width: `${(c.amount / top) * 100}%`, background: 'var(--accent)' }} /></span>
    </li>)}</ul>{!summary.byCategory.length && <p className="empty">{tr('Add subscriptions to see where the money goes.')}</p>}</section>
  </>;
}

const catalogSection = (category) => {
  if (category === 'Social media & messaging') return 'Social media & messaging';
  if (['Entertainment', 'Music'].includes(category)) return 'Streaming & entertainment';
  if (['AI Tools', 'Developer', 'Productivity', 'Design', 'Cloud storage'].includes(category)) return 'AI, productivity & cloud storage';
  return 'Gaming & other memberships';
};

/** Searchable, grouped catalog; regional items are surfaced first without hiding the full catalog. */
function CatalogSheet({ onPick, onClose, country }) {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const list = CATALOG.filter(c => `${c.name} ${tr(c.category)} ${tr(catalogSection(c.category))}`.toLowerCase().includes(query));
  const local = country ? list.filter(c => c.region === country) : [];
  const rest = list.filter(c => !local.includes(c));
  const row = (c) => <button type="button" key={c.id} className="catalog-row" onClick={() => onPick({ name: c.name, category: c.category, color: c.color })}><SubIcon sub={c} /><span className="sub-main"><strong>{c.name}</strong><small>{tr(c.category)}</small></span><Icon name="chevron" size={16} /></button>;
  const renderGrouped = (items) => {
    const order = ['Social media & messaging', 'Streaming & entertainment', 'AI, productivity & cloud storage', 'Gaming & other memberships'];
    return order.map(title => {
      const group = items.filter(c => catalogSection(c.category) === title);
      if (!group.length) return null;
      return <section className="catalog-section" key={title} aria-label={tr(title)}>
        <h3 className="catalog-group">{tr(title)} <span className="count-pill">{group.length}</span></h3>
        {group.map(row)}
      </section>;
    });
  };
  return <Sheet title={tr('Apps & services')} onClose={onClose} label={tr('Apps & services')} className="sheet-search">
    <label className="search-field"><Icon name="search" size={17} /><input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={tr('Search for an app or service')} aria-label={tr('Search for an app or service')} /></label>
    <div className="sheet-list catalog-list">
      <button type="button" className="catalog-row" onClick={() => onPick({ name: q.trim(), category: 'Other' })}><span className="sub-icon custom"><Icon name="plus" size={18} /></span><span className="sub-main"><strong>{q.trim() ? tr('Add “{name}”', { name: q.trim() }) : tr('Custom subscription')}</strong><small>{tr('Anything not in the list')}</small></span><Icon name="chevron" size={16} /></button>
      {local.length > 0 && <><h3 className="catalog-group">{tr('Popular in your region')}</h3>{renderGrouped(local)}</>}
      {local.length > 0 && rest.length > 0 && <h3 className="catalog-group">{tr('More apps & services')}</h3>}
      {renderGrouped(rest)}
      {!list.length && <p className="empty">{tr('No apps or services found.')}</p>}
    </div>
    <BrandNotice />
  </Sheet>;
}

function SubForm({ draft, setDraft, base, onSave, onDelete, onLog, onClose }) {
  const [err, setErr] = useState('');
  const editing = !!draft.id;
  const save = (e) => {
    e.preventDefault(); setErr('');
    const amount = evaluate(String(draft.amount || ''));
    if (!draft.name.trim()) { setErr(tr('Enter a name.')); return; }
    if (!(amount > 0)) { setErr(tr('Enter an amount greater than zero.')); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.start || '')) { setErr(tr('Choose the next billing date.')); return; }
    onSave({ ...draft, name: draft.name.trim().slice(0, 60), amount: Math.round(amount * 100) / 100, currency: draft.currency || base });
  };
  return <Sheet title={editing ? draft.name : tr('Add subscription')} subtitle={tr('Saved on this device. MOVO reminds you; it never charges or cancels anything.')} onClose={onClose} label={tr('Subscription')} center>
    <form className="sheet-form" onSubmit={save}>
      <div className="sub-form-head"><SubIcon sub={draft} size={48} /><label>{tr('Name')}<input value={draft.name} maxLength={60} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder={tr('e.g. Netflix')} /></label></div>
      <div className="form-grid">
        <label>{tr('Amount ({code})', { code: draft.currency || base })}<input inputMode="decimal" value={draft.amount} onChange={e => setDraft({ ...draft, amount: e.target.value.replace(/[^\d.+\-*/]/g, '') })} placeholder={`${currencySymbol(draft.currency || base)}0.00`} /></label>
        <label>{tr('Billing cycle')}<select value={draft.cycle} onChange={e => setDraft({ ...draft, cycle: e.target.value })}>{CYCLES.map(([k, l]) => <option key={k} value={k}>{tr(l)}</option>)}</select></label>
      </div>
      <div className="form-grid">
        <label>{tr('Next billing date')}<input type="date" value={draft.start} onChange={e => setDraft({ ...draft, start: e.target.value })} /></label>
        <label>{tr('Category')}<select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}>{SUB_CATEGORIES.map(k => <option key={k} value={k}>{tr(k)}</option>)}</select></label>
      </div>
      {editing && <label>{tr('Status')}<select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })}>{[['active', 'Active'], ['paused', 'Paused'], ['cancelled', 'Cancelled']].map(([k, l]) => <option key={k} value={k}>{tr(l)}</option>)}</select></label>}
      {err && <p className="form-error" role="alert">{err}</p>}
      {editing && draft.status === 'active' && <button type="button" className="secondary-button wide-button" onClick={() => onLog(draft)}><Icon name="receipt" size={16} /> {tr('Log this payment as an expense')}</button>}
      <div className="sheet-actions">
        {editing ? <button type="button" className="danger-button" onClick={() => onDelete(draft.id)}>{tr('Remove')}</button> : <button type="button" className="secondary-button" onClick={onClose}>{tr('Cancel')}</button>}
        <button type="submit" className="primary-button">{tr('Save')}</button>
      </div>
    </form>
  </Sheet>;
}

export default function Subscriptions({ c }) {
  const { show, go, base, toBase, monthStats } = c;
  const subs = c.subscriptions || [];
  const [tab, setTab] = useState('upcoming');
  const [catalog, setCatalog] = useState(false);
  const [draft, setDraft] = useState(null);
  const now = new Date(); const today = toDay(now);
  const summary = useMemo(() => {
    const s = summarize(subs, now, toBase);
    s.upcoming = s.upcoming.map(x => ({ ...x, monthlyHome: toBase(monthlyCost(x), x.currency) }));
    return s;
  }, [subs, toBase, today]); // keyed on the calendar day, not the render time
  const open = (s) => setDraft({ ...subs.find(x => x.id === s.id) });
  const startNew = (pick) => { setCatalog(false); setDraft({ name: pick.name, category: pick.category, color: pick.color, amount: '', currency: base, cycle: 'monthly', start: today, status: 'active' }); };
  const paused = subs.filter(s => s.status !== 'active');

  return <>
    <SubHeader title={tr('Subscriptions')} onBack={() => go('Menu')} right={<button type="button" className="round-button" aria-label={tr('Add subscription')} onClick={() => setCatalog(true)}><Icon name="plus" size={20} /></button>} />
    <section className="card sub-hero" aria-label={tr('Subscription summary')}>
      <small>{tr('Monthly subscriptions')}</small>
      <div className="balance-amount"><Money value={summary.monthly} show={show} /></div>
      <div className="sub-hero-row">
        <span><b><Money value={summary.annual} show={show} digits={0} /></b><small>{tr('per year')}</small></span>
        <span><b>{summary.activeCount}</b><small>{summary.activeCount === 1 ? tr('active plan') : tr('active plans')}</small></span>
        <span><b>{summary.dueSoon.length}</b><small>{tr('due in 7 days')}</small></span>
      </div>
    </section>
    <div className="seg-control three" role="group" aria-label={tr('Subscription view')}>{TABS.map(([k, l]) => <button type="button" key={k} className={tab === k ? 'selected' : ''} aria-pressed={tab === k} onClick={() => setTab(k)}>{tr(l)}</button>)}</div>
    {!subs.length ? <button type="button" className="budget-empty sub-empty" onClick={() => setCatalog(true)}><Icon name="plus" size={20} /><span><strong>{tr('Track your first subscription')}</strong><small>{tr('Netflix, Spotify, Claude, ChatGPT and more. See every renewal before it charges.')}</small></span></button>
      : tab === 'upcoming' ? <>
        <UpcomingList upcoming={summary.upcoming} show={show} today={today} onOpen={open} />
        {paused.length > 0 && <><h2 className="group-title">{tr('Paused or cancelled')}</h2><div className="card list-card sub-list">{paused.map(s => <button type="button" key={s.id} className="sub-row muted" onClick={() => open(s)}><SubIcon sub={s} /><span className="sub-main"><strong>{s.name}</strong><small>{tr(s.status === 'paused' ? 'Paused' : 'Cancelled')}</small></span><span className="sub-amount"><b>{shown(show, money(Number(s.amount) || 0, s.currency))}</b></span></button>)}</div></>}
      </>
        : tab === 'calendar' ? <Calendar subs={subs} show={show} onOpen={open} />
          : <Insights summary={summary} show={show} income={monthStats?.income || 0} />}
    {subs.length > 0 && <BrandNotice />}
    {catalog && <CatalogSheet country={c.country} onPick={startNew} onClose={() => setCatalog(false)} />}
    {draft && <SubForm draft={draft} setDraft={setDraft} base={base}
      onSave={(row) => { c.saveSubscription(row); setDraft(null); }}
      onDelete={(id) => { c.deleteSubscription(id); setDraft(null); }}
      onLog={(row) => { setDraft(null); c.logSubscription(row); }}
      onClose={() => setDraft(null)} />}
  </>;
}
