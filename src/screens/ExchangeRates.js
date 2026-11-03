import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon';
import { SubHeader } from '../components/ui';
import { CURRENCIES, currencyName, formatCurrency, rateBetween, isRateStale } from '../lib/fx';
import { t as tr } from '../lib/i18n';
import './ExchangeRates.css';

const DEFAULT_PAIRS = ['USD:PHP', 'EUR:PHP', 'SGD:PHP', 'JPY:PHP', 'GBP:PHP', 'AUD:PHP'];
const pairLabel = (code) => currencyName(code);
const stamp = (value) => {
  if (!value) return tr('Not available');
  try { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); } catch { return new Date(value).toLocaleString(); }
};

export default function ExchangeRates({ c }) {
  const base = c.base || c.prefs?.currency || 'PHP';
  const fx = c.fx || { rates: { USD: 1 }, live: false, at: 0, fetched: 0 };
  const [amount, setAmount] = useState('1');
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState(base);
  const [pairSearch, setPairSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { setTo(base); }, [base]);
  useEffect(() => {
    let active = true;
    c.refreshFx?.(false).catch(() => { if (active) setError(tr('Could not refresh exchange rates. Showing the last saved rates.')); });
    const timer = window.setInterval(() => {
      c.refreshFx?.(false).catch(() => { if (active) setError(tr('Could not refresh exchange rates. Showing the last saved rates.')); });
    }, 6 * 60 * 60 * 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [c.refreshFx]);

  const rate = rateBetween(from, to, fx.rates);
  const parsedAmount = amount.trim() === '' ? 0 : Number(amount);
  const validAmount = Number.isFinite(parsedAmount) && parsedAmount >= 0;
  const converted = validAmount && rate !== null ? parsedAmount * rate : null;
  const tracked = Array.isArray(c.prefs?.fxPairs) ? c.prefs.fxPairs : DEFAULT_PAIRS;
  const pairs = useMemo(() => tracked.filter((pair) => {
    const [a, b] = pair.split(':');
    return CURRENCIES.includes(a) && CURRENCIES.includes(b) && (!pairSearch || `${a} ${b} ${currencyName(a)} ${currencyName(b)}`.toLowerCase().includes(pairSearch.toLowerCase()));
  }), [tracked, pairSearch]);
  const updatedAt = fx.at ? stamp(fx.at) : tr('No provider update yet');
  const stale = isRateStale(fx);
  const liveLabel = fx.live ? (stale ? tr('Provider data may be stale') : tr('Latest provider reference rate')) : tr('Indicative estimates · not live');

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true); setError(''); setNotice('');
    try {
      const result = await c.refreshFx?.(true);
      if (result?.live) setNotice(tr('Exchange rates refreshed.'));
      else setNotice(tr('Showing the latest available rates.'));
    } catch {
      setError(tr('Could not reach the exchange-rate provider. Your saved rates are unchanged.'));
    } finally { setRefreshing(false); }
  };
  const addPair = () => {
    const key = `${from}:${to}`;
    if (from === to) { setNotice(tr('Choose two different currencies.')); return; }
    if (tracked.includes(key)) { setNotice(tr('This pair is already in your list.')); return; }
    c.setPref?.('fxPairs', [...tracked, key]);
    setNotice(tr('Currency pair added.'));
  };
  const removePair = (key) => c.setPref?.('fxPairs', tracked.filter(pair => pair !== key));
  const swap = () => { setFrom(to); setTo(from); };

  return <>
    <SubHeader title={tr('Exchange rates')} onBack={() => c.go('Menu')} right={<button type="button" className="round-button" aria-label={tr('Refresh exchange rates')} onClick={refresh} disabled={refreshing}><Icon name="refresh" size={19} /></button>} />
    <section className="card fx-converter" aria-label={tr('Currency converter')}>
      <div className="fx-section-heading"><span className="fx-kicker">{tr('CURRENCY CONVERTER')}</span><span className={`fx-status ${fx.live && !stale ? 'is-live' : 'is-stale'}`}><i />{liveLabel}</span></div>
      <label className="fx-field"><span>{tr('You send')}</span><div className="fx-input-row"><input aria-label={tr('Amount to convert')} inputMode="decimal" type="number" min="0" step="any" value={amount} onChange={e => setAmount(e.target.value)} /><select aria-label={tr('From currency')} value={from} onChange={e => setFrom(e.target.value)}>{CURRENCIES.map(code => <option key={code} value={code}>{code} · {currencyName(code)}</option>)}</select></div></label>
      <div className="fx-swap-row"><span>{rate === null ? tr('Rate unavailable') : `1 ${from} = ${formatCurrency(rate, to, c.lang?.locale || 'en-PH')}`}</span><button type="button" className="fx-swap" onClick={swap} aria-label={tr('Swap currencies')}><Icon name="refresh" size={17} />{tr('Swap')}</button></div>
      <label className="fx-field fx-result"><span>{tr('You receive')}</span><div className="fx-input-row"><div className="fx-output" role="status" aria-live="polite">{converted === null ? '—' : formatCurrency(converted, to, c.lang?.locale || 'en-PH')}</div><select aria-label={tr('To currency')} value={to} onChange={e => setTo(e.target.value)}>{CURRENCIES.map(code => <option key={code} value={code}>{code} · {currencyName(code)}</option>)}</select></div></label>
      {!validAmount && <p className="fx-error" role="alert">{tr('Enter a valid amount of zero or more.')}</p>}
      <p className="fx-footnote">{tr('Reference rates are indicative and may differ from the rate offered by your bank, card network or money-transfer provider.')}</p>
    </section>

    <section className="fx-market-section">
      <div className="fx-section-title"><div><span className="fx-kicker">{tr('YOUR CURRENCY WATCHLIST')}</span><h2>{tr('Tracked pairs')}</h2></div><button type="button" className="fx-add-pair" onClick={addPair}><Icon name="plus" size={15} />{tr('Add pair')}</button></div>
      <label className="fx-search"><Icon name="search" size={17} /><input value={pairSearch} onChange={e => setPairSearch(e.target.value)} placeholder={tr('Search currencies or codes')} aria-label={tr('Search tracked currency pairs')} /></label>
      <div className="fx-pair-list">
        {pairs.map((key) => {
          const [a, b] = key.split(':');
          const value = rateBetween(a, b, fx.rates);
          return <article className="card fx-pair-card" key={key}>
            <button type="button" className="fx-pair-main" onClick={() => { setFrom(a); setTo(b); window.scrollTo?.({ top: 0, behavior: 'smooth' }); }}>
              <span className="fx-pair-codes"><strong>{a}<i>/</i>{b}</strong><small>{pairLabel(a)} / {pairLabel(b)}</small></span>
              <span className="fx-pair-value">{value === null ? '—' : new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(value)}<small>{tr('per 1 {code}', { code: a })}</small></span>
            </button>
            <button type="button" className="fx-remove-pair" aria-label={tr('Remove {pair}', { pair: key })} onClick={() => removePair(key)}><Icon name="x" size={16} /></button>
          </article>;
        })}
        {!pairs.length && <p className="fx-empty">{tr('No matching currency pairs. Add a pair using the converter above.')}</p>}
      </div>
    </section>

    <section className="fx-provider-note card">
      <span className="fx-provider-icon"><Icon name="clock" size={18} /></span>
      <div><strong>{tr('Rate source & update time')}</strong><p>{tr('Source: ExchangeRate-API reference rates. Last provider update: {date}.', { date: updatedAt })}</p><small>{tr('MOVO checks for newer data when you open this screen and periodically while it is open. The free reference feed is not a tick-by-tick market quote.')}</small></div>
    </section>
    {error && <p className="fx-error" role="alert">{error}</p>}
    {notice && <p className="fx-notice" role="status">{notice}</p>}
  </>;
}
