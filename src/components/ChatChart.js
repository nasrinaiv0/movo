import React from 'react';
import { t as tr } from '../lib/i18n';

/*
 * A chart inside a NasrinAI chat reply, drawn from on-device records (lib/chatCharts). Plain SVG and CSS, so it works
 * offline. Each chart also lists its values as text for screen readers and for anyone who prefers numbers.
 */
const INCOME = '#34c759';
const SPEND = '#ff6b7b';

function Donut({ rows, total, fmt }) {
  const r = 42; const c = 2 * Math.PI * r;
  let offset = 0;
  return <div className="cc-donut">
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r={r} className="cc-track" />
      {rows.map(row => {
        const length = total ? (row.value / total) * c : 0;
        const seg = <circle key={row.label} cx="60" cy="60" r={r} stroke={row.color} strokeDasharray={`${Math.max(0, length - 1.5)} ${c}`}
          strokeDashoffset={-offset} transform="rotate(-90 60 60)" className="cc-seg" />;
        offset += length;
        return seg;
      })}
    </svg>
    <span className="cc-donut-center"><small>{tr('Total')}</small><b>{fmt(total)}</b></span>
  </div>;
}

function Bars({ rows, fmt, compact }) {
  const max = Math.max(...rows.map(r => r.value), 0) || 1;
  return <div className={`cc-bars${compact ? ' is-dense' : ''}`} aria-hidden="true">
    {rows.map((row, i) => <span className="cc-bar-col" key={row.key || i}>
      <span className="cc-bar-track"><i style={{ height: `${Math.max(row.value ? 4 : 0, (row.value / max) * 100)}%` }} title={fmt(row.value)} /></span>
      <small>{compact && i % 5 !== 0 && i !== rows.length - 1 ? '' : row.label}</small>
    </span>)}
  </div>;
}

function FlowBars({ rows }) {
  const max = Math.max(...rows.flatMap(r => [r.income, r.expenses]), 0) || 1;
  return <div className="cc-bars cc-flow" aria-hidden="true">
    {rows.map(row => <span className="cc-bar-col" key={row.key}>
      <span className="cc-bar-track">
        <i className="is-income" style={{ height: `${Math.max(row.income ? 4 : 0, (row.income / max) * 100)}%`, background: INCOME }} />
        <i className="is-spend" style={{ height: `${Math.max(row.expenses ? 4 : 0, (row.expenses / max) * 100)}%`, background: SPEND }} />
      </span>
      <small>{row.label}</small>
    </span>)}
  </div>;
}

const TITLES = { categories: 'Spending by category', trend: 'Spending over time', flow: 'Income vs expenses', budgets: 'Monthly limits' };

export default function ChatChart({ chart, fmt = (n) => String(n) }) {
  if (!chart) return null;
  const title = tr(TITLES[chart.kind] || 'Chart');
  return <figure className={`cc cc-${chart.kind}`} aria-label={`${title} · ${tr(chart.period)}`}>
    <figcaption className="cc-head"><strong>{title}</strong><small>{tr(chart.period)}</small></figcaption>
    {chart.empty ? <p className="cc-empty">{tr('Nothing recorded for this period yet.')}</p> : <>
      {chart.kind === 'categories' && <div className="cc-cat">
        <Donut rows={chart.rows} total={chart.total} fmt={fmt} />
        <ul className="cc-legend">{chart.rows.map(row => <li key={row.label}>
          <i style={{ background: row.color }} aria-hidden="true" /><span>{tr(row.label)}</span><b>{row.percent}%</b><small>{fmt(row.value)}</small>
        </li>)}</ul>
      </div>}
      {chart.kind === 'trend' && <>
        <Bars rows={chart.rows} fmt={fmt} compact={chart.rows.length > 12} />
        <dl className="cc-stats">
          <div><dt>{tr('Total')}</dt><dd>{fmt(chart.total)}</dd></div>
          <div><dt>{tr('Average')}</dt><dd>{fmt(chart.average)}</dd></div>
          {chart.peak && <div><dt>{tr('Highest')}</dt><dd>{fmt(chart.peak.value)}</dd></div>}
        </dl>
      </>}
      {chart.kind === 'flow' && <>
        <FlowBars rows={chart.rows} />
        <ul className="cc-key" aria-hidden="true"><li><i style={{ background: INCOME }} />{tr('Income')}</li><li><i style={{ background: SPEND }} />{tr('Expenses')}</li></ul>
        <dl className="cc-stats">
          <div><dt>{tr('Income')}</dt><dd>{fmt(chart.income)}</dd></div>
          <div><dt>{tr('Expenses')}</dt><dd>{fmt(chart.expenses)}</dd></div>
          <div><dt>{tr('Net')}</dt><dd className={chart.net < 0 ? 'is-negative' : 'is-positive'}>{fmt(chart.net)}</dd></div>
        </dl>
      </>}
      {chart.kind === 'budgets' && <ul className="cc-limits">{chart.rows.map(row => <li key={row.label}>
        <span className="cc-limit-name"><span>{tr(row.label)}</span><b className={row.percent > 100 ? 'is-negative' : ''}>{row.percent}%</b></span>
        <span className="cc-limit-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, row.percent)}%`, background: row.percent > 100 ? SPEND : row.color }} /></span>
        <small>{tr('{spent} of {limit}', { spent: fmt(row.value), limit: fmt(row.limit) })}</small>
      </li>)}</ul>}
      {chart.kind !== 'categories' && chart.kind !== 'budgets' && <table className="cc-sr">
        <caption>{title}</caption>
        <tbody>{chart.rows.map(row => <tr key={row.key}><th scope="row">{row.label}</th>
          {chart.kind === 'flow' ? <><td>{tr('Income')} {fmt(row.income)}</td><td>{tr('Expenses')} {fmt(row.expenses)}</td></> : <td>{fmt(row.value)}</td>}
        </tr>)}</tbody>
      </table>}
    </>}
    <p className="cc-foot">{tr('From the records on this device')}</p>
  </figure>;
}
