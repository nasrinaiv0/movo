import React from 'react';
import Icon from './Icon';
import BrandLogo from './BrandLogo';
import { institutionLogoUrl } from '../lib/institutions';
import { t as tr } from '../lib/i18n';

/*
 * How accounts are named wherever one is chosen: the bank or wallet name, the card kind, and the last 4 digits
 * ("BPI · Debit •••• 1234"), grouped by kind (bank accounts, cards, e-wallets, cash, …) so two cards from the same
 * bank are easy to tell apart.
 */
const GROUPS = [['bank', 'Bank accounts'], ['card', 'Cards'], ['e_wallet', 'E-wallets'], ['cash', 'Cash'], ['investment', 'Investments']];
const TYPE_NAME = { bank: 'Bank account', e_wallet: 'E-wallet', cash: 'Cash', investment: 'Investment', other: 'Other' };
const ICON = { bank: 'bank', card: 'card', e_wallet: 'wallet', cash: 'wallet', investment: 'chart', other: 'layout' };

/** Bank/wallet name, adding the account's own name when it says more ("BPI Savings"). */
export function accountName(a) {
  const base = String(a?.institution_name || '').trim();
  const name = String(a?.name || '').trim();
  if (!base) return name || tr('Account');
  if (!name || name.toLowerCase().includes(base.toLowerCase())) return name || base;
  return base.toLowerCase().includes(name.toLowerCase()) ? base : `${base} ${name}`;
}

/** "Debit card" / "Credit card" / "E-wallet" / "Bank account"… */
export const accountKind = (a) => (a?.account_type === 'card' ? (a.cardKind === 'credit' ? tr('Credit card') : tr('Debit card')) : tr(TYPE_NAME[a?.account_type] || 'Other'));

const mask = (a) => (/^\d{4}$/.test(String(a?.mask || '')) ? `•••• ${a.mask}` : '');

/** One-line label for a dropdown option. */
export function accountOptionLabel(a, { currency = false } = {}) {
  const kind = a.account_type === 'card' ? ` · ${a.cardKind === 'credit' ? tr('Credit') : tr('Debit')}` : '';
  return `${accountName(a)}${kind}${mask(a) ? ` ${mask(a)}` : ''}${currency && a.currency ? ` · ${a.currency}` : ''}`;
}

/** <optgroup>s for a native select, in a fixed kind order; empty groups are left out. */
export function AccountOptions({ accounts = [], currency = false }) {
  const known = new Set(GROUPS.map(([k]) => k));
  const groups = [...GROUPS, ['other', 'Other']].map(([key, label]) => [label, accounts.filter(a => (key === 'other' ? !known.has(a.account_type) : a.account_type === key))]).filter(([, list]) => list.length);
  return groups.map(([label, list]) => <optgroup key={label} label={tr(label)}>{list.map(a => <option key={a.id} value={a.id}>{accountOptionLabel(a, { currency })}</option>)}</optgroup>);
}

/** A styled field that shows the chosen account (logo, name, kind, last 4) over a native, grouped select. */
export default function AccountPicker({ id, label, ariaLabel, accounts = [], value = '', onChange, required, placeholder }) {
  const chosen = accounts.find(a => a.id === value);
  const logo = chosen ? institutionLogoUrl(chosen.institution_name) || institutionLogoUrl(chosen.name) : '';
  return <label className={`acct-pick${chosen ? '' : ' is-empty'}`} htmlFor={id}>
    <span className="acct-pick-logo" aria-hidden="true"><BrandLogo src={logo} size={64} fallback={<Icon name={ICON[chosen?.account_type] || 'wallet'} size={18} />} /></span>
    <span className="acct-pick-text">
      <small>{label}</small>
      <strong>{chosen ? accountName(chosen) : (placeholder || tr('Choose account'))}</strong>
      {chosen && <em>{[accountKind(chosen), mask(chosen), chosen.currency].filter(Boolean).join(' · ')}</em>}
    </span>
    <Icon name="down" size={16} className="acct-pick-chevron" />
    <select id={id} aria-label={ariaLabel || label} required={required} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">{placeholder || tr('Choose account')}</option>
      <AccountOptions accounts={accounts} />
    </select>
  </label>;
}
