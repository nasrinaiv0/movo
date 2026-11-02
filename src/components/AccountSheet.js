import React, { useMemo, useState } from 'react';
import Icon from './Icon';
import CardArt from './CardArt';
import AccountTile, { ACCOUNT_TYPES, typeMeta } from './AccountTile';
import { evaluate, press } from '../lib/calc';
import { CURRENCIES, currencyName } from '../lib/fx';
import { currencySymbol, getFormatLocale } from '../lib/format';
import { EmvChip, Contactless, CHIPS } from './EmvChip';
import { Sheet, Toggle } from './ui';
import BrandLogo from './BrandLogo';
import { t as tr } from '../lib/i18n';
import { INSTITUTIONS, INSTITUTION_COUNTRIES, searchInstitutions, institutionLogoUrl } from '../lib/institutions';

const PAD = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '.', '0', '⌫', '+'];

/** Full-height add/edit account screen with a live preview card, as in the account setup design. */
export default function AccountSheet({ base = 'PHP', country = 'PH', form, setForm, accounts = [], editing, cloudMode, busy, error, onSave, onClose, onAddBank }) {
  const [openMore, setOpenMore] = useState(!!form.institution_name);
  const [institutionQuery, setInstitutionQuery] = useState(form.institution_name || '');
  const [institutionCountry, setInstitutionCountry] = useState(INSTITUTION_COUNTRIES.includes(country) ? country : 'PH');
  const [manualInstitution, setManualInstitution] = useState(!!form.institution_name && !INSTITUTIONS.some(item => item.country === (INSTITUTION_COUNTRIES.includes(country) ? country : 'PH') && item.name.toLowerCase() === form.institution_name.toLowerCase()));
  const institutionOptions = useMemo(() => searchInstitutions(institutionCountry, institutionQuery, form.account_type), [institutionCountry, institutionQuery, form.account_type]);
  const hasNumber = form.account_type === 'card' || form.account_type === 'bank';
  const bankAccounts = accounts.filter(account => account.account_type === 'bank' && !account.is_archived);
  const debitCard = form.account_type === 'card' && form.cardKind !== 'credit';
  const linkedBank = bankAccounts.find(account => account.id === form.linkedBankId);
  const [pad, setPad] = useState(false);
  const meta = typeMeta(form.account_type);
  const color = form.color || meta.color; const icon = form.icon || meta.icon;
  const balance = evaluate(String(form.opening_balance || '').replace(/[^\d.+−×÷]/g, '').replace(/-/g, '−'));
  const code = CURRENCIES.includes(form.currency) ? form.currency : base;
  const currency = [code, currencyName(code, getFormatLocale()), currencySymbol(code)];
  const label = editing ? 'Edit account' : 'Add account';
  const set = (patch) => setForm({ ...form, ...patch });

  return <Sheet label={label} onClose={onClose} hideClose className="acct-sheet">{(close) => <form className="acct-form" onSubmit={onSave}>
    <div className="acct-head"><button type="button" className="tx-round" onClick={close} aria-label={tr('Close {name}', { name: label })}><Icon name="back" size={18} /></button><h2>{editing ? tr('Edit Account') : tr('Add Account')}</h2><span className="tx-round ghost" /></div>
    <div className="acct-preview">{form.account_type === 'card' ? <CardArt a={{ id: 'preview', name: form.institution_name || form.name.trim() || tr('Your card'), institution_name: form.institution_name || form.name.trim() || tr('Your card'), mask: form.mask || '0000', balance: debitCard && linkedBank ? Number(linkedBank.balance || 0) : (Number.isFinite(balance) ? balance : 0), currency: currency[0], brand: form.cardNetwork || 'blue', chip: form.chip, contactless: form.contactless, cardKind: form.cardKind }} show /> : <AccountTile a={{ name: form.institution_name || form.name.trim() || tr(meta.label), account_type: form.account_type, institution_name: form.institution_name, cardKind: form.cardKind, brand: form.brand, mask: hasNumber ? form.mask : '', balance: Number.isFinite(balance) ? balance : 0, currency: currency[0] }} style={{ color, icon }} size="preview" />}</div>

    <div className="acct-panel">
      <label className="acct-label" htmlFor="acct-type">{tr('Account type')}</label>
      <div className="acct-field select"><span><strong>{tr(meta.label)}</strong><small>{tr(meta.sub)}</small></span><span className="acct-field-icon" style={{ color }}><Icon name={meta.icon} size={18} /></span><Icon name="down" size={16} />
        <select id="acct-type" aria-label={tr('Account type')} value={form.account_type} onChange={e => set({ account_type: e.target.value })}>{ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{tr(t.label)}</option>)}</select></div>

      {form.account_type !== 'card' && <div className="acct-institution">
        <label className="acct-label" htmlFor="acct-inst-search">{tr('Bank / institution')}</label>
        <label className="search-field acct-institution-search"><Icon name="search" size={17} /><input id="acct-inst-search" autoComplete="off" value={manualInstitution ? form.institution_name : institutionQuery} onChange={e => { setInstitutionQuery(e.target.value); if (manualInstitution) set({ institution_name: e.target.value, name: e.target.value }); }} placeholder={tr('Search banks and providers')} aria-label={tr('Search banks and providers')} /></label>
        <label className="acct-label" htmlFor="acct-inst-country">{tr('Institution country')}</label>
        <select id="acct-inst-country" className="acct-input acct-institution-country" value={institutionCountry} onChange={e => { setInstitutionCountry(e.target.value); setInstitutionQuery(''); const selected = INSTITUTIONS.find(item => item.name.toLowerCase() === (form.institution_name || '').toLowerCase()); if (selected && selected.country !== e.target.value) set({ institution_name: '' }); setManualInstitution(false); }}>
          {INSTITUTION_COUNTRIES.map(code => <option key={code} value={code}>{({ PH: 'Philippines', US: 'United States', GB: 'United Kingdom', CA: 'Canada', AU: 'Australia', SG: 'Singapore', IN: 'India' })[code]}</option>)}
        </select>
        {!manualInstitution && <div className="acct-institution-options" role="listbox" aria-label={tr('Matching institutions')}>
          {institutionOptions.map(item => <button type="button" role="option" aria-selected={form.institution_name === item.name} key={item.id} className={form.institution_name === item.name ? 'selected' : ''} onClick={() => { set({ institution_name: item.name, name: item.name }); setInstitutionQuery(item.name); setManualInstitution(false); }}>
            <span className="acct-institution-option-copy"><strong>{item.name}</strong><small>{item.kind === 'ewallet' ? tr('E-wallet') : tr('Bank')}</small></span><span className="acct-institution-option-trailing">{form.institution_name === item.name && <Icon name="check" size={16} />}<span className="acct-institution-option-logo">{institutionLogoUrl(item.name) ? <img src={institutionLogoUrl(item.name)} alt="" width="28" height="28" loading="lazy" referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.display = 'none'; }} /> : <Icon name={item.kind === 'ewallet' ? 'phone' : 'bank'} size={20} />}</span></span>
          </button>)}
          {!institutionOptions.length && <p className="acct-hint">{tr('No matching institutions. Enter the name manually.')}</p>}
        </div>}
        <button type="button" className="acct-manual-toggle" onClick={() => { setManualInstitution(v => !v); setInstitutionQuery(''); if (!manualInstitution) set({ institution_name: form.institution_name || '' }); }} aria-pressed={manualInstitution}>{manualInstitution ? tr('Choose from institution list') : tr('Not listed? Enter institution manually')}</button>
        {manualInstitution && <input className="acct-input" maxLength="100" value={form.institution_name} onChange={e => set({ institution_name: e.target.value, name: e.target.value })} placeholder={tr('Enter bank or provider name')} aria-label={tr('Manual institution name')} />}
      </div>}

      {form.account_type === 'card' && <>
        <span className="acct-label">{tr('Card kind')}</span>
        <div className="seg-control two" role="group" aria-label={tr('Card kind')}>{[['debit', 'Debit'], ['credit', 'Credit']].map(([k, l]) => <button type="button" key={k} className={form.cardKind === k ? 'selected' : ''} aria-pressed={form.cardKind === k} onClick={() => set({ cardKind: k })}>{l}</button>)}</div>
        <label className="acct-label" htmlFor="acct-linked-bank">{debitCard ? tr('Linked bank account') : tr('Issuing bank')}</label>
        {bankAccounts.length ? <div className="acct-field select acct-bank-pick">
          <span><strong>{linkedBank ? (linkedBank.institution_name || linkedBank.name) : tr('Choose a bank account')}</strong><small>{linkedBank ? `${linkedBank.name} · ${linkedBank.currency || base}` : debitCard ? tr('Shares this bank account’s balance') : tr('Optional')}</small></span>
          <span className="acct-bank-logo" aria-hidden="true"><BrandLogo src={linkedBank ? institutionLogoUrl(linkedBank.institution_name || linkedBank.name) : ''} size={64} fallback={<Icon name="bank" size={18} />} /></span>
          <Icon name="down" size={16} />
          <select id="acct-linked-bank" aria-label={debitCard ? tr('Linked bank account') : tr('Issuing bank')} value={form.linkedBankId || ''} required={debitCard} onChange={e => {
            if (e.target.value === '__add') { onAddBank?.(); return; }
            const selected = bankAccounts.find(account => account.id === e.target.value);
            const inst = selected ? (selected.institution_name || selected.name) : '';
            set({ linkedBankId: e.target.value, institution_name: inst, name: inst, ...(selected?.currency ? { currency: selected.currency } : {}) });
          }}>
            <option value="">{tr('Choose a bank account')}</option>
            {bankAccounts.map(account => <option key={account.id} value={account.id}>{account.institution_name || account.name} · {account.name} ({account.currency || base})</option>)}
            {onAddBank && <option value="__add">{tr('+ Add a bank account')}</option>}
          </select>
        </div> : <button type="button" className="acct-field acct-add-bank" onClick={() => onAddBank?.()}><span><strong>{tr('Add a bank account')}</strong><small>{debitCard ? tr('A debit card uses its bank account’s balance') : tr('Optional for credit cards')}</small></span><span className="acct-bank-logo"><Icon name="plus" size={18} /></span><Icon name="chevron" size={16} /></button>}
        <span className="acct-label">{tr('Card network')}</span>
        <div className="acct-network-row" role="group" aria-label={tr('Card network')}>
          {[['visa', 'Visa'], ['mastercard', 'Mastercard'], ['amex', 'Amex'], ['discover', 'Discover'], ['other', tr('Other')]].map(([value, name]) => <button type="button" key={value} className={`acct-net net-${value}${(form.cardNetwork || '') === value ? ' selected' : ''}`} aria-pressed={(form.cardNetwork || '') === value} aria-label={name} onClick={() => set({ cardNetwork: value })}>
            <span className="acct-net-mark" aria-hidden="true">{value === 'mastercard' ? <><i /><i /></> : value === 'visa' ? 'VISA' : value === 'amex' ? 'AMEX' : value === 'discover' ? <><b>D</b><i /></> : '—'}</span>
            <small>{name}</small>
          </button>)}
        </div>
      </>}
      {hasNumber && <>
        <label className="acct-label" htmlFor="acct-mask">{form.account_type === 'card' ? tr('Card number · last 4 digits') : tr('Account number · last 4 digits')}</label>
        <div className="acct-input acct-mask"><span aria-hidden="true">•••• •••• ••••</span><input id="acct-mask" inputMode="numeric" autoComplete="off" pattern="\d{4}" title={tr('Exactly 4 digits')} value={form.mask || ''} onChange={e => set({ mask: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="1234" aria-describedby="acct-mask-hint" /></div>
        <p className="acct-hint" id="acct-mask-hint">{tr('Optional. Last 4 digits only — never a full number, CVV or PIN.')}</p>
      </>}

      {!debitCard && <>
      <label className="acct-label" htmlFor="acct-currency">{tr('Account currency')}</label>
      <div className="acct-field select"><span><strong>{currency[0]}</strong><small>{currency[1]}</small></span><span className="acct-field-icon" style={{ color }}>{currency[2]}</span><Icon name="chevron" size={16} />
        <select id="acct-currency" aria-label={tr('Account currency')} value={currency[0]} onChange={e => set({ currency: e.target.value })} disabled={editing && cloudMode}>{CURRENCIES.map(c => <option key={c} value={c}>{c} · {currencyName(c, getFormatLocale())}</option>)}</select></div>

      </>}
      {!debitCard && <>
      <label className="acct-label" htmlFor="acct-balance">{editing ? tr('Opening balance') : tr('Starting balance')}</label>
      <div className="acct-input with-action">
        <input id="acct-balance" inputMode="decimal" value={form.opening_balance} onChange={e => set({ opening_balance: e.target.value.replace(/[^\d.+\-−×÷*/]/g, '').replace(/\*/g, '×').replace(/\//g, '÷') })} placeholder={tr('Starting balance (e.g. 5,000)')} />
        <button type="button" onClick={() => setPad(v => !v)} aria-label={pad ? tr('Hide calculator') : tr('Show calculator')} aria-pressed={pad}><Icon name="calc" size={18} /></button>
      </div>
      {pad && <div className="acct-pad">{PAD.map(k => <button type="button" key={k} className={/[÷×−+]/.test(k) ? 'op' : ''} onClick={() => set({ opening_balance: press(String(form.opening_balance || '').replace(/^0$/, ''), k) })}>{k === '⌫' ? <Icon name="backspace" size={18} /> : k}</button>)}<button type="button" className="eq" onClick={() => set({ opening_balance: Number.isFinite(balance) ? String(balance) : '' })}>=</button></div>}
      </>}


      {form.account_type === 'card' && <>
        <span className="acct-label">{tr('Chip')}</span>
        <div className="chip-picks" role="radiogroup" aria-label={tr('Chip color')}>{CHIPS.map(([id, name]) => <button type="button" key={id} role="radio" aria-checked={form.chip === id} aria-label={`${name} chip`} className={form.chip === id ? 'on' : ''} onClick={() => set({ chip: id })}><EmvChip finish={id} /><span>{name}</span></button>)}</div>
        <div className="acct-field acct-toggle"><span className="acct-field-icon"><Contactless /></span><span><strong>{tr('Contactless symbol')}</strong><small>{tr('Show the tap-to-pay (RFID) mark on the card')}</small></span><Toggle checked={!!form.contactless} onChange={v => set({ contactless: v })} label={tr('Contactless symbol')} /></div>
      </>}
      {!cloudMode && <p className="acct-hint">{tr('Stored on this device only. Sign in to sync it to your MOVO account.')}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
    <div className="tx-bottom"><button type="submit" className="primary-button acct-save" disabled={busy || !Number.isFinite(balance) || (debitCard && !bankAccounts.some(account => account.id === form.linkedBankId))}>{busy ? tr('Saving…') : editing ? tr('Save changes') : tr('Add account')}</button></div>
  </form>}</Sheet>;
}
