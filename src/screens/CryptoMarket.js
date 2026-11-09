import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './CryptoMarket.css';
import Icon from '../components/Icon';
import MarketUpdate from '../components/MarketUpdate';
import { Skeleton, SubHeader } from '../components/ui';
import { loadCryptoHistory, loadCryptoMarkets, sortCryptoCoins } from '../lib/crypto';
import { evaluateCryptoAlerts } from '../lib/cryptoAlerts';
import { summarizeCryptoHoldings, upsertCryptoHolding } from '../lib/cryptoPortfolio';
import { enablePush, pushGranted, showSystemNotification } from '../lib/alerts';
import { deleteRecord, useConfirm } from '../components/ConfirmDialog';
import { t as tr } from '../lib/i18n';

const CRYPTO_DOMAINS = { BTC:"bitcoin.org", ETH:"ethereum.org", BNB:"bnbchain.org", SOL:"solana.com", XRP:"xrpl.org", ADA:"cardano.org", DOGE:"dogecoin.com", TRX:"tron.network", TON:"ton.org", AVAX:"avax.network", DOT:"polkadot.com", LINK:"chain.link", BCH:"bitcoincash.org", LTC:"litecoin.org", XLM:"stellar.org", SHIB:"shibatoken.com", HBAR:"hedera.com", SUI:"sui.io", XMR:"getmonero.org", ETC:"ethereumclassic.org", NEAR:"near.org", APT:"aptosfoundation.org", UNI:"uniswap.org", AAVE:"aave.com", CRO:"crypto.com", OKB:"okx.com", ICP:"internetcomputer.org", FIL:"filecoin.io", ALGO:"algorand.com", VET:"vechain.org", ATOM:"cosmos.network", ARB:"arbitrum.io", OP:"optimism.io", MKR:"makerdao.com", INJ:"injective.com", PEPE:"pepe.vip" };
function CryptoLogo({ coin, size = 38 }) {
  const domain = CRYPTO_DOMAINS[coin.symbol] || (coin.symbol.toLowerCase() + ".org");
  const [failed, setFailed] = useState(false);
  return <span className="crypto-logo" style={{ width: size, height: size }} aria-hidden="true">
    {!failed && <img src={"https://www.google.com/s2/favicons?domain=" + encodeURIComponent(domain) + "&sz=128"} alt="" loading="lazy" onError={() => setFailed(true)} />}
    {failed && <b>{coin.symbol.slice(0, 3)}</b>}
  </span>;
}

function money(value, quote) {
  if (!Number.isFinite(value)) return '—';
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: quote, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value); }
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
  const confirm = useConfirm();
  useEffect(() => {
    setSelected(current => current ? coins.find(coin => coin.id === current.id) || current : null);
  }, [coins]);
  const [history, setHistory] = useState([]);
  const [range, setRange] = useState(7);
  const [sort, setSort] = useState('rank');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');
  const alerts = Array.isArray(c.prefs?.cryptoAlerts) ? c.prefs.cryptoAlerts : [];
  const [alertDirection, setAlertDirection] = useState('above');
  const [alertTarget, setAlertTarget] = useState('');
  const [alertPermission, setAlertPermission] = useState(pushGranted());
  const [marketView, setMarketView] = useState('market');
  const holdings = Array.isArray(c.prefs?.cryptoHoldings) ? c.prefs.cryptoHoldings : [];
  const [holdingCoin, setHoldingCoin] = useState('');
  const [holdingQuantity, setHoldingQuantity] = useState('');
  const [holdingCost, setHoldingCost] = useState('');
  const [holdingQuote, setHoldingQuote] = useState(quote);
  const [holdingAcquiredAt, setHoldingAcquiredAt] = useState(new Date().toISOString().slice(0, 10));
  const [holdingEditId, setHoldingEditId] = useState(null);
  const [holdingFormOpen, setHoldingFormOpen] = useState(false);
  const portfolio = useMemo(() => summarizeCryptoHoldings(holdings, coins, quote), [holdings, coins, quote]);

  const requestVersion = useRef(0);
  const requestBusy = useRef(false);
  const refresh = useCallback(async (force = false) => {
    if (requestBusy.current) return;
    requestBusy.current = true;
    const version = ++requestVersion.current;
    setRefreshing(true);
    try {
      const result = await loadCryptoMarkets(quote, { force });
      if (version !== requestVersion.current) return;
      setCoins(result.coins);
      // Provider timestamps only; a browser refresh is not a market update.
      const times = result.coins.map(coin => Date.parse(coin.updatedAt)).filter(Number.isFinite);
      setUpdatedAt(times.length ? new Date(Math.max(...times)).toISOString() : '');
      setError(result.stale ? 'Showing cached market data. The provider could not be refreshed.' : '');
    } catch (e) {
      if (version !== requestVersion.current) return;
      setError(e.message === 'crypto_provider_not_configured'
        ? 'Crypto market data is temporarily unavailable. Your watchlist is unchanged.'
        : e.code === 'crypto_provider_payment_required' ? e.message
          : e.message === 'crypto_provider_rate_limited' ? 'Market data is temporarily rate-limited. Try again later.'
          : 'Crypto market data is temporarily unavailable. Your watchlist is unchanged.');
    } finally {
      if (version === requestVersion.current) {
        requestBusy.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [quote]);

  useEffect(() => {
    setLoading(true);
    setCoins([]);
    setSelected(null);
    setUpdatedAt('');
    setError('');
    refresh();
    const update = () => {
      if (document.visibilityState !== 'hidden') refresh(true);
    };
    const timer = window.setInterval(update, 3 * 60 * 1000);
    document.addEventListener('visibilitychange', update);
    return () => {
      ++requestVersion.current;
      requestBusy.current = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, [refresh]);

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

  useEffect(() => {
    if (!coins.length || !alerts.length || !c.setPref) return;
    const result = evaluateCryptoAlerts(alerts, coins);
    if (result.changed) c.setPref('cryptoAlerts', result.alerts);
    result.triggered.forEach((alert) => {
      const title = `${alert.symbol} price alert`;
      const body = `${alert.name} reached ${money(alert.price, alert.quote)} (${alert.direction} ${money(alert.target, alert.quote)}).`;
      if (pushGranted()) showSystemNotification(title, body, `crypto-${alert.id}`);
      else c.notify?.(`${title}: ${body} Open MOVO and enable notifications for device alerts.`);
    });
  }, [coins]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = coins.filter((coin) => !q || coin.name.toLowerCase().includes(q) || coin.symbol.toLowerCase().includes(q));
    return sortCryptoCoins(filtered, sort);
  }, [coins, search, sort]);
  const favoriteCoins = watchlist.map((id) => coins.find((coin) => coin.id === id)).filter(Boolean);
  const toggleWatch = (id) => c.setPref?.('cryptoWatchlist', watchlist.includes(id) ? watchlist.filter((x) => x !== id) : [...watchlist, id].slice(0, 100));

  const addPriceAlert = () => {
    const target = Number(alertTarget);
    if (!selected || !Number.isFinite(target) || target <= 0) { c.notify?.('Enter a valid price greater than zero.'); return; }
    const next = [...alerts, { id: `crypto-${selected.id}-${Date.now()}`, coinId: selected.id, name: selected.name, symbol: selected.symbol, direction: alertDirection, target, quote, enabled: true, lastObservedPrice: selected.price, lastTriggeredAt: null }].slice(-50);
    c.setPref?.('cryptoAlerts', next);
    setAlertTarget('');
    c.notify?.(`Price alert saved for ${selected.symbol}.`);
  };
  const toggleAlert = (id) => c.setPref?.('cryptoAlerts', alerts.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  const deleteAlert = async (id) => {
    const row = alerts.find(a => a.id === id);
    if (!row || !(await confirm({ title: tr('Delete this price alert?'), name: `${row.symbol} · ${row.direction === 'above' ? tr('Above') : tr('Below')} ${money(row.target, row.quote)}`, message: tr('You will no longer be alerted for this price.'), confirmLabel: tr('Delete'), danger: true }))) return;
    c.setPref?.('cryptoAlerts', (c.prefs?.cryptoAlerts || alerts).filter(a => a.id !== id));
  };
  const openHoldingForm = (row = null) => {
    setHoldingEditId(row?.id || null); setHoldingCoin(row?.coinId || coins[0]?.id || '');
    setHoldingQuantity(row ? String(row.quantity) : ''); setHoldingCost(row?.averageCost == null ? '' : String(row.averageCost));
    setHoldingQuote(row?.quote || quote); setHoldingAcquiredAt(row?.acquiredAt ? row.acquiredAt.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setHoldingFormOpen(true);
  };
  const saveHolding = (event) => {
    event.preventDefault();
    const coin = coins.find(item => item.id === holdingCoin);
    if (!coin) { c.notify?.('Select a cryptocurrency available in the current market.'); return; }
    try {
      const row = { id: holdingEditId || (window.crypto?.randomUUID?.() || 'holding-' + Date.now()), coinId: coin.id, name: coin.name, symbol: coin.symbol, quantity: Number(holdingQuantity), averageCost: holdingCost.trim() ? Number(holdingCost) : null, quote: holdingQuote, acquiredAt: holdingAcquiredAt ? new Date(holdingAcquiredAt + 'T12:00:00').toISOString() : null, updatedAt: new Date().toISOString() };
      c.setPref?.('cryptoHoldings', upsertCryptoHolding(holdings, row));
      setHoldingFormOpen(false); setHoldingEditId(null); setHoldingQuantity(''); setHoldingCost(''); setHoldingQuote(quote);
      c.notify?.(holdingEditId ? 'Holding updated.' : 'Holding added to your portfolio.');
    } catch { c.notify?.('Check the quantity and average cost, then try again.'); }
  };
  const deleteHolding = async (id) => {
    const row = holdings.find(item => item.id === id);
    if (!row || !(await confirm(deleteRecord(`${row.name || row.symbol} (${row.symbol})`, { impact: tr('Your portfolio value updates straight away. Your coins on any exchange or wallet are not affected.'), permanent: true })))) return;
    c.setPref?.('cryptoHoldings', (c.prefs?.cryptoHoldings || holdings).filter(item => item.id !== id)); c.notify?.(tr('Holding removed from portfolio.'));
  };

  const requestAlertPermission = async () => {
    const result = await enablePush();
    const granted = result === 'granted';
    setAlertPermission(granted);
    c.notify?.(granted ? 'Device notifications enabled.' : result === 'unsupported' ? 'Notifications are not supported on this device.' : 'Notification permission was not granted. Alerts will only appear inside MOVO while it is open.');
  };

  const values = history.map((p) => p.price);
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const path = values.map((value, i) => `${i ? 'L' : 'M'}${(8 + i / Math.max(1, values.length - 1) * 304).toFixed(1)} ${(92 - (value - min) / span * 78).toFixed(1)}`).join(' ');

  return <>
    <SubHeader title={trTitle()} className="crypto-market-header" onBack={() => c.go('Menu')}
      right={<MarketUpdate updatedAt={updatedAt} busy={loading || refreshing} stale={Boolean(error)} onRefresh={() => refresh(true)} />} />
    {selected ? <section className="crypto-detail">
      <button type="button" className="crypto-back" onClick={() => setSelected(null)}><Icon name="chevron" size={15} /> Back to market</button>
      <div className="card crypto-detail-hero">
        <div className="crypto-coin-identity"><CryptoLogo coin={selected} size={46} /><span><strong>{selected.name}</strong><small>{selected.symbol} · Rank #{selected.rank || '—'}</small></span></div>
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
      <section className="card crypto-alert-card">
        <div className="crypto-section-heading"><div><small>PRICE MONITOR</small><h2>Price alerts</h2></div><span>{alerts.filter(a => a.enabled).length} active</span></div>
        <p className="crypto-alert-note">Alerts are checked while MOVO is open and market prices refresh. Device notifications require permission; background delivery is not guaranteed.</p>
        <div className="crypto-alert-form">
          <select value={alertDirection} onChange={e => setAlertDirection(e.target.value)} aria-label="Alert direction"><option value="above">Rises above</option><option value="below">Falls below</option></select>
          <input type="number" min="0.00000001" step="any" value={alertTarget} onChange={e => setAlertTarget(e.target.value)} placeholder={`Target in ${quote}`} aria-label="Target price" />
          <button type="button" onClick={addPriceAlert}>Add alert</button>
        </div>
        {!alertPermission && <button type="button" className="crypto-enable-notifications" onClick={requestAlertPermission}>Enable device notifications</button>}
        {alerts.filter(a => a.coinId === selected.id).map(alert => <div className="crypto-alert-row" key={alert.id}>
          <span><strong>{alert.direction === 'above' ? 'Above' : 'Below'} {money(alert.target, alert.quote)}</strong><small>{alert.enabled ? 'Active' : 'Paused'} · {alert.lastTriggeredAt ? `Last triggered ${stamp(alert.lastTriggeredAt)}` : 'Waiting for price crossing'}</small></span>
          <button type="button" onClick={() => toggleAlert(alert.id)}>{alert.enabled ? 'Pause' : 'Enable'}</button>
          <button type="button" onClick={() => deleteAlert(alert.id)} aria-label={`Delete alert for ${selected.symbol}`}>×</button>
        </div>)}
        {!alerts.some(a => a.coinId === selected.id) && <p className="crypto-empty">No price alerts for {selected.symbol} yet.</p>}
      </section>
      <section className="card crypto-chart-card">
        <div className="crypto-section-heading"><div><small>PRICE HISTORY</small><h2>{selected.symbol} / {quote}</h2></div><strong>{money(values[values.length - 1] ?? selected.price, quote)}</strong></div>
        <div className="crypto-ranges">{[1, 7, 30, 90, 365].map((days) => <button type="button" key={days} aria-pressed={range === days} className={range === days ? 'active' : ''} onClick={() => setRange(days)}>{days === 1 ? '24H' : days === 365 ? '1Y' : `${days}D`}</button>)}</div>
        {historyLoading ? <p className="crypto-empty">Loading historical prices…</p> : history.length > 1
          ? <svg className="crypto-chart" viewBox="0 0 320 104" role="img" aria-label={`${selected.name} historical price chart`}><path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          : <p className="crypto-empty">Historical prices are not available for this period.</p>}
        <small className="crypto-source">Historical daily price observations · CoinBeacon / Binance</small>
      </section>
    </section> : <>
      <div className="crypto-view-switch" role="tablist" aria-label="Crypto sections"><button type="button" role="tab" aria-selected={marketView === 'market'} className={marketView === 'market' ? 'active' : ''} onClick={() => setMarketView('market')}>Market</button><button type="button" role="tab" aria-selected={marketView === 'portfolio'} className={marketView === 'portfolio' ? 'active' : ''} onClick={() => setMarketView('portfolio')}>Portfolio <span>{holdings.length}</span></button></div>
      {marketView === 'portfolio' ? <section className="crypto-portfolio">
        <section className="crypto-portfolio-overview card">
          <div className="crypto-portfolio-kicker"><span>YOUR INVESTMENTS</span><span className="crypto-portfolio-live"><i /> Market-linked</span></div>
          <small className="crypto-portfolio-label">Portfolio value · {quote}</small>
          <strong className="crypto-portfolio-total">{portfolio.totalValue === null ? '—' : money(portfolio.totalValue, quote)}</strong>
          <div className="crypto-portfolio-metrics"><span><small>Cost basis</small><b>{portfolio.totalCost === null ? '—' : money(portfolio.totalCost, quote)}</b></span><span><small>Unrealized P/L</small><b className={portfolio.profitLoss > 0 ? 'up' : portfolio.profitLoss < 0 ? 'down' : ''}>{portfolio.profitLoss === null ? '—' : (portfolio.profitLoss > 0 ? '+' : '') + money(portfolio.profitLoss, quote)}</b></span></div>
          <p>Latest available market reference prices. These are not exchange execution quotes.</p>
        </section>
        <div className="crypto-portfolio-heading"><div><small>YOUR POSITIONS</small><h2>Holdings <span>{portfolio.totalCount}</span></h2></div><button type="button" className="crypto-portfolio-add" onClick={() => openHoldingForm()} disabled={!coins.length}><Icon name="plus" size={16} /> Add holding</button></div>
        {holdingFormOpen && <form className="crypto-holding-form card" onSubmit={saveHolding}>
          <div className="crypto-holding-form-head"><div><small>{holdingEditId ? 'EDIT POSITION' : 'NEW POSITION'}</small><h3>{holdingEditId ? 'Update holding' : 'Add a holding'}</h3></div><button type="button" aria-label="Close holding form" onClick={() => setHoldingFormOpen(false)}>×</button></div>
          <label>Asset<select value={holdingCoin} onChange={e => setHoldingCoin(e.target.value)} required>{coins.map(coin => <option key={coin.id} value={coin.id}>{coin.name} ({coin.symbol})</option>)}</select></label>
          <div className="crypto-holding-fields"><label>Quantity<input type="number" min="0.0000000001" step="any" inputMode="decimal" value={holdingQuantity} onChange={e => setHoldingQuantity(e.target.value)} placeholder="0.00" required /></label><label>Average buy price <small>({holdingQuote} per coin)</small><input type="number" min="0" step="any" inputMode="decimal" value={holdingCost} onChange={e => setHoldingCost(e.target.value)} placeholder="Optional" /></label></div>
          <label>Acquisition date<input type="date" value={holdingAcquiredAt} onChange={e => setHoldingAcquiredAt(e.target.value)} /></label><p className="crypto-holding-hint">Enter your average acquisition price in {holdingQuote}. Holdings keep their original quote currency; MOVO will not convert cost basis without a verified FX rate.</p>
          <button type="submit" className="crypto-holding-save">{holdingEditId ? 'Save changes' : 'Add to portfolio'}</button>
        </form>}
        {portfolio.rows.length ? <div className="crypto-holding-list">{portfolio.rows.map(row => <article className="crypto-holding-row card" key={row.id}>
          <button type="button" className="crypto-holding-main" onClick={() => { const coin = coins.find(item => item.id === row.coinId); if (coin) setSelected(coin); }}><span className="crypto-holding-mark">{row.symbol.slice(0,4)}</span><span className="crypto-holding-name"><strong>{row.name}</strong><small>{row.quantity.toLocaleString(undefined,{maximumFractionDigits:10})} {row.symbol} · {row.quote}</small></span><span className="crypto-holding-value"><b>{row.value === null ? '—' : money(row.value, quote)}</b><small className={row.profitLoss > 0 ? 'up' : row.profitLoss < 0 ? 'down' : ''}>{row.profitLoss === null ? 'Cost/pricing unavailable' : (row.profitLoss > 0 ? '+' : '') + money(row.profitLoss, quote)}</small></span></button>
          <div className="crypto-holding-actions"><button type="button" onClick={() => openHoldingForm(row)}>Edit</button><button type="button" onClick={() => deleteHolding(row.id)}>Remove</button></div>
        </article>)}</div> : <div className="crypto-portfolio-empty card"><span className="crypto-portfolio-empty-icon"><Icon name="chart" size={25} /></span><h3>Your portfolio starts here</h3><p>Add the crypto you already own. MOVO tracks market value and unrealized performance without mixing it into your cash balance.</p><button type="button" onClick={() => openHoldingForm()} disabled={!coins.length}>Add your first holding</button>{!coins.length && <small>Market prices must be available before adding a priced asset.</small>}</div>}
        <p className="crypto-portfolio-disclaimer">Manual holdings only. Stored in MOVO preferences. Portfolio value is excluded from available cash, income and expense totals.</p>
      </section> : <>
      <section className="card crypto-market-summary">
        <span><small>CRYPTO MARKET</small><strong>{coins.length ? `${coins.length} assets` : 'Market overview'}</strong></span>
        <span><small>QUOTE CURRENCY</small><strong>{quote}</strong></span>
        <p>Latest provider market data. Prices may be delayed; they are not executable trading quotes.</p>
      </section>
      <section className="crypto-market-section">
        {favoriteCoins.length ? <section className="crypto-watchlist card">
          <div className="crypto-section-heading"><div><small>YOUR TRACKED ASSETS</small><h2>Watchlist</h2></div><span className="crypto-live-label"><i /> Auto-refresh · 3 min</span></div>
          <div className="crypto-watchlist-items">{favoriteCoins.map((coin) => <button type="button" className="crypto-watch-item" key={coin.id} onClick={() => setSelected(coin)}>
            <CryptoLogo coin={coin} size={34} />
            <span className="crypto-watch-meta"><strong>{coin.symbol}</strong><small>{money(coin.price, quote)}</small></span>
            <span className={"crypto-watch-change " + (coin.change24h > 0 ? 'up' : coin.change24h < 0 ? 'down' : 'flat')}>{changeText(coin.change24h)}</span>
          </button>)}</div>
        </section> : <p className="crypto-empty">Star a coin to keep it here.</p>}
      </section>
      <section className="crypto-market-section">
        <div className="crypto-section-heading"><div><small>MARKET DISCOVERY</small><h2>Top cryptocurrencies</h2></div><span>{updatedAt ? stamp(updatedAt) : '—'}</span></div>
        <label className="crypto-search"><Icon name="search" size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or symbol" aria-label="Search cryptocurrencies" /></label>
        <div className="crypto-sort" aria-label="Sort cryptocurrency market">{[['rank','Market cap'],['change','24h change'],['price','Price']].map(([key,label]) => <button type="button" key={key} aria-pressed={sort === key} className={sort === key ? 'active' : ''} onClick={() => setSort(key)}>{label}</button>)}</div>
        {loading ? <div className="card pad"><Skeleton lines={5} label="Loading crypto market…" /></div> : error && !coins.length ? <div className="card crypto-error" role="status"><Icon name="info" size={20} /><p>{error}</p></div> : <div className="crypto-list">
          {visible.map((coin) => <article className="card crypto-row" key={coin.id}>
            <button type="button" className="crypto-row-main" onClick={() => setSelected(coin)}>
              <span className="crypto-rank">{coin.rank || '—'}</span><CryptoLogo coin={coin} /><span className="crypto-coin-name"><strong>{coin.name}</strong><small>{coin.symbol}</small></span>
              <span className="crypto-price"><strong>{money(coin.price, quote)}</strong><small className={coin.change24h >= 0 ? 'up' : 'down'}>{changeText(coin.change24h)}</small></span>
            </button>
            <button type="button" className="crypto-star" onClick={() => toggleWatch(coin.id)} aria-label={watchlist.includes(coin.id) ? `Remove ${coin.name} from watchlist` : `Add ${coin.name} to watchlist`}><Icon name={watchlist.includes(coin.id) ? 'star-filled' : 'star'} size={17} /></button>
          </article>)}
          {!visible.length && <p className="crypto-empty">No cryptocurrencies match your search.</p>}
        </div>}
        {error && coins.length > 0 && <p className="crypto-warning" role="status">{error}</p>}
      </section>
      <section className="crypto-provider-note card"><strong>Market data by CoinBeacon · Binance fallback</strong><p>Prices are delayed reference data, not live exchange quotes. Market data updates are subject to provider refresh intervals and free API limits. MOVO does not trade or custody cryptocurrency.</p><small>Market-cap rankings and coin details by CoinMarketCap.</small><small>Last provider update: {updatedAt ? stamp(updatedAt) : 'Not available'}</small></section>
      </>}
    </>}
  </>;
}
function trTitle() { return 'Crypto market'; }
