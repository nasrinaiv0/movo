import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon';
import { SubHeader } from '../components/ui';
import { loadCryptoHistory, loadCryptoMarkets, sortCryptoCoins } from '../lib/crypto';

function money(value, quote) {
  if (!Number.isFinite(value)) return '—';
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: quote, notation: value >= 1000000 ? 'compact' : 'standard', maximumFractionDigits: value < 1 ? 8 : 2 }).format(value); }
  catch { return `${quote} ${value.toLocaleString()}`; }
}
function compact(value) {
  return Number.isFinite(value) ? new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 2 }).format(value) : '—';
}
function stamp(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Unknown';
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
function changeText(value) {
  return Number.isFinite(value) ? `${value > 0 ? '+' : ''}${value.toFixed(2)}%` : '—';
}

export default function CryptoMarket({ c }) {
  const quote = String(c.base || c.prefs?.currency || 'PHP').toUpperCase();
  const watchlist = Array.isArray(c.prefs?.cryptoWatchlist) ? c.prefs.cryptoWatchlist : ['btc-bitcoin', 'eth-ethereum', 'sol-solana'];
  const [coins, setCoins] = useState([]);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [range, setRange] = useState(7);
  const [sort, setSort] = useState('rank');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');

  const refresh = async (force = false) => {
    if (force) setRefreshing(true);
    try {
      const result = await loadCryptoMarkets(quote, { force });
      setCoins(result.coins);
      setUpdatedAt(result.coins.reduce((latest, coin) => !latest || coin.updatedAt > latest ? coin.updatedAt : latest, ''));
      setError(result.stale ? 'Showing cached market data. The provider could not be refreshed.' : '');
    } catch (e) {
      setError(e.message === 'crypto_provider_not_configured'
        ? 'Crypto markets are not configured yet. Add the licensed CoinPaprika API key as the server-only COINPAPRIKA_API_KEY environment variable.'
        : e.message === 'crypto_provider_rate_limited' ? 'Market data is temporarily rate-limited. Try again later.'
          : 'Crypto market data is temporarily unavailable. Your watchlist is unchanged.');
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    loadCryptoMarkets(quote, { signal: controller.signal }).then((result) => {
      if (!active) return;
      setCoins(result.coins);
      setUpdatedAt(result.coins.reduce((latest, coin) => !latest || coin.updatedAt > latest ? coin.updatedAt : latest, ''));
      setError(result.stale ? 'Showing cached market data. The provider could not be refreshed.' : '');
    }).catch((e) => {
      if (active) setError(e.message === 'crypto_provider_not_configured'
        ? 'Crypto markets are not configured yet. Add the licensed CoinPaprika API key as the server-only COINPAPRIKA_API_KEY environment variable.'
        : 'Crypto market data is temporarily unavailable. Your watchlist is unchanged.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [quote]);

  useEffect(() => {
    if (!selected) { setHistory([]); return undefined; }
    let active = true;
    const controller = new AbortController();
    setHistoryLoading(true);
    loadCryptoHistory(selected.id, quote, range, { signal: controller.signal })
      .then((result) => { if (active) setHistory(result.points); })
      .catch(() => { if (active) setHistory([]); })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [selected?.id, quote, range]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = coins.filter((coin) => !q || coin.name.toLowerCase().includes(q) || coin.symbol.toLowerCase().includes(q));
    return sortCryptoCoins(filtered, sort);
  }, [coins, search, sort]);
  const favoriteCoins = coins.filter((coin) => watchlist.includes(coin.id));
  const toggleWatch = (id) => c.setPref?.('cryptoWatchlist', watchlist.includes(id) ? watchlist.filter((x) => x !== id) : [...watchlist, id].slice(0, 100));

  const values = history.map((p) => p.price);
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const path = values.map((value, i) => `${i ? 'L' : 'M'}${(8 + i / Math.max(1, values.length - 1) * 304).toFixed(1)} ${(92 - (value - min) / span * 78).toFixed(1)}`).join(' ');

  return <>
    <SubHeader title={trTitle()} onBack={() => c.go('Menu')} right={<button type="button" className="round-button" onClick={() => refresh(true)} disabled={refreshing} aria-label="Refresh crypto markets"><Icon name="refresh" size={18} /></button>} />
    {selected ? <section className="crypto-detail">
      <button type="button" className="crypto-back" onClick={() => setSelected(null)}><Icon name="chevron" size={15} /> Back to market</button>
      <div className="card crypto-detail-hero">
        <div className="crypto-coin-identity"><span className="crypto-symbol">{selected.symbol.slice(0, 4)}</span><span><strong>{selected.name}</strong><small>{selected.symbol} · Rank #{selected.rank || '—'}</small></span></div>
        <strong className="crypto-detail-price">{money(selected.price, quote)}</strong>
        <span className={`crypto-change ${selected.change24h >= 0 ? 'up' : 'down'}`}>{changeText(selected.change24h)} <small>24h</small></span>
        <div className="crypto-stats">
          <span><small>Market cap</small><strong>{money(selected.marketCap, quote)}</strong></span>
          <span><small>24h volume</small><strong>{money(selected.volume24h, quote)}</strong></span>
          <span><small>Circulating supply</small><strong>{compact(selected.circulatingSupply)} {selected.symbol}</strong></span>
          <span><small>Market rank</small><strong>#{selected.rank || '—'}</strong></span>
        </div>
        <button type="button" className="crypto-watch-button" onClick={() => toggleWatch(selected.id)}><Icon name={watchlist.includes(selected.id) ? 'star-filled' : 'star'} size={16} />{watchlist.includes(selected.id) ? 'Remove from watchlist' : 'Add to watchlist'}</button>
      </div>
      <section className="card crypto-chart-card">
        <div className="crypto-section-heading"><div><small>PRICE HISTORY</small><h2>{selected.symbol} / {quote}</h2></div><strong>{money(values[values.length - 1] ?? selected.price, quote)}</strong></div>
        <div className="crypto-ranges">{[1, 7, 30, 90, 365].map((days) => <button type="button" key={days} className={range === days ? 'active' : ''} onClick={() => setRange(days)}>{days === 1 ? '24H' : days === 365 ? '1Y' : `${days}D`}</button>)}</div>
        {historyLoading ? <p className="crypto-empty">Loading historical prices…</p> : history.length > 1
          ? <svg className="crypto-chart" viewBox="0 0 320 104" role="img" aria-label={`${selected.name} historical price chart`}><path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          : <p className="crypto-empty">Historical prices are not available for this period on the configured provider plan.</p>}
        <small className="crypto-source">Historical daily price observations · CoinPaprika</small>
      </section>
    </section> : <>
      <section className="card crypto-market-summary">
        <span><small>CRYPTO MARKET</small><strong>{coins.length ? `${coins.length} assets` : 'Market overview'}</strong></span>
        <span><small>QUOTE CURRENCY</small><strong>{quote}</strong></span>
        <p>Latest provider market data. Prices may be delayed; they are not executable trading quotes.</p>
      </section>
      <section className="crypto-market-section">
        <div className="crypto-section-heading"><div><small>YOUR ASSETS</small><h2>Watchlist</h2></div><span>{favoriteCoins.length} saved</span></div>
        {favoriteCoins.length ? <div className="crypto-watch-row">{favoriteCoins.slice(0, 8).map((coin) => <button type="button" key={coin.id} onClick={() => setSelected(coin)}><strong>{coin.symbol}</strong><small>{money(coin.price, quote)}</small></button>)}</div> : <p className="crypto-empty">Star a coin to keep it here.</p>}
      </section>
      <section className="crypto-market-section">
        <div className="crypto-section-heading"><div><small>MARKET DISCOVERY</small><h2>Top cryptocurrencies</h2></div><span>{updatedAt ? stamp(updatedAt) : '—'}</span></div>
        <label className="crypto-search"><Icon name="search" size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or symbol" aria-label="Search cryptocurrencies" /></label>
        <div className="crypto-sort" aria-label="Sort cryptocurrency market">{[['rank','Market cap'],['change','24h change'],['price','Price']].map(([key,label]) => <button type="button" key={key} className={sort === key ? 'active' : ''} onClick={() => setSort(key)}>{label}</button>)}</div>
        {loading ? <p className="crypto-empty">Loading crypto market…</p> : error && !coins.length ? <div className="card crypto-error" role="status"><Icon name="info" size={20} /><p>{error}</p></div> : <div className="crypto-list">
          {visible.map((coin) => <article className="card crypto-row" key={coin.id}>
            <button type="button" className="crypto-row-main" onClick={() => setSelected(coin)}>
              <span className="crypto-rank">{coin.rank || '—'}</span><span className="crypto-coin-name"><strong>{coin.name}</strong><small>{coin.symbol}</small></span>
              <span className="crypto-price"><strong>{money(coin.price, quote)}</strong><small className={coin.change24h >= 0 ? 'up' : 'down'}>{changeText(coin.change24h)}</small></span>
            </button>
            <button type="button" className="crypto-star" onClick={() => toggleWatch(coin.id)} aria-label={watchlist.includes(coin.id) ? `Remove ${coin.name} from watchlist` : `Add ${coin.name} to watchlist`}><Icon name={watchlist.includes(coin.id) ? 'star-filled' : 'star'} size={17} /></button>
          </article>)}
          {!visible.length && <p className="crypto-empty">No cryptocurrencies match your search.</p>}
        </div>}
        {error && coins.length > 0 && <p className="crypto-warning" role="status">{error}</p>}
      </section>
      <section className="crypto-provider-note card"><strong>Market data by CoinPaprika</strong><p>Prices are delayed reference data, not live exchange quotes. Market data updates are subject to provider refresh intervals and plan limits. MOVO does not trade or custody cryptocurrency.</p><small>Last provider update: {updatedAt ? stamp(updatedAt) : 'Not available'}</small></section>
    </>}
  </>;
}
function trTitle() { return 'Crypto market'; }
