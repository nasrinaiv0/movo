import React, { useState } from 'react';
import Icon from './Icon';
import { Sheet } from './ui';
import { LOYALTY_PROVIDERS, isLoyaltyType, normalizeLoyaltyCard } from '../lib/loyaltyCards';
import { t as tr } from '../lib/i18n';
import './LoyaltySheet.css';

export default function LoyaltySheet({ existing, initialType = 'membership', onSave, onRemove, onClose }) {
  const [form, setForm] = useState(() => ({
    id: existing?.id || '', type: isLoyaltyType(existing?.type) ? existing.type : initialType,
    name: existing?.name || '', program: existing?.program || '', cardType: existing?.cardType || '',
    memberNumber: existing?.memberNumber || '', barcode: existing?.barcode || '',
    points: existing?.points == null ? '' : String(existing.points),
    pointsUnit: existing?.pointsUnit || (initialType === 'tokens' ? 'tokens' : 'points'),
    noExpiry: existing?.noExpiry ?? !existing?.expiryDate,
    expiryDate: existing?.expiryDate || '',
    pointsExpiry: existing?.pointsExpiry || '',
    note: existing?.note || '',
  }));
  const [error, setError] = useState('');
  const [customProvider, setCustomProvider] = useState(Boolean(existing?.name && !LOYALTY_PROVIDERS.includes(existing.name)));
  const set = patch => { setForm(prev => ({ ...prev, ...patch })); setError(''); };
  const provider = customProvider ? 'Other' : LOYALTY_PROVIDERS.includes(form.name) ? form.name : '';
  const save = (event) => {
    event.preventDefault();
    try { onSave(normalizeLoyaltyCard(form)); }
    catch (err) { setError(err?.message === 'invalid_loyalty_points' ? tr('Enter valid points or tokens (up to 2 decimal places).')
      : err?.message === 'custom_card_type_required' ? tr('Enter the card type for Other.') : tr('Choose a provider.')); }
  };
  return <Sheet title={tr(existing ? 'Edit membership or rewards' : 'Add membership or rewards')} onClose={onClose} className="loyalty-sheet">
    <form className="loyalty-form" onSubmit={save}>
      <div className="loyalty-info"><Icon name="gift" size={20} /><span>{tr('Memberships, stamps and reward tokens are not money. They never increase your wallet balance.')}</span></div>
      <label className="loyalty-field"><span>{tr('Account type')}</span><select value={form.type} onChange={e => set({ type: e.target.value, pointsUnit: e.target.value === 'tokens' ? 'tokens' : 'points' })}>
        <option value="loyalty">{tr('Loyalty')}</option>
        <option value="membership">{tr('Membership')}</option>
        <option value="rewards">{tr('Rewards')}</option>
        <option value="tokens">{tr('Tokens')}</option>
        <option value="other">{tr('Other')}</option>
      </select></label>
      {form.type === 'other' && <label className="loyalty-field"><span>{tr('Custom card type')}</span><input aria-label={tr('Custom card type')} required value={form.cardType} maxLength={60} placeholder={tr('Enter card type if not listed')} onChange={e => set({ cardType: e.target.value })} /></label>}
      <label className="loyalty-field"><span>{tr('Brand / provider')}</span><select aria-label={tr('Brand / provider')} value={provider} onChange={e => { setCustomProvider(e.target.value === 'Other'); set({ name: e.target.value === 'Other' ? '' : e.target.value, program: e.target.value === 'Other' ? '' : e.target.value }); }} required={false}>
        <option value="">{tr('Choose a provider')}</option>
        {LOYALTY_PROVIDERS.map(name => <option key={name} value={name}>{name === 'Other' ? tr('Other / custom brand') : name}</option>)}
      </select></label>
      {(provider === 'Other') && <label className="loyalty-field"><span>{tr('Custom provider name')}</span><input aria-label={tr('Custom provider name')} value={form.name} maxLength={100} placeholder={tr('Enter provider or store name')} onChange={e => set({ name: e.target.value })} /></label>}
      <label className="loyalty-field"><span>{tr('Program (optional)')}</span><input value={form.program === form.name ? '' : form.program} maxLength={100} placeholder={tr('Rewards program name')} onChange={e => set({ program: e.target.value })} /></label>
      <label className="loyalty-field"><span>{tr('Membership number (optional)')}</span><input autoComplete="off" value={form.memberNumber} maxLength={100} placeholder={tr('Member ID / card number')} onChange={e => set({ memberNumber: e.target.value })} /></label>
      <div className="loyalty-two">
        <label className="loyalty-field"><span>{tr('Rewards balance')}</span><input inputMode="decimal" aria-label={tr('Rewards balance')} value={form.points} maxLength={18} placeholder="0" onChange={e => set({ points: e.target.value.replace(/[^0-9.]/g, '') })} /></label>
        <label className="loyalty-field"><span>{tr('Unit')}</span><select aria-label={tr('Unit')} value={form.pointsUnit} onChange={e => set({ pointsUnit: e.target.value })}><option value="points">{tr('Points')}</option><option value="tokens">{tr('Tokens')}</option><option value="stamps">{tr('Stamps')}</option><option value="vouchers">{tr('Vouchers')}</option></select></label>
      </div>
      <label className="loyalty-field"><span>{tr('Barcode / rewards code (optional)')}</span><input autoComplete="off" value={form.barcode} maxLength={160} placeholder={tr('Barcode or rewards code')} onChange={e => set({ barcode: e.target.value })} /></label>
      <label className="loyalty-check"><input type="checkbox" checked={form.noExpiry} onChange={e => set({ noExpiry: e.target.checked })} /><span>{tr('No expiry date')}</span></label>
      {!form.noExpiry && <label className="loyalty-field"><span>{tr('Membership expiry')}</span><input type="date" value={form.expiryDate} onChange={e => set({ expiryDate: e.target.value })} /></label>}
      <label className="loyalty-field"><span>{tr('Rewards expiry (optional)')}</span><input type="date" value={form.pointsExpiry} onChange={e => set({ pointsExpiry: e.target.value })} /></label>
      <label className="loyalty-field"><span>{tr('Notes (optional)')}</span><textarea rows="2" value={form.note} maxLength={300} onChange={e => set({ note: e.target.value })} placeholder={tr('Additional details')} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="loyalty-actions">{existing && <button type="button" className="loyalty-remove" onClick={() => { if (window.confirm(tr('Remove this membership or rewards card?'))) onRemove(existing.id); }}>{tr('Remove')}</button>}
        <button type="submit" className="primary-button">{tr(existing ? 'Save changes' : 'Add membership')}</button>
      </div>
    </form>
  </Sheet>;
}
