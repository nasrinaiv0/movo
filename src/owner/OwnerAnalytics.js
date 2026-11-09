import React, { useMemo, useState } from 'react';

/*
 * Owner analytics from the aggregate-only `movo_owner_kpis` function (counts, never amounts or customer rows).
 * Unavailable data is shown as unavailable, never as zero. Charts: one series and one axis each, thin marks,
 * per-mark hover with a tooltip, and a table view; plan colours were checked with the dataviz palette validator
 * (light and dark) and every value also carries a visible label.
 */
const num = v => (Number.isFinite(Number(v)) && v !== null && v !== undefined ? Number(v).toLocaleString('en-US') : '—');
const pct = (part, whole) => (whole > 0 && Number.isFinite(part) ? `${Math.round((part / whole) * 100)}%` : '—');
const shortDay = d => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export function kpisReady(kpis) {
  const d = kpis?.status === 'verified' ? kpis.data : null;
  return !!(d && d.users && d.plans && d.activity && Array.isArray(d.daily));
}

function Tile({ label, value, sub, tone }) {
  return <section className="occ-card occ-stat">
    <div className="occ-stat-top"><span>{label}</span>{tone && <span className={`occ-stat-dot occ-dot-${tone}`} aria-hidden="true" />}</div>
    <div className="occ-stat-number">{value}</div>
    <small>{sub}</small>
  </section>;
}

export function KpiGrid({ kpis }) {
  if (!kpisReady(kpis)) return null;
  const { users, plans, trials = {}, activity } = kpis.data;
  const paid = (Number(plans.pro) || 0) + (Number(plans.proPlus) || 0);
  return <div className="occ-stats" aria-label="Key figures">
    <Tile label="Accounts" value={num(users.total)} tone="green"
      sub={`${num(users.verified)} verified · +${num(users.new7d)} this week`} />
    <Tile label="Active accounts · 30 days" value={num(activity.activeUsers30d)}
      sub={`${num(activity.activeUsers7d)} in 7 days · ${pct(activity.activeUsers30d, users.total)} of accounts`} />
    <Tile label="Pro and Pro+ now" value={num(paid)} tone="gold"
      sub={`Pro ${num(plans.pro)} · Pro+ ${num(plans.proPlus)} · ${pct(paid, users.total)} of accounts`} />
    <Tile label="Free month (trials)" value={num(trials.active)}
      sub={`${num(trials.started)} started · ${pct(trials.converted, trials.ended)} of ended trials subscribed`} />
  </div>;
}

const SERIES = [
  ['transactions', 'Records', 'records created'],
  ['activeUsers', 'Active accounts', 'accounts that recorded something'],
  ['signups', 'Sign-ups', 'new accounts'],
];
const niceMax = max => {
  if (max <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(max));
  const nice = [1, 2, 2.5, 5, 10].map(m => m * step).find(v => v >= max / 4) || step * 10;
  return Math.ceil(max / nice) * nice;
};
function barPath(x, y, w, h, base) {
  const r = Math.min(4, w / 2, h);
  if (h <= 0) return '';
  return `M${x} ${base}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${base}Z`;
}

export function ActivityChart({ daily }) {
  const [series, setSeries] = useState('transactions');
  const [hover, setHover] = useState(-1);
  const [table, setTable] = useState(false);
  const points = useMemo(() => (Array.isArray(daily) ? daily.filter(p => typeof p?.day === 'string') : []), [daily]);
  if (!points.length) return null;
  const [, title, unit] = SERIES.find(s => s[0] === series);
  const values = points.map(p => Math.max(0, Number(p[series]) || 0));
  const total = series === 'activeUsers' ? null : values.reduce((a, b) => a + b, 0);
  const max = niceMax(Math.max(...values, 0));
  const W = 640, H = 210, x0 = 40, x1 = 630, top = 14, base = 172;
  const slot = (x1 - x0) / points.length;
  const bw = Math.min(24, Math.max(2, slot - 4));
  const y = v => base - (v / max) * (base - top);
  const tip = hover >= 0 ? points[hover] : null;
  return <section className="occ-card occ-activity" aria-label="Activity, last 30 days">
    <div className="occ-heading"><div><h3>Activity · last 30 days</h3><p>Daily {unit} (UTC days)</p></div>
      <button type="button" className="occ-small-button" onClick={() => setTable(t => !t)} aria-pressed={table}>{table ? 'Show chart' : 'Show table'}</button></div>
    <div className="occ-segmented" role="group" aria-label="Measure">
      {SERIES.map(([id, label]) => <button type="button" key={id} aria-pressed={series === id} className={series === id ? 'selected' : ''} onClick={() => { setSeries(id); setHover(-1); }}>{label}</button>)}
    </div>
    <div className="occ-trend-summary"><strong>{total === null ? num(Math.max(...values)) : num(total)}</strong>
      <span>{total === null ? 'most in one day' : `${title.toLowerCase()} in 30 days`}</span></div>
    {table
      ? <div className="occ-table-scroll"><table><thead><tr><th>Day</th>{SERIES.map(([id, label]) => <th key={id}>{label}</th>)}</tr></thead>
        <tbody>{[...points].reverse().map(p => <tr key={p.day}><td>{shortDay(p.day)}</td>{SERIES.map(([id]) => <td key={id}>{num(p[id])}</td>)}</tr>)}</tbody></table></div>
      : <div className="occ-chart-wrap" onMouseLeave={() => setHover(-1)}>
        <svg className="occ-trend-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title} per day from ${shortDay(points[0].day)} to ${shortDay(points[points.length - 1].day)}`}>
          {[0, 0.5, 1].map(f => <g key={f}><line className="occ-trend-grid" x1={x0} x2={x1} y1={y(max * f)} y2={y(max * f)} />
            <text className="occ-trend-tick" x={x0 - 8} y={y(max * f) + 4} textAnchor="end">{num(Math.round(max * f))}</text></g>)}
          {values.map((v, i) => {
            const x = x0 + i * slot + (slot - bw) / 2;
            return <g key={points[i].day}>
              {v > 0 && <path className={`occ-bar${hover === i ? ' active' : ''}`} d={barPath(x, y(v), bw, base - y(v), base)} />}
              <rect className="occ-hit" x={x0 + i * slot} y={top} width={slot} height={base - top + 4} tabIndex={0}
                aria-label={`${shortDay(points[i].day)}: ${num(v)} ${unit}`}
                onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(-1)} />
            </g>;
          })}
          {[0, Math.floor(points.length / 2), points.length - 1].map(i => <text key={i} className="occ-trend-tick" x={x0 + i * slot + slot / 2} y={H - 16}
            textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}>{shortDay(points[i].day)}</text>)}
        </svg>
        {tip && <div className="occ-tooltip" role="status" style={(() => { const r = (x0 + hover * slot + slot / 2) / W; return { left: `${r * 100}%`, transform: `translateX(-${Math.round(r * 100)}%)` }; })()}>
          <strong>{shortDay(tip.day)}</strong>
          {SERIES.map(([id, label]) => <span key={id} className={id === series ? 'current' : ''}>{label} <b>{num(tip[id])}</b></span>)}
        </div>}
      </div>}
  </section>;
}

const PLAN_PARTS = [['free', 'Free', 'occ-free'], ['pro', 'Pro · Gold', 'occ-pro'], ['proPlus', 'Pro+ · Platinum', 'occ-plus']];
const SOURCE_LABEL = { store: 'App Store / Google Play', trial: 'Free month', manual: 'Complimentary', referral: 'Referral reward' };

export function PlanMix({ plans, trials }) {
  if (!plans) return null;
  const total = PLAN_PARTS.reduce((sum, [key]) => sum + (Number(plans[key]) || 0), 0);
  const by = plans.bySource || {};
  return <section className="occ-card occ-plan-mix" aria-label="Plan mix">
    <div className="occ-heading"><div><h3>Plan mix</h3><p>Every account's current plan, by the app's own rules</p></div><span className="occ-tag occ-good">Verified</span></div>
    {total > 0 && <div className="occ-segments" aria-hidden="true">
      {PLAN_PARTS.map(([key, , cls]) => (Number(plans[key]) || 0) > 0 && <span key={key} className={cls} style={{ flexGrow: Number(plans[key]) }} />)}
    </div>}
    <ul className="occ-legend">{PLAN_PARTS.map(([key, label, cls]) => <li key={key}><i className={cls} aria-hidden="true" /><span>{label}</span><b>{num(plans[key])}</b><small>{pct(Number(plans[key]) || 0, total)}</small></li>)}</ul>
    <div className="occ-health-rows occ-source-rows">
      <p className="occ-nav-label">How paid access was obtained</p>
      {Object.entries(SOURCE_LABEL).map(([key, label]) => <div className="occ-health-row" key={key}><span>{label}</span><b>{num(by[key])}</b></div>)}
      {trials && <div className="occ-health-row"><span>Trials ended without subscribing</span><b>{num(Math.max(0, (Number(trials.ended) || 0) - (Number(trials.converted) || 0)))}</b></div>}
    </div>
  </section>;
}

const CHANNEL_LABEL = {
  manual: 'Typed in MOVO', csv_import: 'File import', notification: 'Bank & e-wallet alerts', bank: 'Bank alerts',
  ewallet: 'E-wallet alerts', applepay: 'Apple Pay', googlepay: 'Google Pay', apple_pay_export: 'Apple Pay export',
  bank_sync: 'Bank sync', other: 'Other',
};
export function CaptureChannels({ sources, activity }) {
  const rows = Array.isArray(sources) ? sources.filter(s => s && typeof s.source === 'string') : [];
  const total = rows.reduce((sum, s) => sum + (Number(s.count) || 0), 0);
  const max = Math.max(1, ...rows.map(s => Number(s.count) || 0));
  return <section className="occ-card occ-channels" aria-label="How records are captured">
    <div className="occ-heading"><div><h3>How records are captured</h3><p>Records created in the last 30 days, by channel</p></div></div>
    {rows.length ? <div className="occ-bar-list">{rows.slice(0, 8).map(s => <div className="occ-bar-item" key={s.source}>
      <div className="occ-bar-label"><span>{CHANNEL_LABEL[s.source] || s.source}</span><strong>{num(s.count)} <small>{pct(Number(s.count) || 0, total)}</small></strong></div>
      <div className="occ-track"><span style={{ width: `${((Number(s.count) || 0) / max) * 100}%` }} /></div>
    </div>)}</div> : <div className="occ-empty"><strong>No records in the last 30 days</strong><p>Channels appear once people record transactions.</p></div>}
    {activity && <div className="occ-health-rows">
      <div className="occ-health-row"><span>Records per active account (30 days)</span><b>{activity.activeUsers30d > 0 ? (activity.transactions30d / activity.activeUsers30d).toFixed(1) : '—'}</b></div>
      <div className="occ-health-row"><span>Accounts with a wallet account in the cloud</span><b>{num(activity.usersWithAccounts)}</b></div>
    </div>}
  </section>;
}
