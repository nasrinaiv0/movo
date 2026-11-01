import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { tileFor, smoothPath, BUCKETS, chipTone, chipLabel, shown, money, relativeDay, timeLabel, signed, HIDDEN } from '../lib/format';
import { canAnimate, useCountUp } from '../lib/motion';
import { t as tr } from '../lib/i18n';
import { percentLabel } from '../lib/trend';
import { isFresh } from '../lib/freshRecords';
import BrandLogo from './BrandLogo';
import { merchantLogoUrl } from '../lib/merchantFavicons';

/** Animated currency amount: counts up when it appears and eases between values. */
export function Money({ value, show, digits = 2, currency }) {
  const v = useCountUp(Number(value) || 0);
  return <span key={show ? 'on' : 'off'} className="money">{show ? money(v, currency, digits) : HIDDEN}</span>;
}

export function Toggle({ checked, onChange, label, disabled = false, reason, describedBy }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} aria-describedby={describedBy || undefined} aria-disabled={disabled || undefined} disabled={disabled} title={disabled ? reason : undefined} className={`toggle${checked ? ' on' : ''}${disabled ? ' disabled' : ''}`} onClick={() => { if (disabled) return; onChange(!checked); }}><span /></button>;
}

export function IconButton({ icon, label, onClick, dot, size = 20 }) {
  return <button type="button" className="round-button" aria-label={label} onClick={onClick}><Icon name={icon} size={size} />{dot && <i className="red-dot" />}</button>;
}

/** Large-title header used by the five root screens. */
export function RootHeader({ title, subtitle, onSearch, onBell, onSettings, unread, hideSearch, hideBell, action }) {
  return <header className="screen-header root">
    <div className="title-block"><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
    <div className="header-actions">
      {action ? <IconButton icon={action.icon} label={action.label} onClick={action.onClick} /> : !hideSearch && <IconButton icon="search" label={tr('Search')} onClick={onSearch} />}
      {!hideBell && onBell && <IconButton icon="bell" label={tr('Notifications')} onClick={onBell} dot={unread} />}
      {onSettings && <IconButton icon="gear" label={tr('Settings')} onClick={onSettings} />}
    </div>
  </header>;
}

/** Back-arrow header used by sub-screens. */
export function SubHeader({ title, onBack, right }) {
  return <header className="screen-header sub">
    <button type="button" className="back-button" aria-label={tr('Back')} onClick={onBack}><Icon name="back" size={22} /></button>
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
  const row = useRef(null);
  const [ind, setInd] = useState(null);
  const [ready, setReady] = useState(false);
  // The highlight copies the selected chip's box exactly (position and size), and follows it when the row resizes.
  useLayoutEffect(() => {
    const rowEl = row.current;
    const measure = () => {
      const el = rowEl?.querySelector('button[data-chip][aria-pressed="true"]');
      if (el) setInd({ left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight });
    };
    measure();
    if (!rowEl || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure); ro.observe(rowEl);
    return () => ro.disconnect();
  }, [value, items.length]);
  useEffect(() => { const t = setTimeout(() => setReady(true), 60); return () => clearTimeout(t); }, []);
  return <div className="chip-row" role="group" aria-label={label} ref={row}>
    {ind && <span className={`chip-ind${ready ? ' ready' : ''}`} aria-hidden="true" style={{ transform: `translateX(${ind.left}px)`, top: ind.top, width: ind.width, height: ind.height }} />}
    {items.map(item => {
      const key = typeof item === 'string' ? item : item.key; const text = typeof item === 'string' ? item : item.label;
      return <button key={key} data-chip type="button" className={value === key ? 'selected' : ''} aria-pressed={value === key} onClick={() => onChange(key)}>{text}{item.dot && <i className="red-dot inline" />}</button>;
    })}
    {trailing}
  </div>;
}

export function SectionTitle({ children, action, onAction }) {
  return <div className="section-title"><h2>{children}</h2>{action && <button type="button" className="link-button" onClick={onAction}>{action}{' '}<Icon name="chevron" size={14} /></button>}</div>;
}

export function Sheet({ title, subtitle, onClose, children, label, className = '', hideClose = false, center = false }) {
  const [closing, setClosing] = useState(false);
  const [dy, setDy] = useState(0);
  const drag = useRef(null);
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(typeof document === 'undefined' ? null : document.activeElement);
  const close = () => {
    if (closing) return;
    if (!canAnimate()) { onClose(); return; }
    setClosing(true); setTimeout(onClose, 230);
  };
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey);
  }); // eslint-disable-line
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const getFocusable = () => Array.from(dialog.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(element => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true');
    if (!dialog.contains(document.activeElement)) {
      const first = getFocusable()[0];
      if (first) first.focus();
      else dialog.focus();
    }
    const handleTab = event => {
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', handleTab);
    return () => {
      document.removeEventListener('keydown', handleTab);
      const previous = previousFocusRef.current;
      if (previous && previous !== document.body && previous.isConnected && typeof previous.focus === 'function') previous.focus();
    };
  }, []);
  const down = (e) => { drag.current = { y: e.clientY }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* not supported */ } };
  const move = (e) => { if (drag.current) setDy(Math.max(0, e.clientY - drag.current.y)); };
  const up = () => { if (!drag.current) return; const far = dy > 110; drag.current = null; if (far) close(); else setDy(0); };
  return <div className={`sheet-backdrop${center ? ' center' : ''}${closing ? ' closing' : ''}`} onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
    <section ref={dialogRef} className={`sheet${center ? ' sheet-center' : ''}${className ? ` ${className}` : ''}${closing ? ' closing' : ''}${drag.current ? ' dragging' : ''}`} role="dialog" aria-modal="true" aria-label={label || title} tabIndex={-1} style={dy ? { transform: `translateY(${dy}px)` } : undefined}>
      {!center && <div className="sheet-handle" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}><span className="sheet-grabber" /></div>}
      {!hideClose && <button type="button" className="sheet-close" aria-label={tr('Close {name}', { name: label || title })} onClick={close}><Icon name="close" size={18} /></button>}
      {title && <h2 className="sheet-title">{title}</h2>}
      {subtitle && <p className="sheet-sub">{subtitle}</p>}
      {typeof children === 'function' ? children(close) : children}
    </section>
  </div>;
}

export function Sparkline({ values, width = 170, height = 70 }) {
  // Edge to edge: the line and its fill run to the card's right and bottom edges, leaving no gap.
  const d = smoothPath(values, width, height, 0, 10);
  return <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
    {d && <><path d={`${d}L${width} ${height}L0 ${height}Z`} fill="var(--accent)" fillOpacity=".08" stroke="none" /><path d={d} className="spark-line" /></>}
  </svg>;
}

/** Month-over-month indicator: arrow shows the direction, colour shows whether that is good (see lib/trend). */
export function Trend({ value, chip = false, size = 12 }) {
  if (!value) return null;
  const pct = percentLabel(value.percent);
  const spoken = value.direction === 'flat' ? tr('No change vs last month') : tr(value.direction === 'up' ? 'Up {n} vs last month' : 'Down {n} vs last month', { n: pct });
  return <span className={chip ? `chip-${value.tone}` : `delta ${value.tone}`}>
    <span aria-hidden="true" className="trend-vis"><Icon name={value.direction === 'up' ? 'arrowUp' : value.direction === 'down' ? 'arrowDown' : 'minus'} size={size} strokeWidth={2.4} />{pct}{chip ? ` ${tr('vs last month')}` : ''}</span>
    <span className="sr-only">{spoken}</span>
  </span>;
}

/** Balance history as slim bars, edge to edge like the sparkline; long histories are averaged down to 24 bars. */
export function MiniBars({ values, width = 170, height = 70 }) {
  const n = Math.min(24, values.length);
  if (!n) return null;
  const per = values.length / n;
  const pts = Array.from({ length: n }, (_, i) => { const part = values.slice(Math.floor(i * per), Math.max(Math.floor(i * per) + 1, Math.floor((i + 1) * per))); return part.reduce((a, v) => a + v, 0) / part.length; });
  const min = Math.min(...pts); const span = Math.max(...pts) - min || 1;
  const slot = width / n; const bar = Math.max(2, slot * 0.58);
  return <svg className="sparkline mini-bars" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
    {pts.map((v, i) => { const h = height * (0.14 + 0.78 * ((v - min) / span)); return <rect key={i} x={i * slot + (slot - bar) / 2} y={height - h} width={bar} height={h} rx={Math.min(3, bar / 2)} style={{ '--i': i }} />; })}
  </svg>;
}

export function Bars({ values, startLabel, endLabel }) {
  const max = Math.max(...values, 1); const last = values.map((v, i) => (v > 0 ? i : -1)).reduce((a, b) => Math.max(a, b), -1);
  return <div className="bars" aria-hidden="true">
    <div className="bars-plot">{values.map((v, i) => <span key={i} className={i === last ? 'hot' : ''} style={{ height: `${Math.max(8, (v / max) * 100)}%`, '--i': i }} />)}</div>
    <div className="bars-axis"><span>{startLabel}</span><span>{endLabel}</span></div>
  </div>;
}

export function Donut({ data, total, caption, show, size = 132 }) {
  let acc = 0;
  const stops = data.length ? data.map(d => { const from = acc; acc += d.percent; return `${d.color} ${from}% ${acc}%`; }).join(',') : '#d7dbe6 0 100%';
  return <div className="donut" style={{ width: size, height: size }}>
    <i className="donut-ring" style={{ background: `conic-gradient(${stops})` }} />
    <div className="donut-hole"><strong><Money value={total} show={show} digits={0} /></strong><span>{caption}</span></div>
  </div>;
}

export function Legend({ data }) {
  return <ul className="legend">{data.map((d, i) => <li key={d.key} style={{ '--i': i }}><i style={{ background: d.color }} /><span>{tr(d.key)}</span><b>{d.percent}%</b></li>)}</ul>;
}

export function TransactionRow({ t, show, refDate, chip, onOpen, accountLabel, timeOnly }) {
  const meta = `${timeOnly ? '' : `${relativeDay(t.date, refDate)}, `}${timeLabel(t.date)} • ${accountLabel || t.method || t.accountName}`;
  const cls = t.type === 'income' ? 'pos' : '';
  return <button type="button" className={`tx-row${isFresh(t.id) ? ' tx-fresh' : ''}`} aria-label={show ? `${t.merchant}, ${signed(t.type, t.amount, t.currency)}` : t.merchant} onClick={() => onOpen?.(t)}>
    {t.type === 'transfer' ? <Tile name={t.merchant} icon="transfer" tone="blue" /> : <BrandLogo src={merchantLogoUrl(t.merchant)} className="tile tile-logo" size={44} fallback={<Tile name={t.merchant} />} />}
    <span className="tx-main"><strong>{t.merchant}</strong><small>{meta}</small></span>
    <span className="tx-side"><b className={cls}>{shown(show, signed(t.type, t.amount, t.currency))}</b>{chip && <em className={`pill tone-${chipTone(t)}`}>{tr(chipLabel(t))}</em>}</span>
  </button>;
}

export { BUCKETS };
