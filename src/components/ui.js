import React from 'react';
import Icon from './Icon';
import { tileFor, smoothPath, BUCKETS, chipTone, chipLabel, shown, money, relativeDay, timeLabel, signed } from '../lib/format';

export function Toggle({ checked, onChange, label }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`toggle${checked ? ' on' : ''}`} onClick={() => onChange(!checked)}><span /></button>;
}

export function IconButton({ icon, label, onClick, dot, size = 20 }) {
  return <button type="button" className="round-button" aria-label={label} onClick={onClick}><Icon name={icon} size={size} />{dot && <i className="red-dot" />}</button>;
}

/** Large-title header used by the five root screens. */
export function RootHeader({ title, subtitle, onSearch, onBell, onSettings, unread, hideSearch, hideBell }) {
  return <header className="screen-header root">
    <div className="title-block"><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
    <div className="header-actions">
      {!hideSearch && <IconButton icon="search" label="Search" onClick={onSearch} />}
      {!hideBell && onBell && <IconButton icon="bell" label="Notifications" onClick={onBell} dot={unread} />}
      {onSettings && <IconButton icon="gear" label="Settings" onClick={onSettings} />}
    </div>
  </header>;
}

/** Back-arrow header used by sub-screens. */
export function SubHeader({ title, onBack, right }) {
  return <header className="screen-header sub">
    <button type="button" className="back-button" aria-label="Back" onClick={onBack}><Icon name="back" size={22} /></button>
    <h1>{title}</h1>
    <div className="header-actions">{right}</div>
  </header>;
}

export function Tile({ name, size = 44, icon, tone, radius }) {
  if (icon) return <span className={`tile tone-${tone || 'blue'}`} style={{ width: size, height: size, borderRadius: radius }}><Icon name={icon} size={Math.round(size * 0.5)} /></span>;
  const { background, initials } = tileFor(name);
  return <span className="tile mono" style={{ width: size, height: size, background, borderRadius: radius, fontSize: Math.round(size * 0.34) }}>{initials}</span>;
}

export function Chips({ items, value, onChange, trailing, label }) {
  return <div className="chip-row" role="group" aria-label={label}>
    {items.map(item => {
      const key = typeof item === 'string' ? item : item.key; const text = typeof item === 'string' ? item : item.label;
      return <button key={key} type="button" className={value === key ? 'selected' : ''} aria-pressed={value === key} onClick={() => onChange(key)}>{text}{item.dot && <i className="red-dot inline" />}</button>;
    })}
    {trailing}
  </div>;
}

export function SectionTitle({ children, action, onAction }) {
  return <div className="section-title"><h2>{children}</h2>{action && <button type="button" className="link-button" onClick={onAction}>{action}{' '}<Icon name="chevron" size={14} /></button>}</div>;
}

export function Sheet({ title, subtitle, onClose, children, label }) {
  return <div className="sheet-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="sheet" role="dialog" aria-modal="true" aria-label={label || title}>
      <span className="sheet-grabber" />
      <button type="button" className="sheet-close" aria-label={`Close ${label || title}`} onClick={onClose}><Icon name="close" size={18} /></button>
      {title && <h2 className="sheet-title">{title}</h2>}
      {subtitle && <p className="sheet-sub">{subtitle}</p>}
      {children}
    </section>
  </div>;
}

export function Sparkline({ values, width = 170, height = 70 }) {
  const d = smoothPath(values, width, height);
  return <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity=".22" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs>
    {d && <><path d={`${d}L${width - 6} ${height}L6 ${height}Z`} fill="url(#spark-fill)" stroke="none" /><path d={d} className="spark-line" /></>}
  </svg>;
}

export function Bars({ values, startLabel, endLabel }) {
  const max = Math.max(...values, 1); const last = values.map((v, i) => (v > 0 ? i : -1)).reduce((a, b) => Math.max(a, b), -1);
  return <div className="bars" aria-hidden="true">
    <div className="bars-plot">{values.map((v, i) => <span key={i} className={i === last ? 'hot' : ''} style={{ height: `${Math.max(8, (v / max) * 100)}%` }} />)}</div>
    <div className="bars-axis"><span>{startLabel}</span><span>{endLabel}</span></div>
  </div>;
}

export function Donut({ data, total, caption, show, size = 132 }) {
  let acc = 0;
  const stops = data.length ? data.map(d => { const from = acc; acc += d.percent; return `${d.color} ${from}% ${acc}%`; }).join(',') : '#d7dbe6 0 100%';
  return <div className="donut" style={{ width: size, height: size, background: `conic-gradient(${stops})` }}>
    <div className="donut-hole"><strong>{show ? money(total, 'PHP', 0) : '₱ ••••'}</strong><span>{caption}</span></div>
  </div>;
}

export function Legend({ data }) {
  return <ul className="legend">{data.map(d => <li key={d.key}><i style={{ background: d.color }} /><span>{d.key}</span><b>{d.percent}%</b></li>)}</ul>;
}

export function TransactionRow({ t, show, refDate, chip, onOpen, accountLabel, timeOnly }) {
  const meta = `${timeOnly ? '' : `${relativeDay(t.date, refDate)}, `}${timeLabel(t.date)} • ${accountLabel || t.method || t.accountName}`;
  const cls = t.type === 'income' ? 'pos' : '';
  return <button type="button" className="tx-row" aria-label={show ? `${t.merchant}, ${signed(t.type, t.amount, t.currency)}` : t.merchant} onClick={() => onOpen?.(t)}>
    <Tile name={t.merchant} icon={t.type === 'transfer' ? 'transfer' : undefined} tone="blue" />
    <span className="tx-main"><strong>{t.merchant}</strong><small>{meta}</small></span>
    <span className="tx-side"><b className={cls}>{shown(show, signed(t.type, t.amount, t.currency))}</b>{chip && <em className={`pill tone-${chipTone(t)}`}>{chipLabel(t)}</em>}</span>
  </button>;
}

export { BUCKETS };
