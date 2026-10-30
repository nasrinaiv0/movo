import React, { useMemo, useState } from 'react';
import { Money } from './ui';
import { dayKey, getFormatLocale, smoothPath } from '../lib/format';
import { t as tr } from '../lib/i18n';

const RANGES = [['day', 'Days'], ['week', 'Weeks'], ['month', 'Months'], ['year', 'Years'], ['custom', 'Custom']];
const DAY = 86400000;
const startOfWeek = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const fmt = (d, opts) => new Date(d).toLocaleDateString(getFormatLocale(), opts);

/** Builds income/expense buckets for the chosen granularity, ending at `ref`. */
export function buildFlow(txs, range, ref = new Date(), custom = {}) {
  const end = new Date(ref);
  let buckets = [];
  if (range === 'day') {
    for (let i = 13; i >= 0; i -= 1) { const d = new Date(end.getTime() - i * DAY); buckets.push({ key: dayKey(d), label: fmt(d, { day: 'numeric' }), title: fmt(d, { weekday: 'short', month: 'short', day: 'numeric' }) }); }
  } else if (range === 'week') {
    const w = startOfWeek(end);
    for (let i = 7; i >= 0; i -= 1) { const d = new Date(w.getTime() - i * 7 * DAY); buckets.push({ key: dayKey(d), label: fmt(d, { month: 'numeric', day: 'numeric' }), title: tr('Week of {date}', { date: fmt(d, { month: 'short', day: 'numeric' }) }) }); }
  } else if (range === 'month') {
    for (let i = 11; i >= 0; i -= 1) { const d = new Date(end.getFullYear(), end.getMonth() - i, 15); buckets.push({ key: dayKey(d).slice(0, 7), label: fmt(d, { month: 'narrow' }), title: fmt(d, { month: 'long', year: 'numeric' }) }); }
  } else if (range === 'year') {
    const years = txs.map(t => new Date(t.date).getFullYear()); const first = Math.min(end.getFullYear() - 3, ...years);
    for (let y = first; y <= end.getFullYear(); y += 1) buckets.push({ key: String(y), label: String(y).slice(2), title: String(y) });
  } else {
    const from = custom.from ? new Date(`${custom.from}T00:00:00`) : new Date(end.getTime() - 29 * DAY);
    const to = custom.to ? new Date(`${custom.to}T00:00:00`) : end;
    const days = Math.max(1, Math.round((to - from) / DAY) + 1);
    if (days <= 31) for (let i = 0; i < days; i += 1) { const d = new Date(from.getTime() + i * DAY); buckets.push({ key: dayKey(d), label: fmt(d, { day: 'numeric' }), title: fmt(d, { month: 'short', day: 'numeric' }) }); }
    else { const seen = new Set(); for (let t = from.getTime(); t <= to.getTime(); t += DAY) { const k = dayKey(new Date(t)).slice(0, 7); if (!seen.has(k)) { seen.add(k); const d = new Date(t); buckets.push({ key: k, label: fmt(d, { month: 'short' }), title: fmt(d, { month: 'long', year: 'numeric' }) }); } } }
  }
  const keyOf = (date) => {
    if (range === 'month' || (range === 'custom' && buckets[0]?.key.length === 7)) return dayKey(date).slice(0, 7);
    if (range === 'year') return String(new Date(date).getFullYear());
    if (range === 'week') return dayKey(startOfWeek(date));
    return dayKey(date);
  };
  const index = new Map(buckets.map((b, i) => [b.key, i]));
  buckets = buckets.map(b => ({ ...b, income: 0, expense: 0 }));
  txs.forEach(t => { const i = index.get(keyOf(t.date)); if (i === undefined || t.type === 'transfer') return; buckets[i][t.type === 'income' ? 'income' : 'expense'] += t.amount; });
  return buckets;
}

/** Money in and out over time, drawn as paired bars, two lines, or one net bar per period (`variant`). */
export default function MoneyFlow({ txs, refDate, show, variant = 'bars' }) {
  const [range, setRange] = useState('day');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [pick, setPick] = useState(-1);
  const data = useMemo(() => buildFlow(txs, range, refDate, custom), [txs, range, refDate, custom]);
  const max = Math.max(1, ...data.map(b => Math.max(b.income, b.expense)));
  const netMax = Math.max(1, ...data.map(b => Math.abs(b.income - b.expense)));
  /* Both lines share one scale (0..max) so their heights can be compared directly. */
  const line = (key) => smoothPath(data.map(b => b[key]), 100, 100, 100 / (data.length * 2), 4, [0, max]);
  const sel = pick >= 0 && data[pick] ? data[pick] : null;
  const totals = sel || data.reduce((s, b) => ({ income: s.income + b.income, expense: s.expense + b.expense }), { income: 0, expense: 0 });
  const net = totals.income - totals.expense;
  return <section className="card flow-card" aria-label={tr('Money flow')}>
    <div className="flow-head">
      <div><h2>{tr('Money Flow')}</h2><small>{sel ? sel.title : `${data[0]?.title || ''} – ${data[data.length - 1]?.title || ''}`}</small></div>
      <span className={`flow-net ${net >= 0 ? 'up' : 'down'}`}>{net >= 0 ? '+' : '−'}<Money value={Math.abs(net)} show={show} digits={0} /></span>
    </div>
    <div className="flow-ranges" role="group" aria-label={tr('Money flow range')}>{RANGES.map(([k, l]) => <button type="button" key={k} aria-pressed={range === k} onClick={() => { setRange(k); setPick(-1); }}>{tr(l)}</button>)}</div>
    {range === 'custom' && <div className="flow-custom"><label>{tr('From')}<input type="date" value={custom.from} max={custom.to || undefined} onChange={e => { setCustom({ ...custom, from: e.target.value }); setPick(-1); }} /></label><label>{tr('To')}<input type="date" value={custom.to} min={custom.from || undefined} onChange={e => { setCustom({ ...custom, to: e.target.value }); setPick(-1); }} /></label></div>}
    <div className="flow-legend"><span><i className="in" />{tr('In')} <b><Money value={totals.income} show={show} digits={0} /></b></span><span><i className="out" />{tr('Out')} <b><Money value={totals.expense} show={show} digits={0} /></b></span></div>
    <div className={`flow-plot is-${variant}`} role="list">
      {variant === 'lines' && data.length > 1 && <svg className="flow-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d={line('income')} className="in-line" /><path d={line('expense')} className="out-line" /></svg>}
      {data.map((b, i) => <button type="button" role="listitem" key={b.key} className={`flow-col${pick === i ? ' on' : ''}`} style={{ '--i': i }} onClick={() => setPick(pick === i ? -1 : i)} aria-label={tr('{period}: in {income}, out {expense}', { period: b.title, income: Math.round(b.income), expense: Math.round(b.expense) })}>
        {variant === 'bars' && <span className="flow-bars"><i className="in" style={{ height: `${(b.income / max) * 100}%` }} /><i className="out" style={{ height: `${(b.expense / max) * 100}%` }} /></span>}
        {variant === 'lines' && <span className="flow-bars" />}
        {variant === 'net' && <span className="flow-net-col"><i className={b.income - b.expense >= 0 ? 'in up' : 'out down'} style={{ height: `${(Math.abs(b.income - b.expense) / netMax) * 50}%` }} /></span>}
        {(data.length <= 14 || i % Math.ceil(data.length / 12) === 0) && <small>{b.label}</small>}
      </button>)}
    </div>
  </section>;
}
