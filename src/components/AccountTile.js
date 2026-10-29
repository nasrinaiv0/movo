import React from 'react';
import Icon from './Icon';
import { money, shown } from '../lib/format';

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
  const body = <>
    <span className="at-top">
      <span className="at-icon" aria-hidden="true"><Icon name={s.icon} size={size === 'grid' ? 16 : 20} strokeWidth={2} /></span>
      <span className="at-name">{a.name || 'Account preview'}{a.mask && <small className="at-mask">•••• {a.mask}</small>}</span>
      {size !== 'grid' && <span className="at-type">{typeMeta(a.account_type).label}</span>}
    </span>
    <span className="at-bottom">
      <small>{size === 'grid' ? typeMeta(a.account_type).label : 'Balance'}</small>
      <b>{shown(show, money(a.balance || 0, a.currency || 'PHP'))}</b>
    </span>
  </>;
  const cls = `account-tile at-${size}`;
  const css = { '--at': s.color };
  return onClick ? <button type="button" className={cls} style={css} onClick={onClick} aria-label={label || `${a.name}, ${typeMeta(a.account_type).label}`}>{body}</button> : <div className={cls} style={css}>{body}</div>;
}
