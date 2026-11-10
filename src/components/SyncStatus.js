import React, { useState } from 'react';
import Icon from './Icon';
import { Sheet } from './ui';
import { deleteRecord, useConfirm } from './ConfirmDialog';
import { describeConflict } from '../lib/offlineConflicts';
import { money, longDate, timeLabel } from '../lib/format';
import { t as tr } from '../lib/i18n';

/*
 * Sync status shown on every page (section 5): a compact bar above the dock for offline, ready-to-sync, review and
 * paused states, the "Your internet connection has been restored." notice with "Sync local to cloud", and the sync
 * sheet with the details and the conflict review. Status comes from lib/syncStatus.js; nothing here talks to the
 * network or changes a record by itself.
 */

const changesSaved = n => (n === 1 ? tr('1 change saved on this device') : tr('{n} changes saved on this device', { n }));
const changesReady = n => (n === 1 ? tr('1 change on this device is ready to sync.') : tr('{n} changes on this device are ready to sync.', { n }));
const recordsToReview = n => (n === 1 ? tr('1 record changed both on this device and in your MOVO account.') : tr('{n} records changed both on this device and in your MOVO account.', { n }));

/** Short label for Menu and Settings rows. */
export function syncStatusLabel(kind) {
  return {
    syncing: tr('Syncing…'), synced: tr('Synced'), offline: tr('Offline'), waiting: tr('Ready to sync'),
    review: tr('Needs your review'), error: tr('Sync paused'),
  }[kind] || '';
}

/** One-line explanation for Menu and Settings rows. */
export function syncStatusDetail(status, syncState) {
  switch (status.kind) {
    case 'syncing': return tr('Checking this device against your MOVO account.');
    case 'synced': return tr('This device matches your MOVO account.');
    case 'offline': return status.pending ? changesSaved(status.pending) : tr('Showing the copy saved on this device.');
    case 'waiting': return changesReady(Math.max(1, status.pending));
    case 'review': return recordsToReview(Math.max(1, status.conflicts));
    case 'error': return `${tr(syncState?.message || 'Cloud is unavailable. Device changes remain queued.')} ${tr('Nothing was discarded.')}`;
    default: return '';
  }
}

const TONE = { offline: 'gray', waiting: 'blue', review: 'amber', error: 'red', synced: 'green', syncing: 'blue' };

/**
 * Bottom bar. `waiting` shows the reconnect notice with its action until dismissed; afterwards, and for the other
 * states, a compact pill that opens the sync sheet. Nothing is shown while synced, syncing or without the cloud.
 */
export function SyncBar({ status, reason, noticeHidden, busy, onSync, onOpen, onHide }) {
  if (!['offline', 'waiting', 'review', 'error'].includes(status.kind)) return null;
  if (status.kind === 'waiting' && !noticeHidden) {
    return <div className="sync-notice" role="status" aria-live="polite">
      <span className="sync-notice-icon" aria-hidden="true"><Icon name="cloud" size={20} /></span>
      <div className="sync-notice-text">
        <strong>{reason === 'resolved' ? tr('Ready to sync') : tr('Your internet connection has been restored.')}</strong>
        <span>{changesReady(Math.max(1, status.pending))}</span>
      </div>
      <button type="button" className="sync-notice-action" onClick={onSync} disabled={busy}>{tr('Sync local to cloud')}</button>
      <button type="button" className="sync-notice-hide" aria-label={tr('Close')} onClick={onHide}><Icon name="close" size={16} /></button>
    </div>;
  }
  const text = status.kind === 'offline' ? `${tr('Offline')} · ${status.pending ? changesSaved(status.pending) : tr('Showing the copy saved on this device.')}`
    : status.kind === 'waiting' ? `${tr('Ready to sync')} · ${changesReady(Math.max(1, status.pending))}`
      : status.kind === 'review' ? tr('Sync needs your review')
        : tr('Sync paused');
  return <button type="button" className={`sync-pill tone-${TONE[status.kind]}`} onClick={onOpen} aria-label={`${text} ${tr('Open sync details')}`}>
    <span className="sync-pill-dot" aria-hidden="true" /><span className="sync-pill-text">{text}</span><Icon name="chevron" size={14} />
  </button>;
}

const amountOf = row => {
  const value = Number(row?.amount ?? row?.opening_balance);
  return Number.isFinite(value) ? money(value, /^[A-Z]{3}$/.test(row?.currency || '') ? row.currency : undefined) : '';
};
const dateOf = value => (value && Number.isFinite(Date.parse(value)) ? `${longDate(value)} · ${timeLabel(value)}` : '');

/** The fields a person needs to tell two versions apart, in a fixed order. */
function fieldsOf(group, row, accountName) {
  if (!row) return [];
  if (group === 'financial_accounts') {
    return [
      [tr('Name'), row.name || ''], [tr('Opening balance'), amountOf(row)], [tr('Currency'), row.currency || ''],
      [tr('Status'), row.is_archived ? tr('Archived') : tr('Active')],
    ];
  }
  return [
    [tr('Description'), row.merchant || ''], [tr('Amount'), amountOf(row)],
    [tr('Type'), ({ expense: tr('Expense'), income: tr('Income'), transfer: tr('Transfer') })[row.transaction_type] || row.transaction_type || ''], [tr('Date'), dateOf(row.occurred_at)],
    [tr('Account'), accountName(row.account_id)], [tr('Category'), row.category || ''], [tr('Note'), row.note || ''],
  ];
}

function Version({ label, group, row, other, accountName, deletedText }) {
  const fields = fieldsOf(group, row, accountName);
  const theirs = new Map(fieldsOf(group, other, accountName));
  return <div className="sync-version">
    <small>{label}</small>
    {row ? <dl>{fields.filter(([, value]) => value !== '').map(([name, value]) => (
      <div key={name} className={other && theirs.get(name) !== value ? 'changed' : undefined}><dt>{name}</dt><dd>{value}</dd></div>
    ))}</dl> : <p className="sync-version-deleted">{deletedText}</p>}
  </div>;
}

function ConflictCard({ conflict, accountName, onResolve, busy }) {
  const confirm = useConfirm();
  const view = describeConflict(conflict);
  const either = view.device || view.cloud || {};
  const name = view.group === 'financial_accounts' ? either.name || tr('Account') : either.merchant || tr('Transaction');
  const choose = async keep => {
    // Keeping a deletion removes the record: ask first, like every other delete.
    const deletes = keep === 'device' ? !view.device : !view.cloud;
    if (deletes && !(await confirm(deleteRecord(name, { impact: tr('It is removed from this device and from your MOVO account when you sync.') })))) return;
    onResolve(conflict, keep);
  };
  return <article className="sync-conflict" aria-label={name}>
    <header><strong>{name}</strong><span>{view.group === 'financial_accounts' ? tr('Account') : tr('Transaction')}</span></header>
    <div className="sync-versions">
      <Version label={tr('This device')} group={view.group} row={view.device} other={view.cloud} accountName={accountName} deletedText={tr('Deleted on this device')} />
      <Version label={tr('MOVO account')} group={view.group} row={view.cloud} other={view.device} accountName={accountName} deletedText={tr('Deleted in your MOVO account')} />
    </div>
    <div className="sync-choice">
      <button type="button" className="secondary-button" disabled={busy} onClick={() => choose('device')}>{tr('Keep this device')}</button>
      <button type="button" className="secondary-button" disabled={busy} onClick={() => choose('cloud')}>{tr('Keep MOVO account')}</button>
    </div>
  </article>;
}

/** Sync details and actions; lists each conflict with both versions side by side. */
export function SyncSheet({ status, syncState, conflicts, accounts, lastSyncedAt, busy, onSync, onResolve, onClose }) {
  const [running, setRunning] = useState(false);
  const names = new Map((accounts || []).map(account => [account.id, account.name]));
  const accountName = id => names.get(id) || '';
  const left = conflicts.length;
  const canSync = status.kind !== 'syncing' && !(status.kind === 'review' && left > 0);
  const sync = async () => {
    if (running || busy || !canSync) return;
    setRunning(true);
    try { await onSync(); } finally { setRunning(false); }
  };
  const title = status.kind === 'review' && !left ? tr('Ready to sync') : syncStatusLabel(status.kind) || tr('Cloud Sync');
  return <Sheet title={tr('Sync')} onClose={onClose} label={tr('Sync status')} className="sync-sheet">
    <section className={`sync-summary tone-${TONE[status.kind] || 'gray'}`} role="status" aria-live="polite">
      <span className="sync-summary-icon" aria-hidden="true"><Icon name={status.kind === 'synced' ? 'check' : 'cloud'} size={20} /></span>
      <div><strong>{title}</strong><p>{status.kind === 'review' && !left ? changesReady(Math.max(1, status.pending)) : syncStatusDetail(status, syncState)}</p>
        {status.kind === 'synced' && lastSyncedAt && <small>{tr('Last synced {time}', { time: dateOf(lastSyncedAt) })}</small>}
        {status.kind === 'offline' && <small>{tr('Changes made while offline are kept on this device. Tap Sync local to cloud when you are back online.')}</small>}
      </div>
    </section>
    {left > 0 && <section className="sync-conflicts">
      <p className="sync-conflicts-hint">{tr('Choose which version to keep. Nothing is uploaded or discarded until you sync.')}</p>
      {conflicts.map(conflict => <ConflictCard key={`${conflict.group}:${conflict.id}`} conflict={conflict} accountName={accountName} onResolve={onResolve} busy={busy || running} />)}
    </section>}
    <button type="button" className="primary-button sync-sheet-action" onClick={sync} disabled={!canSync || busy || running}>
      {running || status.kind === 'syncing' ? tr('Syncing…') : status.kind === 'synced' ? tr('Sync now') : tr('Sync local to cloud')}
    </button>
    {status.kind === 'review' && left > 0 && <p className="sync-sheet-note">{tr('Choose a version for each record to continue.')}</p>}
  </Sheet>;
}
