import React, { useState } from 'react';
import Icon from './Icon';
import { Sheet } from './ui';
import { t as tr } from '../lib/i18n';

/*
 * Shown when the internet connection returns and changes made offline are waiting on this device (owner,
 * 2026-11-12). The person decides whether they go to the cloud now; nothing uploads until they choose "Sync now",
 * unless they turn on automatic sync (here or in Settings → Data & Sync). "Not now" keeps the changes safely on
 * this device and leaves a small reminder to sync later.
 */
export default function ReconnectSyncPrompt({ count = 0, busy = false, onSync, onLater }) {
  const [always, setAlways] = useState(false);
  const message = count === 1
    ? tr('Your internet connection has been restored. Would you like to sync the 1 change you made offline to your MOVO account?')
    : count > 1
      ? tr('Your internet connection has been restored. Would you like to sync the {count} changes you made offline to your MOVO account?', { count })
      : tr('Your internet connection has been restored. Would you like to sync the changes you made offline to your MOVO account?');
  return <Sheet center title="" label={tr('Connection restored')} className="reconnect-sheet" onClose={() => onLater?.(always)}>
    <div className="reconnect-hero">
      <span className="reconnect-icon" aria-hidden="true"><Icon name="cloud" size={26} /></span>
      <h2>{tr('You’re back online')}</h2>
      <p>{message}</p>
      <small>{tr('Until you sync, these changes stay safely on this device.')}</small>
    </div>
    <label className="reconnect-always">
      <input type="checkbox" checked={always} onChange={event => setAlways(event.target.checked)} />
      <span>{tr('Always sync automatically when I’m back online')}</span>
    </label>
    <div className="sheet-actions reconnect-actions">
      <button type="button" className="secondary-button" onClick={() => onLater?.(always)} disabled={busy}>{tr('Not now')}</button>
      <button type="button" className="primary-button" onClick={() => onSync?.(always)} disabled={busy}>{busy ? tr('Syncing…') : tr('Sync now')}</button>
    </div>
  </Sheet>;
}
