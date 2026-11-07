import React, { useMemo, useState } from 'react';
import Icon from './Icon';
import AccountPicker from './AccountPicker';
import { Sheet, TransactionRow } from './ui';
import { money } from '../lib/format';
import { t as tr } from '../lib/i18n';

/*
 * "While you were away": what was logged since MOVO was last open (Apple Pay, Google Pay, other automations, manual
 * entries) and phone automations that could not be logged. A failed one is logged here to an account the person
 * chooses, or dismissed. Nothing here is bank-verified; it lists the person's own records.
 */
export const SOURCE_LABEL = {
  applepay: 'Apple Pay', apple_pay_export: 'Apple Pay', googlepay: 'Google Pay', bank: 'Bank alert', bank_sync: 'Bank alert',
  notification: 'Notification', siri_shortcut: 'Siri', android_assistant: 'Android assistant', csv_import: 'Imported', manual: 'Manual', other: 'Manual',
};
const REASON = {
  account_match_required: 'Could not tell which account', account_required: 'No account to log it to', account_invalid: 'That account is archived',
  clarification_required: 'The amount was unclear', invalid_transaction: 'The amount was missing', rate_limited: 'Too many at once', server_error: 'MOVO was unavailable',
};
export const kindOf = (source) => (source === 'applepay' || source === 'apple_pay_export' ? 'applepay'
  : source === 'googlepay' ? 'googlepay'
    : ['bank', 'bank_sync', 'notification', 'siri_shortcut', 'android_assistant'].includes(source) ? 'auto' : 'manual');
const FILTERS = [['all', 'All'], ['applepay', 'Apple Pay'], ['googlepay', 'Google Pay'], ['auto', 'Automatic'], ['manual', 'Manual'], ['failed', 'Not logged']];

function FailedRow({ item, accounts, show, onLog, onDismiss }) {
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState('');
  const [amount, setAmount] = useState(item.amount ? String(Number(item.amount)) : '');
  const [merchant, setMerchant] = useState(item.merchant || item.spoken_text || '');
  const [busy, setBusy] = useState(false);
  const value = Number(String(amount).replace(/,/g, ''));
  const valid = account && Number.isFinite(value) && value > 0 && value < 1e9 && merchant.trim();
  const run = async (fn) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };
  const title = item.merchant || item.spoken_text || tr('Payment');
  return <li className={`rl-failed${open ? ' open' : ''}`}>
    <div className="rl-failed-row">
      <span className="tile tone-red rl-failed-icon" aria-hidden="true"><Icon name="info" size={18} strokeWidth={2.2} /></span>
      <span className="tx-main"><strong>{title}</strong><small>{tr(SOURCE_LABEL[item.source] || 'Notification')} · {tr(REASON[item.reason] || 'MOVO was unavailable')}</small></span>
      <span className="rl-failed-side">
        <b>{item.amount ? (show ? money(Number(item.amount), item.currency || undefined) : '••••') : '—'}</b>
        {!open && <span className="rl-failed-btns">
          <button type="button" className="rl-archive-btn" disabled={busy} onClick={() => run(() => onDismiss(item))} aria-label={tr('Archive {name}', { name: title })}>{tr('Archive')}</button>
          <button type="button" className="rl-log-btn" onClick={() => setOpen(true)} aria-label={tr('Log {name}', { name: title })}>{tr('Log')}</button>
        </span>}
      </span>
    </div>
    {open && <form className="rl-fix" onSubmit={(e) => { e.preventDefault(); if (valid && !busy) run(() => onLog(item, { account_id: account, amount: Math.round(value * 100) / 100, merchant: merchant.trim().slice(0, 160) })); }}>
      <AccountPicker id={`rl-account-${item.id}`} label={tr('Log to')} ariaLabel={tr('Account for {name}', { name: title })} accounts={accounts} value={account} onChange={setAccount} showBalance={show} required />
      <div className="rl-fix-fields">
        <label><span>{tr('Amount')}</span><input inputMode="decimal" aria-label={tr('Amount')} value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="0.00" required /></label>
        <label><span>{tr('Description')}</span><input aria-label={tr('Description')} maxLength={160} value={merchant} onChange={e => setMerchant(e.target.value)} required /></label>
      </div>
      <div className="rl-fix-actions">
        <button type="button" className="secondary-button" disabled={busy} onClick={() => run(() => onDismiss(item))}>{tr('Archive')}</button>
        <button type="submit" className="primary-button" disabled={!valid || busy}>{busy ? tr('Saving…') : tr('Log')}</button>
      </div>
    </form>}
  </li>;
}

export default function RecentLogsSheet({ logs = [], failed = [], accounts = [], show = true, refDate, onLog, onDismiss, onOpen, onClose, transactionBalances, showBalanceAfterTransaction = true }) {
  const counts = useMemo(() => {
    const c = { all: logs.length + failed.length, applepay: 0, googlepay: 0, auto: 0, manual: 0, failed: failed.length };
    logs.forEach(t => { c[kindOf(t.source)] += 1; });
    return c;
  }, [logs, failed]);
  const [filter, setFilter] = useState(failed.length ? 'failed' : 'all');
  const shownLogs = filter === 'all' ? logs : filter === 'failed' ? [] : logs.filter(t => kindOf(t.source) === filter);
  const shownFailed = filter === 'all' || filter === 'failed' ? failed : [];
  const summary = [logs.length ? tr('{n} new', { n: logs.length }) : '', failed.length ? tr('{n} not logged', { n: failed.length }) : ''].filter(Boolean).join(' · ');

  return <Sheet title={tr('While you were away')} subtitle={summary || tr('Nothing new while you were away.')} onClose={onClose} label={tr('While you were away')} className="recent-logs-sheet">
    <div className="rl-filters" role="tablist" aria-label={tr('Filter recent logs')}>
      {FILTERS.filter(([id]) => id === 'all' || counts[id] > 0).map(([id, label]) => <button type="button" role="tab" key={id} aria-selected={filter === id} className={filter === id ? 'selected' : ''} onClick={() => setFilter(id)}>
        {tr(label)}<span className={`rl-count${id === 'failed' ? ' warn' : ''}`}>{counts[id]}</span>
      </button>)}
    </div>
    {shownFailed.length > 0 && <section className="rl-section" aria-label={tr('Not logged')}>
      <h3 className="rl-head">{tr('Not logged')}<small>{tr('Log them to an account, or archive them (kept 90 days).')}</small></h3>
      <ul className="rl-list">{shownFailed.map(item => <FailedRow key={item.id} item={item} accounts={accounts} show={show} onLog={onLog} onDismiss={onDismiss} />)}</ul>
    </section>}
    {shownLogs.length > 0 && <section className="rl-section" aria-label={tr('Logged')}>
      {shownFailed.length > 0 && <h3 className="rl-head">{tr('Logged')}</h3>}
      <div className="card rl-logged">{shownLogs.slice(0, 50).map(t => <TransactionRow key={t.id} t={t} afterBalances={showBalanceAfterTransaction ? transactionBalances?.get(t.id) : undefined} show={show} refDate={refDate} onOpen={onOpen} accountLabel={`${tr(SOURCE_LABEL[t.source] || 'Manual')} · ${t.accountName || t.method || ''}`} />)}</div>
    </section>}
    {!shownFailed.length && !shownLogs.length && <p className="rl-empty">{tr('Nothing new while you were away.')}</p>}
    <button type="button" className="primary-button rl-done" onClick={onClose}>{tr('Done')}</button>
  </Sheet>;
}
