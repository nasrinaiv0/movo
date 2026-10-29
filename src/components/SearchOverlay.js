import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import { Tile } from './ui';
import { relativeDay, shown, signed } from '../lib/format';
import { t as tr } from '../lib/i18n';

const LIMIT = 40;
/* Amounts are only searchable while balances are visible, so a hidden balance can't be probed by typing numbers. */
const haystack = (t, show) => [t.merchant, t.category, t.accountName, t.type, t.note, show ? String(t.amount) : ''].filter(Boolean).join(' ').toLowerCase();

/** Wraps each matched term in <mark> so people see why a row matched. */
function Highlight({ text = '', terms }) {
  if (!terms.length) return text;
  const lower = text.toLowerCase(); const marks = new Array(text.length).fill(false);
  terms.forEach((term) => { let at = lower.indexOf(term); while (at !== -1) { marks.fill(true, at, at + term.length); at = lower.indexOf(term, at + term.length); } });
  const out = []; let start = 0;
  for (let i = 1; i <= text.length; i += 1) {
    if (i === text.length || marks[i] !== marks[start]) {
      const part = text.slice(start, i);
      out.push(marks[start] ? <mark key={start}>{part}</mark> : part);
      start = i;
    }
  }
  return out;
}

/** Search bar that grows out of the header's search icon; results update on every keystroke. */
export default function SearchOverlay({ txs, show, refDate, onOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [closing, setClosing] = useState(false);
  const inputRef = useRef(null);
  const terms = useMemo(() => query.trim().toLowerCase().split(/\s+/).filter(Boolean), [query]);
  const results = useMemo(() => {
    if (!terms.length) return txs.slice(0, 6);
    return txs.filter((t) => { const h = haystack(t, show); return terms.every((term) => h.includes(term)); });
  }, [txs, terms, show]);

  const close = (after) => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => { onClose(); after?.(); }, 180);
  };
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return <div className={`search-overlay${closing ? ' closing' : ''}`} role="dialog" aria-modal="true" aria-label="Search transactions">
    <button type="button" className="search-scrim" aria-label="Close search" tabIndex={-1} onClick={() => close()} />
    <div className="search-panel">
      <div className="search-top">
        <label className="search-bar">
          <Icon name="search" size={18} />
          <input ref={inputRef} type="search" enterKeyHint="search" autoComplete="off" spellCheck="false" aria-label="Filter transactions" placeholder={tr('Search transactions')} value={query} onChange={(e) => setQuery(e.target.value)} />
          {query && <button type="button" className="search-clear" aria-label="Clear search" onClick={() => { setQuery(''); inputRef.current?.focus(); }}><Icon name="close" size={14} strokeWidth={2.2} /></button>}
        </label>
        <button type="button" className="search-cancel" onClick={() => close()}>{tr('Cancel')}</button>
      </div>
      <div className="search-results" aria-live="polite">
        <p className="search-caption">{terms.length ? (results.length === 1 ? tr('1 result') : tr('{n} results', { n: results.length })) : tr('Recent')}</p>
        {terms.length > 0 && !results.length && <div className="search-empty"><Icon name="search" size={22} /><p>No transactions match “{query.trim()}”</p></div>}
        {results.slice(0, LIMIT).map((t, i) => <button type="button" key={t.id} className="search-row" style={{ '--i': Math.min(i, 8) }} onClick={() => close(() => onOpen(t))}>
          <Tile name={t.merchant} icon={t.type === 'transfer' ? 'transfer' : undefined} size={38} />
          <span className="search-main"><strong><Highlight text={t.merchant} terms={terms} /></strong><small><Highlight text={`${t.category || 'Other'} · ${t.accountName || t.method || ''}`} terms={terms} /> · {relativeDay(t.date, refDate)}</small></span>
          <b className={t.type === 'income' ? 'pos' : ''}>{shown(show, signed(t.type, t.amount, t.currency))}</b>
        </button>)}
        {results.length > LIMIT && <p className="search-caption">Keep typing to narrow {results.length - LIMIT} more</p>}
      </div>
    </div>
  </div>;
}
