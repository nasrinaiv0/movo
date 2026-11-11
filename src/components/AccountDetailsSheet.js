import React, { useEffect, useMemo, useState } from 'react';
import Icon from './Icon';
import CardArt from './CardArt';
import { Sheet, TransactionRow } from './ui';
import MoneyFlow from './MoneyFlow';
import { money, shown } from '../lib/format';
import { creditInfo } from '../lib/creditCard';
import { estimateCashback } from '../lib/cashback';
import { listScheduledTransactions } from '../lib/scheduledTransactions';
import { listGoals, listGoalAllocations } from '../lib/obligationsRepository';
import { t as tr } from '../lib/i18n';
import { accountActivityRows, linkedBankIdForCard, linkedCardsForBank } from '../lib/bankCardActivity';

const TABS = [['overview', 'Account overview'], ['activity', 'Transactions'], ['connected', 'Connected items'], ['more', 'More']];

export default function AccountDetailsSheet({ account, accounts = [], transactions = [], prefs = {}, subscriptions = [], plans = [], cloudMode = false, toBase, show = true, holder, base = 'PHP', qrCodeDisplay = '', canEdit = true, onClose, onEdit, onArchive, onAddTransaction, onOpenTransaction, onOpenAccount, transactionBalances, showBalanceAfterTransaction = true }) {
  const [tab, setTab] = useState('overview');
  const [activityScope, setActivityScope] = useState('all');
  const [activityLimit, setActivityLimit] = useState(50);
  const [qrOpen, setQrOpen] = useState(false);
  const [scheduled, setScheduled] = useState([]);
  const [scheduleReady, setScheduleReady] = useState(false);
  const [goalAllocations, setGoalAllocations] = useState([]);
  const [goalAllocationReady, setGoalAllocationReady] = useState(!cloudMode);
  const currency = account.currency || 'PHP';
  const storedQr = prefs.accountQrCodes?.[account.id] || '';
  const qrCode = qrCodeDisplay || (typeof storedQr === 'string' && storedQr.startsWith('data:image/png;base64,') ? storedQr : '');
  const cardNetwork = prefs.cardNetworks?.[account.id] || account.cardNetwork || '';
  const cardStyleId = prefs.cardStyles?.[account.id] || '';
  const linkedCards = useMemo(() => linkedCardsForBank(account, accounts, prefs), [account, accounts, prefs.cardBankLinks, prefs.accountStyles]);
  const linkedParent = useMemo(() => account.account_type === 'card'
    ? accounts.find(item => item.id === linkedBankIdForCard(account, prefs))
    : null, [accounts, account, prefs.cardBankLinks, prefs.accountStyles]);
  const allocationAccountIds = useMemo(() => new Set([account.id, ...(account.account_type === 'card' && account.cardKind === 'debit' && linkedParent?.id ? [linkedParent.id] : [])]), [account.id, account.account_type, account.cardKind, linkedParent?.id]);
  const planFundRows = useMemo(() => plans.flatMap(plan => (Array.isArray(plan.fundingAllocations) ? plan.fundingAllocations : [])
    .filter(item => item && item.status === 'allocated' && allocationAccountIds.has(item.account_id))
    .map(item => ({ ...item, label: plan.name || tr('Plan'), source: 'plan', currency: base }))), [plans, allocationAccountIds, base]);
  const goalFundRows = useMemo(() => goalAllocations
    .filter(item => item && item.status === 'allocated' && allocationAccountIds.has(item.account_id))
    .map(item => ({ ...item, label: item.goal_name || tr('Savings goal'), source: 'goal' })), [goalAllocations, allocationAccountIds]);
  const allocatedFundRows = [...goalFundRows, ...planFundRows].sort((left, right) => String(right.created_at || '').localeCompare(String(left.created_at || '')));
  const allocatedFundTotal = allocatedFundRows.reduce((sum, item) => sum + (toBase ? toBase(Number(item.amount) || 0, item.currency || currency) : (Number(item.amount) || 0)), 0);
  // Bank overview combines the bank and its linked cards; card overview remains strictly per card.
  // Each ledger row appears once, even when both sides of a transfer belong to this bank.
  const relatedTransactions = useMemo(() => accountActivityRows(transactions,
    account.account_type === 'bank' ? [account.id, ...linkedCards.map(card => card.id)] : [account.id]
  ), [transactions, account.id, account.account_type, linkedCards]);
  const recentTransactions = relatedTransactions.slice(0, 5);
  const activityTransactions = useMemo(() => {
    if (account.account_type !== 'bank' || activityScope === 'all') return relatedTransactions;
    if (activityScope === 'bank') return accountActivityRows(transactions, [account.id]);
    return linkedCards.some(card => card.id === activityScope)
      ? accountActivityRows(transactions, [activityScope]) : relatedTransactions;
  }, [account.account_type, account.id, activityScope, linkedCards, relatedTransactions, transactions]);
  useEffect(() => { setActivityScope('all'); setActivityLimit(50); }, [account.id]);
  const expenses = relatedTransactions.filter(item => item.type === 'expense' || item.transaction_type === 'expense');
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
    let active = true;
    setGoalAllocationReady(!cloudMode);
    setGoalAllocations([]);
    if (!cloudMode) return () => { active = false; };
    listGoals().then(async rows => {
      const goals = (rows || []).filter(item => item && item.id);
      const allocations = (await Promise.all(goals.map(goal => listGoalAllocations(goal.id).catch(() => [])))).flat();
      if (active) setGoalAllocations(allocations.map(item => ({ ...item, goal_name: goals.find(goal => goal.id === item.goal_id)?.name || tr('Savings goal') })));
    }).catch(() => { if (active) setGoalAllocations([]); }).finally(() => { if (active) setGoalAllocationReady(true); });
    return () => { active = false; };
  }, [cloudMode]);
  useEffect(() => {
    if (!qrOpen) return undefined;
    const onKeyDown = event => { if (event.key === 'Escape') setQrOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [qrOpen]);
  const fmt = (value) => shown(show, money(value, currency));
  // Use the same institution-aware card artwork as Wallet for every account type.
  // AccountTile's solid accent swatch made bank/e-wallet detail previews lose their real brand styling.
  const visual = <CardArt a={account} show={show} styleId={cardStyleId} holder={holder} qrCode={qrCode} cardNetwork={cardNetwork} orientation={prefs.walletView?.cardFormat === 'portrait' ? 'portrait' : 'landscape'} displayMode={prefs.cardDisplayModes?.[account.id] || 'details'} visibleFields={{ accountName: true, cardNumber: true, holderName: false, balance: true, ...(prefs.cardDisplayFields?.[account.id] || {}) }} onQrClick={qrCode ? () => setQrOpen(true) : undefined} />
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
        <div className="account-money-flow">
          <MoneyFlow txs={relatedTransactions} refDate={new Date()} show={show} variant="bars" />
        </div>
        <div className="account-hub-section">
          <h3>{tr('Recent account activity')}</h3>
          {recentTransactions.map(item => <TransactionRow key={item.id} t={item} afterBalances={showBalanceAfterTransaction ? transactionBalances?.get(item.id) : undefined} show={show} onOpen={() => onOpenTransaction?.(item)} />)}
          {!recentTransactions.length && <p className="empty">{tr('No transactions recorded for this account yet.')}</p>}
        </div>
      </>}
      {tab === 'activity' && <div className="account-hub-section">
        <h3>{tr(account.account_type === 'bank' ? 'Bank and card transactions' : 'Account transaction history')}</h3>
        {account.account_type === 'bank' && linkedCards.length > 0 && <div className="account-hub-sources" role="group" aria-label={tr('Transaction source')}>
          {[
            { id: 'all', title: tr('All activity'), subtitle: tr('Bank + {n} linked cards', { n: linkedCards.length }), count: relatedTransactions.length },
            { id: 'bank', title: tr('Bank account'), subtitle: account.name, count: accountActivityRows(transactions, [account.id]).length },
            ...linkedCards.map((card, index) => ({
              id: card.id,
              title: tr('Card {n}', { n: index + 1 }) + (card.mask ? ` · •••• ${card.mask}` : ''),
              subtitle: tr(card.cardKind === 'credit' ? 'Credit card' : 'Debit card'),
              count: accountActivityRows(transactions, [card.id]).length,
            })),
          ].map(source => <button type="button" key={source.id} className={activityScope === source.id ? 'active' : ''} aria-pressed={activityScope === source.id} onClick={() => { setActivityScope(source.id); setActivityLimit(50); }}>
            <strong>{source.title}</strong><small>{source.subtitle} · {source.count} {tr('transactions')}</small>
          </button>)}
        </div>}
        {activityTransactions.slice(0, activityLimit).map(item => <div key={item.id} className="account-hub-activity-row">
          {account.account_type === 'bank' && activityScope === 'all' && <small className="account-hub-activity-origin">{
            (() => {
              const card = linkedCards.find(entry => entry.id === item.account_id);
              return card ? `${tr('Card')}${card.mask ? ` · •••• ${card.mask}` : ` · ${card.name}`}` : tr('Bank account');
            })()
          }</small>}
          <TransactionRow t={item} afterBalances={showBalanceAfterTransaction ? transactionBalances?.get(item.id) : undefined} show={show} onOpen={() => onOpenTransaction?.(item)} />
        </div>)}
        {!activityTransactions.length && <p className="empty">{tr('No transactions recorded for this account yet.')}</p>}
        {activityTransactions.length > activityLimit && <button type="button" className="secondary-button account-hub-more" onClick={() => setActivityLimit(limit => limit + 50)}>{tr('Show more transactions')} ({activityTransactions.length - activityLimit})</button>}
      </div>}
      {tab === 'connected' && <>
        {account.account_type !== 'card' && <section className="account-hub-section"><h3>{tr('Cards connected to this account')}</h3>
          {linkedCards.map(card => <button type="button" className="account-hub-linked" key={card.id} onClick={() => onOpenAccount?.(card.id)}><span><Icon name="card" size={18}/><b>{card.institution_name || card.name}</b></span><small>{tr(card.cardKind === 'credit' ? 'Credit card' : 'Debit card')} · {card.mask ? `•••• ${card.mask}` : tr('Card number not added')} · {accountActivityRows(transactions, [card.id]).length} {tr('transactions')}</small></button>)}
          {!linkedCards.length && <p className="empty">{tr('No cards connected to this account yet.')}</p>}
        </section>}
        <section className="account-hub-section account-allocated-funds" aria-label={tr('Allocated funds for goals and plans')}>
          <h3>{tr('Allocated funds for goals and plans')}</h3>
          {allocatedFundRows.length > 0 ? <>
            <div className="account-hub-metric"><span>{tr('Total allocated from this account')}</span><strong>{shown(show, money(allocatedFundTotal, base))}</strong></div>
            {allocatedFundRows.map(item => <div className="account-hub-simple-row" key={item.id}><span>{item.label}<small>{tr(item.source === 'plan' ? 'Plan' : 'Savings goal')} · {item.created_at ? new Date(item.created_at).toLocaleDateString() : tr('Allocated')}</small></span><b>{shown(show, money(item.amount, item.currency || currency))}</b></div>)}
          </> : goalAllocationReady ? <p className="empty">{tr('No funds from this account are allocated to goals or plans yet.')}</p> : <p className="form-note">{tr('Loading allocated funds…')}</p>}
        </section>
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
