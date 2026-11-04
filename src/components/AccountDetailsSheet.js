import React, { useEffect, useMemo, useState } from 'react';
import Icon from './Icon';
import CardArt from './CardArt';
import AccountTile, { styleFor } from './AccountTile';
import { Sheet, TransactionRow } from './ui';
import { money, shown, longDate } from '../lib/format';
import { creditInfo } from '../lib/creditCard';
import { estimateCashback } from '../lib/cashback';
import { listScheduledTransactions } from '../lib/scheduledTransactions';
import { t as tr } from '../lib/i18n';

const TABS = [['overview', 'Overview'], ['activity', 'Transactions'], ['connected', 'Connected'], ['more', 'More']];

export default function AccountDetailsSheet({ account, accounts = [], transactions = [], prefs = {}, subscriptions = [], show = true, holder, onClose, onEdit, onArchive, onAddTransaction, onOpenTransaction, onOpenAccount }) {
  const [tab, setTab] = useState('overview');
  const [qrOpen, setQrOpen] = useState(false);
  const [scheduled, setScheduled] = useState([]);
  const [scheduleReady, setScheduleReady] = useState(false);
  const currency = account.currency || 'PHP';
  const qrCode = prefs.accountQrCodes?.[account.id] || '';
  const cardStyle = prefs.accountStyles?.[account.id] || {};
  const cardNetwork = prefs.cardNetworks?.[account.id] || cardStyle.cardNetwork || account.cardNetwork || '';
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
  const spent = expenses.reduce((sum, item) => sum + (Number(item.origAmount ?? item.amount) || 0), 0);
  const info = creditInfo(account);
  const rules = prefs.cashbackRules || {};
  const autoCashback = useMemo(() => estimateCashback(transactions, accounts, rules).filter(item => item.accountId === account.id), [transactions, accounts, rules, account.id]);
  const manualCashback = (prefs.cashbackEntries || []).filter(item => item.accountId === account.id);
  const subscriptionRows = subscriptions.filter(item => [item.accountId, item.account_id, item.paymentAccountId, item.payment_account_id].includes(account.id));
  useEffect(() => {
    let active = true;
    listScheduledTransactions().then(rows => { if (active) setScheduled((rows || []).filter(item => item.account_id === account.id || item.transfer_to_account_id === account.id)); }).catch(() => { if (active) setScheduled([]); }).finally(() => { if (active) setScheduleReady(true); });
    return () => { active = false; };
  }, [account.id]);
  const fmt = (value) => shown(show, money(value, currency));
  const visual = account.account_type === 'card'
    ? <CardArt a={account} show={show} styleId={cardStyleId} holder={holder} qrCode={qrCode} cardNetwork={cardNetwork} orientation={prefs.cardFormat || 'landscape'} displayMode={prefs.cardDisplayModes?.[account.id] || 'details'} visibleFields={{ accountName: true, cardNumber: true, holderName: false, balance: true, ...(prefs.cardDisplayFields?.[account.id] || {}) }} onQrClick={qrCode ? () => setQrOpen(true) : undefined} />
    : <AccountTile a={account} show={show} style={styleFor(account, prefs.accountStyles || {})} size="preview" qrCode={qrCode} onQrClick={qrCode ? () => setQrOpen(true) : undefined} />;
  const row = (label, value) => <div className="account-hub-metric" key={label}><span>{tr(label)}</span><strong>{value}</strong></div>;
  const cashRule = rules[account.id] || {};
  const cashbackTotal = [...autoCashback, ...manualCashback].reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return <>
    <Sheet title={tr('Account details')} onClose={onClose} label={tr('Account details')} className="account-hub-sheet">
      <div className="account-hub-hero">{visual}</div>
      <div className="account-hub-tabs" role="tablist" aria-label={tr('Account information')}>
        {TABS.map(([key, label]) => <button type="button" role="tab" key={key} aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{tr(label)}</button>)}
      </div>
      {tab === 'overview' && <>
        <div className="account-hub-metrics">
          {info ? <>{row('Credit limit', fmt(info.limit))}{row('Spent / used', fmt(info.owed))}{row('Remaining credit', fmt(info.available))}</>
            : row('Remaining balance', fmt(account.balance))}
          {row('Spent · Last 30 days', fmt(expenses.filter(item => Date.now() - new Date(item.date).getTime() <= 30 * 86400000).reduce((sum,item)=>sum+(Number(item.origAmount ?? item.amount)||0),0)))}
          {row('Transactions', String(relatedTransactions.length))}
        </div>
        <div className="account-hub-section">
          <h3>{tr('Recent activity')}</h3>
          {recentTransactions.slice(0, 5).map(item => <TransactionRow key={item.id} t={item} show={show} onOpen={() => onOpenTransaction?.(item)} />)}
          {!recentTransactions.length && <p className="empty">{tr('No transactions for this account yet.')}</p>}
        </div>
      </>}
      {tab === 'activity' && <div className="account-hub-section">
        <h3>{tr('All account transactions')}</h3>
        {recentTransactions.map(item => <TransactionRow key={item.id} t={item} show={show} onOpen={() => onOpenTransaction?.(item)} />)}
        {!recentTransactions.length && <p className="empty">{tr('No transactions for this account yet.')}</p>}
      </div>}
      {tab === 'connected' && <>
        {account.account_type !== 'card' && <section className="account-hub-section"><h3>{tr('Connected cards')}</h3>
          {linkedCards.map(card => <button type="button" className="account-hub-linked" key={card.id} onClick={() => onOpenAccount?.(card.id)}><span><Icon name="card" size={18}/><b>{card.institution_name || card.name}</b></span><small>{tr(card.cardKind === 'credit' ? 'Credit card' : 'Debit card')} · {card.mask ? `•••• ${card.mask}` : tr('No number')}</small></button>)}
          {!linkedCards.length && <p className="empty">{tr('No cards are linked to this account yet.')}</p>}
        </section>}
        <section className="account-hub-section"><h3>{tr('Automatic cashback')}</h3>
          {cashRule.enabled ? <>{row('Cashback rate', `${cashRule.rate || 0}%`)}{row('Maximum per transaction', cashRule.cap ? fmt(cashRule.cap) : tr('No limit'))}</> : <p className="empty">{tr('Automatic cashback is not enabled for this account.')}</p>}
          {row('Cashback tracked', fmt(cashbackTotal))}
          {manualCashback.map(item => <div className="account-hub-simple-row" key={item.id}><span>{item.source || tr('Cashback')} · {item.date}</span><b>{fmt(item.amount)}</b></div>)}
        </section>
        <section className="account-hub-section"><h3>{tr('Scheduled payments')}</h3>
          {scheduled.map(item => <div className="account-hub-simple-row" key={item.id}><span>{item.title}<small>{item.scheduled_for} · {tr(item.status)}</small></span><b>{fmt(item.amount)}</b></div>)}
          {scheduleReady && !scheduled.length && <p className="empty">{tr('No scheduled payments linked to this account.')}</p>}
          {!scheduleReady && <p className="form-note">{tr('Loading scheduled payments…')}</p>}
        </section>
        <section className="account-hub-section"><h3>{tr('Subscriptions')}</h3>
          {subscriptionRows.map(item => <div className="account-hub-simple-row" key={item.id}><span>{item.name}<small>{item.next || item.start || tr('Renewal date not set')}</small></span><b>{fmt(item.amount)}</b></div>)}
          {!subscriptionRows.length && <p className="empty">{tr('No subscriptions are linked to this account.')}</p>}
        </section>
      </>}
      {tab === 'more' && <>
        <dl className="detail-list">
          {row('Account name', account.institution_name || account.name)}
          {row('Account type', tr(account.account_type === 'e_wallet' ? 'E-wallet' : account.account_type === 'card' ? (account.cardKind === 'credit' ? 'Credit card' : 'Debit card') : 'Bank account'))}
          {row('Currency', currency)}
          {row('Number', account.mask ? `•••• ${account.mask}` : '—')}
          {linkedParent && row('Linked account', linkedParent.institution_name || linkedParent.name)}
          {info && row('Credit utilization', `${info.usedPercent}%`)}
        </dl>
      </>}
      <div className="account-hub-actions">
        <button type="button" className="secondary-button" onClick={onEdit}><Icon name="edit" size={16}/>{tr('Edit account')}</button>
        <button type="button" className="danger-button" onClick={onArchive}><Icon name="archive" size={16}/>{tr('Archive account')}</button>
        <button type="button" className="primary-button" onClick={onAddTransaction}><Icon name="plus" size={16}/>{tr('Add transaction')}</button>
      </div>
    </Sheet>
    {qrOpen && qrCode && <div className="account-qr-lightbox" role="dialog" aria-modal="true" aria-label={tr('Enlarged QR code')} onClick={() => setQrOpen(false)}>
      <button type="button" className="account-qr-close" aria-label={tr('Close QR code')} onClick={() => setQrOpen(false)}><Icon name="close" size={22}/></button>
      <img src={qrCode} alt={tr('Enlarged account QR code')} onClick={event => event.stopPropagation()} />
      <p>{tr('Scan this QR code')}</p>
    </div>}
  </>;
}
