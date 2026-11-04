import React, { useEffect, useMemo, useState } from 'react';
import Icon from './Icon';
import CardArt from './CardArt';
import AccountTile, { styleFor } from './AccountTile';
import { Sheet, TransactionRow, Bars } from './ui';
import { money, shown, dayKey } from '../lib/format';
import { creditInfo } from '../lib/creditCard';
import { estimateCashback } from '../lib/cashback';
import { listScheduledTransactions } from '../lib/scheduledTransactions';
import { t as tr } from '../lib/i18n';

const TABS = [['overview', 'Account overview'], ['activity', 'Transactions'], ['connected', 'Connected items'], ['more', 'More']];

export default function AccountDetailsSheet({ account, accounts = [], transactions = [], prefs = {}, subscriptions = [], show = true, holder, base = 'PHP', qrCodeDisplay = '', canEdit = true, onClose, onEdit, onArchive, onAddTransaction, onOpenTransaction, onOpenAccount }) {
  const [tab, setTab] = useState('overview');
  const [qrOpen, setQrOpen] = useState(false);
  const [scheduled, setScheduled] = useState([]);
  const [scheduleReady, setScheduleReady] = useState(false);
  const currency = account.currency || 'PHP';
  const storedQr = prefs.accountQrCodes?.[account.id] || '';
  const qrCode = qrCodeDisplay || (typeof storedQr === 'string' && storedQr.startsWith('data:image/png;base64,') ? storedQr : '');
  const cardNetwork = prefs.cardNetworks?.[account.id] || account.cardNetwork || '';
  const cardStyleId = prefs.cardStyles?.[account.id] || '';
  const linkedCards = useMemo(() => accounts.filter(item => item.account_type === 'card' && item.id !== account.id && (
    prefs.cardBankLinks?.[item.id] === account.id ||
    (item.issuerBankId || prefs.accountStyles?.[item.id]?.issuerBankId) === account.id
  )), [accounts, account.id, prefs.cardBankLinks, prefs.accountStyles]);
  const linkedParent = useMemo(() => account.account_type === 'card'
    ? accounts.find(item => item.id === (prefs.cardBankLinks?.[account.id] || account.linkedAccountId || account.issuerBankId || prefs.accountStyles?.[account.id]?.issuerBankId))
    : null, [accounts, account, prefs.cardBankLinks, prefs.accountStyles]);
  const relatedTransactions = useMemo(() => transactions.filter(item => item.account_id === account.id || item.transfer_to_account_id === account.id), [transactions, account.id]);
  const recentTransactions = relatedTransactions.slice(0, 30);
  const expenses = relatedTransactions.filter(item => item.type === 'expense' || item.transaction_type === 'expense');
  // Aggregate only debits posted from this account across the last 10 local calendar days.
  // Incoming transfers and transactions merely transferred into this account are not spending.
  const spendingHistory = useMemo(() => {
    const dates = [];
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    for (let offset = 9; offset >= 0; offset -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - offset);
      dates.push({ date, key: dayKey(date), total: 0 });
    }
    const byDay = new Map(dates.map(day => [day.key, day]));
    transactions.forEach(item => {
      if (item.account_id !== account.id || (item.type !== 'expense' && item.transaction_type !== 'expense')) return;
      const timestamp = Date.parse(item.date || item.occurred_at || '');
      if (!Number.isFinite(timestamp)) return;
      const day = byDay.get(dayKey(timestamp));
      if (day) day.total += Math.max(0, Number(item.amount) || 0);
    });
    return dates;
  }, [transactions, account.id]);
  const spendingTotal = spendingHistory.reduce((sum, day) => sum + day.total, 0);
  const recentSpend = expenses.filter(item => { const timestamp = Date.parse(item.date || item.occurred_at || ''); const age = Date.now() - timestamp; return Number.isFinite(timestamp) && age >= 0 && age <= 30 * 86400000; }).reduce((sum, item) => sum + Math.max(0, Number(item.amount) || 0), 0);
  const info = creditInfo(account);
  const rules = prefs.cashbackRules || {};
  const autoCashback = useMemo(() => estimateCashback(transactions, accounts, rules).filter(item => item.accountId === account.id), [transactions, accounts, rules, account.id]);
  const manualCashback = (prefs.cashbackEntries || []).filter(item => item.accountId === account.id);
  const subscriptionRows = subscriptions.filter(item => [item.accountId, item.account_id, item.paymentAccountId, item.payment_account_id].includes(account.id));
  useEffect(() => {
    let active = true;
    setScheduleReady(false);
    setScheduled([]);
    listScheduledTransactions().then(rows => { if (active) setScheduled((rows || []).filter(item => item.account_id === account.id || item.transfer_to_account_id === account.id)); }).catch(() => { if (active) setScheduled([]); }).finally(() => { if (active) setScheduleReady(true); });
    return () => { active = false; };
  }, [account.id]);
  useEffect(() => {
    if (!qrOpen) return undefined;
    const onKeyDown = event => { if (event.key === 'Escape') setQrOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [qrOpen]);
  const fmt = (value) => shown(show, money(value, currency));
  const visual = account.account_type === 'card'
    ? <CardArt a={account} show={show} styleId={cardStyleId} holder={holder} qrCode={qrCode} cardNetwork={cardNetwork} orientation={prefs.walletView?.cardFormat === 'portrait' ? 'portrait' : 'landscape'} displayMode={prefs.cardDisplayModes?.[account.id] || 'details'} visibleFields={{ accountName: true, cardNumber: true, holderName: false, balance: true, ...(prefs.cardDisplayFields?.[account.id] || {}) }} onQrClick={qrCode ? () => setQrOpen(true) : undefined} />
    : <AccountTile a={account} show={show} style={styleFor(account, prefs.accountStyles || {})} size="preview" qrCode={qrCode} onQrClick={qrCode ? () => setQrOpen(true) : undefined} />;
  const row = (label, value) => <div className="account-hub-metric" key={label}><span>{tr(label)}</span><strong>{value}</strong></div>;
  const cashRule = rules[account.id] || {};
  const cashbackTotal = [...autoCashback, ...manualCashback].reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return <>
    <Sheet title={tr('Account details')} onClose={onClose} label={tr('Account details')} className="account-hub-sheet">
      <div className="account-hub-hero">{visual}</div>
      <div className="account-hub-tabs" role="tablist" aria-label={tr('Account sections')}>
        {TABS.map(([key, label]) => <button type="button" role="tab" key={key} aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{tr(label)}</button>)}
      </div>
      {tab === 'overview' && <>
        <div className="account-hub-metrics">
          {info ? <>{row('Credit limit', fmt(info.limit))}{row('Spent or used credit', fmt(info.owed))}{row('Remaining credit', fmt(info.available))}</>
            : row('Current account balance', fmt(account.balance))}
          {row('Spent · Last 30 days', shown(show, money(recentSpend, base)))}
          {row('Transactions', String(relatedTransactions.length))}
        </div>
        <section className="account-hub-section account-spending-section" aria-label={tr('Last 10 days spending')}>
          <div className="account-spending-heading"><h3>{tr('Last 10 Days Spending')}</h3><strong>{shown(show, money(spendingTotal, currency))}</strong></div>
          <div className="account-spending-chart" role="img" aria-label={tr('Spending over the last 10 days: {amount}', { amount: money(spendingTotal, currency) })}>
            <Bars values={spendingHistory.map(day => day.total)} startLabel={tr('10 days ago')} endLabel={tr('Today')} />
          </div>
        </section>
        <div className="account-hub-section">
          <h3>{tr('Recent account activity')}</h3>        </div>
        <div className="account-hub-section">
          <h3>{tr('Recent account activity')}</h3>
          {recentTransactions.slice(0, 5).map(item => <TransactionRow key={item.id} t={item} show={show} onOpen={() => onOpenTransaction?.(item)} />)}
          {!recentTransactions.length && <p className="empty">{tr('No transactions recorded for this account yet.')}</p>}
        </div>
      </>}
      {tab === 'activity' && <div className="account-hub-section">
        <h3>{tr('Account transaction history')}</h3>
        {recentTransactions.map(item => <TransactionRow key={item.id} t={item} show={show} onOpen={() => onOpenTransaction?.(item)} />)}
        {!recentTransactions.length && <p className="empty">{tr('No transactions recorded for this account yet.')}</p>}
      </div>}
      {tab === 'connected' && <>
        {account.account_type !== 'card' && <section className="account-hub-section"><h3>{tr('Cards connected to this account')}</h3>
          {linkedCards.map(card => <button type="button" className="account-hub-linked" key={card.id} onClick={() => onOpenAccount?.(card.id)}><span><Icon name="card" size={18}/><b>{card.institution_name || card.name}</b></span><small>{tr(card.cardKind === 'credit' ? 'Credit card' : 'Debit card')} · {card.mask ? `•••• ${card.mask}` : tr('Card number not added')}</small></button>)}
          {!linkedCards.length && <p className="empty">{tr('No cards connected to this account yet.')}</p>}
        </section>}
        <section className="account-hub-section"><h3>{tr('Automatic cashback settings')}</h3>
          {cashRule.enabled ? <>{row('Cashback rate', `${cashRule.rate || 0}%`)}{row('Maximum per transaction', cashRule.cap ? fmt(cashRule.cap) : tr('No limit'))}</> : <p className="empty">{tr('No automatic cashback rule is active for this account.')}</p>}
          {row('Cashback tracked', fmt(cashbackTotal))}
          {manualCashback.map(item => <div className="account-hub-simple-row" key={item.id}><span>{item.source || tr('Cashback')} · {item.date}</span><b>{fmt(item.amount)}</b></div>)}
        </section>
        <section className="account-hub-section"><h3>{tr('Scheduled payments')}</h3>
          {scheduled.map(item => <div className="account-hub-simple-row" key={item.id}><span>{item.title}<small>{item.scheduled_for} · {tr(item.status)}</small></span><b>{fmt(item.amount)}</b></div>)}
          {scheduleReady && !scheduled.length && <p className="empty">{tr('No scheduled payments are connected to this account.')}</p>}
          {!scheduleReady && <p className="form-note">{tr('Retrieving scheduled payments…')}</p>}
        </section>
        <section className="account-hub-section"><h3>{tr('Subscriptions')}</h3>
          {subscriptionRows.map(item => <div className="account-hub-simple-row" key={item.id}><span>{item.name}<small>{item.next || item.start || tr('Renewal date unavailable')}</small></span><b>{fmt(item.amount)}</b></div>)}
          {!subscriptionRows.length && <p className="empty">{tr('No subscriptions are assigned to this account.')}</p>}
        </section>
      </>}
      {tab === 'more' && <>
        <div className="detail-list">
          {row('Account display name', account.institution_name || account.name)}
          {row('Account type', tr(account.account_type === 'e_wallet' ? 'E-wallet' : account.account_type === 'card' ? (account.cardKind === 'credit' ? 'Credit card' : 'Debit card') : 'Bank account'))}
          {row('Currency', currency)}
          {row('Number', account.mask ? `•••• ${account.mask}` : '—')}
          {linkedParent && row('Associated account', linkedParent.institution_name || linkedParent.name)}
          {info && row('Credit utilization percentage', `${info.usedPercent}%`)}
        </div>
      </>}
      <div className={`account-hub-actions ${canEdit ? '' : 'is-readonly'}`}>
        {canEdit && <>
          <button type="button" className="secondary-button" onClick={onEdit}><Icon name="edit" size={16}/>{tr('Edit account')}</button>
          <button type="button" className="danger-button" onClick={onArchive}><Icon name="archive" size={16}/>{tr('Archive account')}</button>
        </>}
        <button type="button" className="primary-button" onClick={onAddTransaction}><Icon name="plus" size={16}/>{tr('Add transaction')}</button>
      </div>
    </Sheet>
    {qrOpen && qrCode && <div className="account-qr-lightbox" role="dialog" aria-modal="true" aria-label={tr('QR code enlarged')} onClick={() => setQrOpen(false)}>
      <button type="button" className="account-qr-close" aria-label={tr('Close enlarged QR code')} onClick={() => setQrOpen(false)}><Icon name="close" size={22}/></button>
      <img src={qrCode} alt={tr('Account QR code enlarged')} onClick={event => event.stopPropagation()} />
      <p>{tr('Scan this account QR code')}</p>
    </div>}
  </>;
}
