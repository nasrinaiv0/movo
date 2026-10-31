import React from 'react';
import Icon from './Icon';
import { money, shown } from '../lib/format';
import { t as tr } from '../lib/i18n';

const INSTITUTION_DOMAINS = {
  'bdo unibank': 'bdo.com.ph', bdo: 'bdo.com.ph', bpi: 'bpi.com.ph', metrobank: 'metrobank.com.ph',
  'land bank of the philippines': 'landbank.com', landbank: 'landbank.com', 'philippine national bank': 'pnb.com.ph', pnb: 'pnb.com.ph',
  unionbank: 'unionbankph.com', 'union bank of the philippines': 'unionbankph.com', 'security bank': 'securitybank.com',
  chinabank: 'chinabank.ph', rcbc: 'rcbc.com', gcash: 'gcash.com', maya: 'maya.ph',
  chase: 'chase.com', 'bank of america': 'bankofamerica.com', 'wells fargo': 'wellsfargo.com', citibank: 'citi.com',
  barclays: 'barclays.co.uk', 'hsbc uk': 'hsbc.co.uk', monzo: 'monzo.com', 'rbc royal bank': 'rbc.com',
  'td canada trust': 'td.com', 'commonwealth bank': 'commbank.com.au', westpac: 'westpac.com.au', nab: 'nab.com.au',
  anz: 'anz.com', 'dbs / posb': 'dbs.com.sg', ocbc: 'ocbc.com', uob: 'uob.com.sg',
  'state bank of india': 'sbi.co.in', 'hdfc bank': 'hdfcbank.com', 'icici bank': 'icicibank.com', 'axis bank': 'axisbank.com',
};
const institutionDomain = (name) => INSTITUTION_DOMAINS[String(name || '').trim().toLowerCase()] || null;


export const ACCOUNT_TYPES = [
  { value: 'bank', label: 'Bank account', sub: 'Savings or checking', icon: 'bank', color: '#2f5fd0' },
  { value: 'card', label: 'Card', sub: 'Credit or debit card', icon: 'card', color: '#3b3f4a' },
  { value: 'e_wallet', label: 'E-wallet', sub: 'GCash, Maya and others', icon: 'phone', color: '#0f8f84' },
  { value: 'cash', label: 'Cash', sub: 'Cash on hand', icon: 'wallet', color: '#5e8c61' },
  { value: 'investment', label: 'Investment', sub: 'Stocks, funds, crypto', icon: 'chart', color: '#7c4dff' },
  { value: 'other', label: 'Other', sub: 'Anything else you track', icon: 'coin', color: '#8a6d3b' },
];
export const ACCOUNT_COLORS = ['#5e8c61', '#2f5fd0', '#0f8f84', '#7c4dff', '#c8323f', '#d97706', '#3b3f4a', '#0e7490', '#be185d', '#8a6d3b'];
export const ACCOUNT_ICONS = ['wallet', 'bank', 'card', 'phone', 'coin', 'chart', 'briefcase', 'gift', 'diamond', 'star'];
export const typeMeta = (type) => ACCOUNT_TYPES.find(t => t.value === type) || ACCOUNT_TYPES[5];
export const styleFor = (a, styles = {}) => ({ color: styles[a.id]?.color || typeMeta(a.account_type).color, icon: styles[a.id]?.icon || typeMeta(a.account_type).icon });

/** Solid account card: icon, name, type and balance. Used for list tiles, grid tiles and the add-account preview. */
export default function AccountTile({ a, show = true, style, size = 'tile', onClick, label }) {
  const s = style || styleFor(a);
  const institutionSite = institutionDomain(a.institution_name);
  const network = /mastercard/i.test(String(a.brand || '') + ' ' + String(a.name || '')) ? 'mastercard.com' : /visa/i.test(String(a.brand || '') + ' ' + String(a.name || '')) ? 'visa.com' : null;
  const body = <>
    <span className="at-top">
      <span className="at-icon" aria-hidden="true">{institutionSite ? <img className="at-institution-logo" src={'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(institutionSite) + '&sz=128'} alt="" width={size === 'grid' ? 24 : 32} height={size === 'grid' ? 24 : 32} loading="lazy" referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.display = 'none'; }} /> : <Icon name={s.icon} size={size === 'grid' ? 16 : 20} strokeWidth={2} />}</span>
      <span className="at-name">{a.institution_name && <span className="at-institution-name">{a.institution_name}</span>}{a.name || tr('Account preview')}{a.mask && <small className="at-mask">•••• {a.mask}</small>}</span>
      {size !== 'grid' && <span className="at-type">{a.account_type === 'card' && a.cardKind ? (a.cardKind === 'credit' ? tr('Credit') : tr('Debit')) : tr(typeMeta(a.account_type).label)}</span>}
    </span>
    <span className="at-bottom">
      <small>{size === 'grid' ? tr(typeMeta(a.account_type).label) : tr('Balance')}</small>
      <b>{shown(show, money(a.balance || 0, a.currency || 'PHP'))}</b>
    </span>
  </>;
  const cls = `account-tile at-${size}`;
  const css = { '--at': s.color };
  return onClick ? <button type="button" className={cls} style={css} onClick={onClick} aria-label={label || `${a.name}, ${tr(typeMeta(a.account_type).label)}`}>{body}</button> : <div className={cls} style={css}>{body}</div>;
}
