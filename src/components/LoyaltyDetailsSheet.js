import React, { useMemo, useState } from 'react';
import Icon from './Icon';
import { Sheet, TransactionRow } from './ui';
import LoyaltyCardFace from './LoyaltyCardFace';
import { estimateLoyaltyRewards, maskedMembershipNumber, safeLoyaltyPoints } from '../lib/loyaltyCards';
import { loyaltyTypeLabel } from '../lib/loyaltyBranding';
import { formatDate } from '../lib/format';
import { t as tr } from '../lib/i18n';

/*
 * Memberships, loyalty, rewards, tokens and custom cards open the same Account details layout as money accounts:
 * the card on top, then Account overview / Transactions / Connected items / More and the action row. Their figures
 * are rewards (points, stamps, tokens), never money, and never part of any balance.
 */
const TABS = [['overview', 'Account overview'], ['activity', 'Transactions'], ['connected', 'Connected items'], ['more', 'More']];
const fmtPoints = value => safeLoyaltyPoints(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
const dateText = value => (value ? formatDate(`${value}T12:00:00`, { year: 'numeric', month: 'short', day: 'numeric' }) : '');

export default function LoyaltyDetailsSheet({ card, transactions = [], accounts = [], rules = {}, show = true, onClose, onEdit, onRemove, onOpenAccount, onOpenTransaction, onOpenRewards }) {
  const [tab, setTab] = useState('overview');
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState('');
  const unit = card.pointsUnit || (card.type === 'tokens' ? 'tokens' : 'points');
  const rule = rules[card.id] || null;
  const earned = useMemo(() => estimateLoyaltyRewards(transactions, accounts, [card], rules)
    .map(entry => ({ ...entry, tx: transactions.find(t => t.id === entry.transactionId) }))
    .filter(entry => entry.tx)
    .sort((a, b) => String(b.date).localeCompare(String(a.date))), [transactions, accounts, card, rules]);
  const estimateTotal = Math.round(earned.reduce((sum, entry) => sum + entry.points, 0) * 100) / 100;
  const recentEstimate = Math.round(earned.filter(entry => {
    const at = Date.parse(entry.date); const age = Date.now() - at;
    return Number.isFinite(at) && age >= 0 && age <= 30 * 86400000;
  }).reduce((sum, entry) => sum + entry.points, 0) * 100) / 100;
  const earningAccount = rule?.accountId ? accounts.find(a => a.id === rule.accountId) : null;
  const value = text => (show ? text : '••••');
  const row = (label, content) => <div className="account-hub-metric" key={label}><span>{tr(label)}</span><strong>{content}</strong></div>;
  const code = card.memberNumber || card.barcode || '';
  const copy = async (text, what) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); window.setTimeout(() => setCopied(''), 1800); } catch { setCopied(''); }
  };
  const expiry = card.noExpiry || !card.expiryDate ? tr('No expiry date') : dateText(card.expiryDate);
  const rate = rule?.enabled
    ? (rule.rateMode === 'perBlock' ? `${fmtPoints(rule.pointsPerBlock)} ${tr(unit)} / ${rule.currency || ''} ${fmtPoints(rule.spendUnit)}` : `${fmtPoints(rule.pointsPer100)} ${tr(unit)} / ${rule.currency || ''} 100`)
    : '';
  const purchaseRow = entry => <div className="loyalty-earned-row" key={entry.id}>
    <TransactionRow t={entry.tx} show={show} onOpen={() => onOpenTransaction?.(entry.tx)} />
    <small className="loyalty-earned-points">{value(`+${fmtPoints(entry.points)}`)} {tr(entry.unit)} · {tr('Estimated')}</small>
  </div>;

  return <Sheet title={tr('Account details')} onClose={onClose} label={tr('Account details')} className="account-hub-sheet loyalty-hub-sheet">
    <div className="account-hub-hero loyalty-hub-hero"><LoyaltyCardFace card={card} show={show} estimate={estimateTotal} /></div>
    <div className="account-hub-tabs" role="tablist" aria-label={tr('Account sections')}>
      {TABS.map(([key, label]) => <button type="button" role="tab" key={key} aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{tr(label)}</button>)}
    </div>
    {tab === 'overview' && <>
      <div className="account-hub-metrics">
        {row('Rewards balance', <>{value(fmtPoints(card.points))} <small>{tr(unit)}</small></>)}
        {row('Earned · Last 30 days', <>{value(`+${fmtPoints(recentEstimate)}`)} <small>{tr(unit)}</small></>)}
        {row('Estimated from purchases', <>{value(`+${fmtPoints(estimateTotal)}`)} <small>{tr(unit)}</small></>)}
        {row('Membership expiry', expiry)}
      </div>
      {code && <section className="account-hub-section loyalty-code" aria-label={tr('Member code')}>
        <h3>{tr('Member code')}</h3>
        <div className="loyalty-code-box">
          <span className="loyalty-code-value">{revealed && show ? code : maskedMembershipNumber(code) || '••••'}</span>
          <span className="loyalty-code-actions">
            <button type="button" className="round-button" aria-label={tr(revealed ? 'Hide' : 'Show')} onClick={() => setRevealed(v => !v)}><Icon name="eye" size={16} /></button>
            <button type="button" className="round-button" aria-label={tr('Copy')} onClick={() => copy(code, 'code')}><Icon name={copied === 'code' ? 'check' : 'copy'} size={16} /></button>
          </span>
        </div>
        <p className="form-note">{tr('Memberships, stamps and reward tokens are not money. They never increase your wallet balance.')}</p>
      </section>}
      <div className="account-hub-section">
        <h3>{tr('Recent reward activity')}</h3>
        {earned.slice(0, 5).map(purchaseRow)}
        {!earned.length && <p className="empty">{tr(rule?.enabled ? 'No purchases have earned rewards yet.' : 'Set up how this card earns rewards to see purchases here.')}</p>}
      </div>
    </>}
    {tab === 'activity' && <div className="account-hub-section">
      <h3>{tr('Purchases that earned rewards')}</h3>
      {earned.map(purchaseRow)}
      {!earned.length && <p className="empty">{tr(rule?.enabled ? 'No purchases have earned rewards yet.' : 'Set up how this card earns rewards to see purchases here.')}</p>}
    </div>}
    {tab === 'connected' && <section className="account-hub-section"><h3>{tr('Earning account')}</h3>
      {earningAccount ? <button type="button" className="account-hub-linked" onClick={() => onOpenAccount?.(earningAccount.id)}>
        <span><Icon name={earningAccount.account_type === 'card' ? 'card' : 'wallet'} size={18} /><b>{earningAccount.institution_name || earningAccount.name}</b></span>
        <small>{[rule?.merchantContains ? `${tr('Merchant')}: ${rule.merchantContains}` : '', rate].filter(Boolean).join(' · ')}</small>
      </button> : <p className="empty">{tr('No account earns rewards for this card yet.')}</p>}
      {onOpenRewards && <button type="button" className="secondary-button wide-button" onClick={onOpenRewards}><Icon name="gift" size={16} />{tr('Rewards settings')}</button>}
    </section>}
    {tab === 'more' && <div className="detail-list">
      {row('Account display name', card.name)}
      {row('Account type', tr(loyaltyTypeLabel(card)))}
      {row('Program', card.program && card.program !== card.name ? card.program : '—')}
      {row('Membership number', card.memberNumber ? maskedMembershipNumber(card.memberNumber) : '—')}
      {row('Barcode / rewards code', card.barcode ? maskedMembershipNumber(card.barcode) : '—')}
      {row('Membership expiry', expiry)}
      {row('Rewards expiry', card.pointsExpiry ? dateText(card.pointsExpiry) : '—')}
      {card.note && row('Notes', card.note)}
    </div>}
    <div className="account-hub-actions">
      <button type="button" className="secondary-button" onClick={onEdit}><Icon name="edit" size={16} />{tr('Edit card')}</button>
      <button type="button" className="danger-button" onClick={() => { if (window.confirm(tr('Remove this membership or rewards card?'))) onRemove?.(card.id); }}><Icon name="trash" size={16} />{tr('Remove card')}</button>
      {code
        ? <button type="button" className="primary-button" onClick={() => copy(code, 'action')}><Icon name={copied === 'action' ? 'check' : 'copy'} size={16} />{tr(copied === 'action' ? 'Copied' : 'Copy member number')}</button>
        : <button type="button" className="primary-button" onClick={onEdit}><Icon name="plus" size={16} />{tr('Add member number')}</button>}
    </div>
  </Sheet>;
}
