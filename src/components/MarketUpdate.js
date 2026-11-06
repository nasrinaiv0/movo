import React from 'react';
import Icon from './Icon';
import { t as tr } from '../lib/i18n';

export function formatMarketUpdate(value, locale) {
  if (!value || !Number.isFinite(Date.parse(value))) return tr('Awaiting market data');
  return new Intl.DateTimeFormat(locale || undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(value));
}

/** Activity reflects requests, never a claim that delayed prices are live. */
export default function MarketUpdate({ updatedAt, busy, stale, onRefresh }) {
  const valid = updatedAt && Number.isFinite(Date.parse(updatedAt));
  const state = busy ? 'Updating' : stale ? 'Refresh unavailable' : valid ? 'Last Update' : 'Awaiting market data';
  return <div className={`market-update${busy ? ' is-updating' : ''}${stale ? ' is-stale' : ''}`}>
    <div className="market-update-copy" role="status" aria-live="polite" aria-atomic="true">
      <span className="market-update-label">
        <span className="market-telemetry" aria-hidden="true"><i /><i /><i /><i /></span>
        {tr(state)}
      </span>
      {valid && <time key={updatedAt} dateTime={updatedAt}>{formatMarketUpdate(updatedAt)}</time>}
    </div>
    <button type="button" className="round-button market-refresh-button" onClick={onRefresh}
      disabled={busy} aria-label="Refresh crypto markets" aria-busy={busy}>
      <span className="market-refresh-icon"><Icon name="refresh" size={23} /></span>
    </button>
  </div>;
}
