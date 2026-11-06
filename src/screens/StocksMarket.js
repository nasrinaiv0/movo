import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon';
import { SubHeader } from '../components/ui';
import { t as tr } from '../lib/i18n';
import { loadStockHistory, loadStockQuote, searchStocks } from '../lib/stocks';
import { TOP_GLOBAL_STOCKS, TOP_GLOBAL_STOCKS_SNAPSHOT, TOP_GLOBAL_STOCKS_SOURCE } from '../data/topGlobalStocks';
import './StocksMarket.css';

const money = (v, c = 'USD') =>
  Number.isFinite(v)
    ? new Intl.NumberFormat(undefined, { style: 'currency', currency: c, maximumFractionDigits: v < 1 ? 4 : 2 }).format(v)
    : '—';

const logoDomain = symbol => {
  const match = TOP_GLOBAL_STOCKS.find(item => item.symbol === symbol);
  const extra = { GOOGL: 'google.com', SONY: 'sony.com', NVO: 'novonordisk.com', ADBE: 'adobe.com' };
  return match?.domain || extra[String(symbol).split(':')[0]] || '';
};

export function StockLogo({ symbol }) {
  const domain = logoDomain(symbol);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [domain]);
  return domain && !failed ? (
    <img
      className="stock-logo"
      src={'https://www.google.com/s2/favicons?domain=' + domain + '&sz=128'}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  ) : (
    <span className="stock-logo stock-logo-fallback" aria-hidden="true">{String(symbol || '').slice(0, 2)}</span>
  );
}

export function formatStocksLastUpdate(iso, locale) {
  if (!iso || !Number.isFinite(new Date(iso).getTime())) return 'Awaiting market data';
  return new Intl.DateTimeFormat(locale || undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(iso));
}

export default function StocksMarket({ c }) {
  const quote = String(c.base || c.prefs?.currency || 'USD').toUpperCase();
  const saved = Array.isArray(c.prefs?.stockWatchlist) ? c.prefs.stockWatchlist : ['AAPL', 'MSFT', 'NVDA'];
  const savedKey = saved.join('|');
  const [watchQuotes, setWatchQuotes] = useState([]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [range, setRange] = useState(90);
  const [lastUpdated, setLastUpdated] = useState(null);
  const requestId = useRef(0);

  const refresh = useCallback(async (force = false) => {
    const id = ++requestId.current;
    setLoading(true);
    if (!saved.length) {
      setWatchQuotes([]);
      setLoading(false);
      return;
    }
    try {
      // Avoid fetching quotes for all 100 companies and exhausting the provider quota.
      const rows = await Promise.all(saved.slice(0, 20).map(async symbol => {
        try { return await loadStockQuote(symbol, { force }); } catch { return null; }
      }));
      if (id !== requestId.current) return;
      const successes = rows.filter(Boolean);
      setWatchQuotes(successes.map(row => row.quote));
      setError(successes.length ? '' : 'Stock quotes are temporarily unavailable.');
      const newest = successes.filter(row => !row.stale && Number.isFinite(Date.parse(row.fetchedAt)))
        .map(row => row.fetchedAt).sort().at(-1);
      if (newest) setLastUpdated(newest);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [savedKey]);

  useEffect(() => {
    refresh();
    return () => { requestId.current += 1; };
  }, [refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !loading) refresh(true);
    }, 3 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [refresh, loading]);

  useEffect(() => {
    let active = true;
    const q = search.trim();
    if (!q) { setResults([]); setSearching(false); return () => { active = false; }; }
    const timer = window.setTimeout(() => {
      setSearching(true);
      searchStocks(q).then(rows => { if (active) setResults(rows); })
        .catch(() => { if (active) setResults([]); })
        .finally(() => { if (active) setSearching(false); });
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [search]);

  useEffect(() => {
    if (!selected) { setHistory([]); setSelectedQuote(null); return; }
    let active = true;
    setHistory([]);
    loadStockHistory(selected.symbol, range).then(data => {
      if (active) setHistory(data.points);
    }).catch(() => { if (active) setHistory([]); });
    return () => { active = false; };
  }, [selected?.symbol, range]);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    const inWatchlist = watchQuotes.find(row => row.symbol === selected.symbol);
    if (inWatchlist) { setSelectedQuote(inWatchlist); setSelectedLoading(false); return; }
    setSelectedQuote(null);
    setSelectedLoading(true);
    loadStockQuote(selected.symbol).then(data => {
      if (active) setSelectedQuote(data.quote);
    }).catch(() => {
      if (active) setSelectedQuote(null);
    }).finally(() => { if (active) setSelectedLoading(false); });
    return () => { active = false; };
  }, [selected?.symbol, watchQuotes]);

  const toggle = symbol => c.setPref?.('stockWatchlist', saved.includes(symbol)
    ? saved.filter(x => x !== symbol)
    : [...saved, symbol].slice(0, 50));
  const ordered = useMemo(
    () => [...watchQuotes].sort((a, b) => saved.indexOf(a.symbol) - saved.indexOf(b.symbol)),
    [watchQuotes, savedKey]
  );
  const points = history.map(p => p.price);
  const min = points.length ? Math.min(...points) : 0;
  const max = points.length ? Math.max(...points) : 1;
  const span = max - min || 1;
  const path = points.map((v, i) =>
    (i ? 'L' : 'M') + (8 + i / Math.max(1, points.length - 1) * 304).toFixed(1) + ' ' + (92 - (v - min) / span * 78).toFixed(1)
  ).join(' ');
  const displayQuote = selected ? (watchQuotes.find(item => item.symbol === selected.symbol) || selectedQuote) : null;

  return (
    <>
      <SubHeader
        title="Stocks"
        onBack={() => c.go('Menu')}
        right={
          <div className="stock-update-header">
            <div className="stock-update-copy" role="status" aria-live="polite" aria-atomic="true">
              <span>Last Update</span>
              <time dateTime={lastUpdated || undefined}>{formatStocksLastUpdate(lastUpdated)}</time>
            </div>
            <button type="button" className="round-button stock-refresh-button" onClick={() => refresh(true)}
              aria-label={loading ? 'Refreshing stock quotes' : 'Refresh stock quotes'}
              title={loading ? 'Refreshing stock quotes' : 'Refresh stock quotes'}
              disabled={loading}>
              <span className={loading ? 'stock-refresh-icon is-loading' : 'stock-refresh-icon'}>
                <Icon name="refresh" size={18}/>
              </span>
            </button>
          </div>
        }
      />
      {selected ? (
        <section className="stock-detail">
          <button type="button" className="stock-back" onClick={() => setSelected(null)}>‹ Back to watchlist</button>
          <div className="card stock-detail-card">
            <div className="stock-identity"><StockLogo symbol={selected.symbol}/><span>
              <strong>{selected.name || selected.symbol}</strong>
              <small>{selected.symbol}{selected.exchange ? ' · ' + selected.exchange : ''}</small>
            </span></div>
            <strong className="stock-detail-price">
              {selectedLoading ? 'Loading quote…' : money(displayQuote?.price, displayQuote?.currency || quote)}
            </strong>
            {displayQuote && Number.isFinite(displayQuote.changePercent) && (
              <p className={'stock-change ' + (displayQuote.changePercent >= 0 ? 'up' : 'down')}>
                {displayQuote.changePercent.toFixed(2)}% today
              </p>
            )}
            {!selectedLoading && !displayQuote && <p className="stock-muted">A current quote is not available for this listing.</p>}
            <div className="stock-ranges">
              {[[30,'1M'],[90,'3M'],[180,'6M'],[365,'1Y'],[500,'ALL']].map(([n, label]) => (
                <button type="button" key={n} className={range === n ? 'active' : ''} onClick={() => setRange(n)}>
                  {label}
                </button>
              ))}
            </div>
            {history.length > 1 ? (
              <svg className="stock-chart" viewBox="0 0 320 100" role="img" aria-label="Historical stock price chart">
                <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : <p className="stock-muted">Historical prices unavailable.</p>}
          </div>
        </section>
      ) : (
        <>
          <div className="stock-search">
            <Icon name="search" size={17}/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search global stocks by company or ticker" aria-label="Search global stocks"/>
          </div>
          {search.trim() && (
            <section className="stock-results">
              <div className="stock-section-title">{searching ? 'Searching…' : 'Search results'}</div>
              {results.map(item => (
                <div className="stock-row" key={item.id || item.symbol + item.exchange}>
                  <StockLogo symbol={item.symbol}/>
                  <span className="stock-row-main"><strong>{item.name}</strong>
                    <small>{item.symbol} · {item.exchange} · {item.country}</small></span>
                  <button type="button" className="stock-add" onClick={() => toggle(item.id || item.symbol)}
                    aria-label={saved.includes(item.id || item.symbol) ? 'Remove from watchlist' : 'Add to watchlist'}>
                    {saved.includes(item.id || item.symbol) ? '✓' : '+'}
                  </button>
                </div>
              ))}
              {!searching && !results.length && <p className="stock-muted">No matching stocks found.</p>}
            </section>
          )}
          <section className="stock-section">
            <div className="stock-section-title">My Watchlist <span>{saved.length} tracked</span></div>
            {ordered.map(item => (
              <button type="button" className="stock-row stock-watch-row" key={item.symbol} onClick={() => setSelected(item)}>
                <StockLogo symbol={item.symbol}/>
                <span className="stock-row-main"><strong>{item.name || item.symbol}</strong>
                  <small>{item.symbol} · {item.exchange}</small></span>
                <span className="stock-row-price"><strong>{money(item.price, item.currency || quote)}</strong>
                  <small className={item.changePercent >= 0 ? 'up' : 'down'}>
                    {Number.isFinite(item.changePercent) ? (item.changePercent > 0 ? '+' : '') + item.changePercent.toFixed(2) + '%' : '—'}
                  </small>
                </span>
              </button>
            ))}
            {loading && !ordered.length && <p className="stock-muted">Loading watchlist…</p>}
            {!loading && !ordered.length && <p className="stock-muted">Search for a company and add it to your watchlist.</p>}
            {error && <p className="stock-muted">{error}</p>}
          </section>
          <section className="stock-section stock-top-global" aria-label="Top 100 global companies by market capitalization">
            <div className="stock-section-title">Top 100 Global Stocks <span>100 companies</span></div>
            <p className="stock-ranking-note">
              Market-cap ranking snapshot: {new Date(TOP_GLOBAL_STOCKS_SNAPSHOT + 'T12:00:00Z').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'})}
              {' · '}<a href={TOP_GLOBAL_STOCKS_SOURCE} target="_blank" rel="noreferrer noopener">Source</a>
              {' · '}Rankings are not live prices.
            </p>
            <div className="stock-top-global-list">
              {TOP_GLOBAL_STOCKS.map(item => (
                <div className="stock-row stock-global-row" key={item.symbol}>
                  <span className="stock-global-rank">{item.rank}</span>
                  <button className="stock-global-detail" type="button" onClick={() => setSelected(item)}
                    aria-label={'View ' + item.name + ' stock details'}>
                    <StockLogo symbol={item.symbol}/>
                    <span className="stock-row-main"><strong>{item.name}</strong><small>{item.symbol}</small></span>
                  </button>
                  <button type="button" className="stock-add stock-global-add"
                    onClick={() => toggle(item.symbol)}
                    aria-label={saved.includes(item.symbol) ? tr('Remove {name} from watchlist', {name:item.name}) : tr('Add {name} to watchlist', {name:item.name})}>
                    {saved.includes(item.symbol) ? '✓' : '+'}
                  </button>
                </div>
              ))}
            </div>
          </section>
          <p className="stock-disclaimer">
            Market data may be delayed depending on exchange permissions and your provider plan.
            Last Update reflects the latest successful quote retrieval. MOVO does not execute trades.
          </p>
        </>
      )}
    </>
  );
}
