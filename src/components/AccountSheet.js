import React, { useMemo, useState } from 'react';
import Icon from './Icon';
import CardArt from './CardArt';
import AccountTile, { ACCOUNT_TYPES, ACCOUNT_COLORS, ACCOUNT_ICONS, typeMeta } from './AccountTile';
import { evaluate, press } from '../lib/calc';
import { CURRENCIES, currencyName } from '../lib/fx';
import { currencySymbol, getFormatLocale } from '../lib/format';
import { EmvChip, Contactless, CHIPS } from './EmvChip';
import { Sheet, Toggle } from './ui';
import { t as tr } from '../lib/i18n';
import { INSTITUTIONS, INSTITUTION_COUNTRIES, searchInstitutions, institutionLogoUrl } from '../lib/institutions';

const PAD = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '.', '0', '⌫', '+'];

/** Full-height add/edit account screen with a live preview card, as in the account setup design. */
export default function AccountSheet({ base = 'PHP', country = 'PH', form, setForm, editing, cloudMode, busy, error, onSave, onClose }) {
  const [openStyle, setOpenStyle] = useState(false);
  const [openMore, setOpenMore] = useState(!!form.institution_name);
  const [institutionQuery, setInstitutionQuery] = useState(form.institution_name || '');
  const [institutionCountry, setInstitutionCountry] = useState(INSTITUTION_COUNTRIES.includes(country) ? country : 'PH');
  const [manualInstitution, setManualInstitution] = useState(!!form.institution_name && !INSTITUTIONS.some(item => item.country === (INSTITUTION_COUNTRIES.includes(country) ? country : 'PH') && item.name.toLowerCase() === form.institution_name.toLowerCase()));
  const institutionOptions = useMemo(() => searchInstitutions(institutionCountry, institutionQuery, form.account_type), [institutionCountry, institutionQuery, form.account_type]);
  const hasNumber = form.account_type === 'card' || form.account_type === 'bank';
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
    <div className="acct-preview">{form.account_type === 'card' ? <CardArt a={{ id: 'preview', name: form.name.trim() || tr('Your card'), institution_name: form.institution_name || (form.cardKind === 'credit' ? 'Credit' : 'Debit'), mask: form.mask || '0000', balance: Number.isFinite(balance) ? balance : 0, currency: currency[0], brand: form.cardNetwork || 'blue', chip: form.chip, contactless: form.contactless, cardKind: form.cardKind }} show /> : <AccountTile a={{ name: form.name.trim() || 'Account preview', account_type: form.account_type, institution_name: form.institution_name, cardKind: form.cardKind, brand: form.brand, mask: hasNumber ? form.mask : '', balance: Number.isFinite(balance) ? balance : 0, currency: currency[0] }} style={{ color, icon }} size="preview" />}</div>

    <div className="acct-panel">
      <label className="acct-label" htmlFor="acct-type">{tr('Account type')}</label>
      <div className="acct-field select"><span><strong>{tr(meta.label)}</strong><small>{tr(meta.sub)}</small></span><span className="acct-field-icon" style={{ color }}><Icon name={meta.icon} size={18} /></span><Icon name="down" size={16} />
        <select id="acct-type" aria-label={tr('Account type')} value={form.account_type} onChange={e => set({ account_type: e.target.value })}>{ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{tr(t.label)}</option>)}</select></div>

      <label className="acct-label" htmlFor="acct-name">{tr('Account name')}</label>
      <input id="acct-name" className="acct-input" required maxLength="100" value={form.name} onChange={e => set({ name: e.target.value })} placeholder={tr('Account name (e.g. BPI, GCash, Cash)')} />

      <div className="acct-institution">
        <label className="acct-label" htmlFor="acct-inst-search">{tr('Bank / institution')}</label>
        <label className="search-field acct-institution-search"><Icon name="search" size={17} /><input id="acct-inst-search" autoComplete="off" value={manualInstitution ? form.institution_name : institutionQuery} onChange={e => { setInstitutionQuery(e.target.value); if (manualInstitution) set({ institution_name: e.target.value }); }} placeholder={tr('Search banks and providers')} aria-label={tr('Search banks and providers')} /></label>
        <label className="acct-label" htmlFor="acct-inst-country">{tr('Institution country')}</label>
        <select id="acct-inst-country" className="acct-input" value={institutionCountry} onChange={e => { setInstitutionCountry(e.target.value); setInstitutionQuery(''); const selected = INSTITUTIONS.find(item => item.name.toLowerCase() === (form.institution_name || '').toLowerCase()); if (selected && selected.country !== e.target.value) set({ institution_name: '' }); setManualInstitution(false); }}>
          {INSTITUTION_COUNTRIES.map(code => <option key={code} value={code}>{({ PH: 'Philippines', US: 'United States', GB: 'United Kingdom', CA: 'Canada', AU: 'Australia', SG: 'Singapore', IN: 'India' })[code]}</option>)}
        </select>
        {!manualInstitution && <div className="acct-institution-options" role="listbox" aria-label={tr('Matching institutions')}>
          {institutionOptions.map(item => <button type="button" role="option" aria-selected={form.institution_name === item.name} key={item.id} className={form.institution_name === item.name ? 'selected' : ''} onClick={() => { set({ institution_name: item.name }); setInstitutionQuery(item.name); setManualInstitution(false); }}>
            <span className="acct-institution-option-logo">{institutionLogoUrl(item.name) ? <img src={institutionLogoUrl(item.name)} alt="" width="32" height="32" loading="lazy" referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.display = 'none'; }} /> : <Icon name={item.kind === 'ewallet' ? 'phone' : 'bank'} size={20} />} </span><span><strong>{item.name}</strong><small>{item.kind === 'ewallet' ? tr('E-wallet') : tr('Bank')}</small></span>{form.institution_name === item.name && <Icon name="check" size={16} />}
          </button>)}
          {!institutionOptions.length && <p className="acct-hint">{tr('No matching institutions. Enter the name manually.')}</p>}
        </div>}
        <button type="button" className="acct-manual-toggle" onClick={() => { setManualInstitution(v => !v); setInstitutionQuery(''); if (!manualInstitution) set({ institution_name: form.institution_name || '' }); }} aria-pressed={manualInstitution}>{manualInstitution ? tr('Choose from institution list') : tr('Not listed? Enter institution manually')}</button>
        {manualInstitution && <input className="acct-input" maxLength="100" value={form.institution_name} onChange={e => set({ institution_name: e.target.value })} placeholder={tr('Enter bank or provider name')} aria-label={tr('Manual institution name')} />}
        <p className="acct-hint">{tr('Optional. Selecting an institution does not connect your bank or access financial data.')}</p>
      </div>

      {form.account_type === 'card' && <>
        <span className="acct-label">{tr('Card kind')}</span>
        <div className="seg-control two" role="group" aria-label={tr('Card kind')}>{[['debit', 'Debit'], ['credit', 'Credit']].map(([k, l]) => <button type="button" key={k} className={form.cardKind === k ? 'selected' : ''} aria-pressed={form.cardKind === k} onClick={() => set({ cardKind: k })}>{l}</button>)}</div>
        <label className="acct-label" htmlFor="acct-card-network">{tr('Card network')}</label>
        <select id="acct-card-network" className="acct-input" value={form.cardNetwork || ''} onChange={e => set({ cardNetwork: e.target.value })}>
          <option value="">{tr('Choose card network')}</option><option value="visa">Visa</option><option value="mastercard">Mastercard</option><option value="amex">American Express</option><option value="other">{tr('Other')}</option>
        </select>
        <span className="acct-label">{tr('Chip')}</span>
        <div className="chip-picks" role="radiogroup" aria-label={tr('Chip color')}>{CHIPS.map(([id, name]) => <button type="button" key={id} role="radio" aria-checked={form.chip === id} aria-label={`${name} chip`} className={form.chip === id ? 'on' : ''} onClick={() => set({ chip: id })}><EmvChip finish={id} /><span>{name}</span></button>)}</div>
        <div className="acct-field acct-toggle"><span className="acct-field-icon"><Contactless /></span><span><strong>{tr('Contactless symbol')}</strong><small>{tr('Show the tap-to-pay (RFID) mark on the card')}</small></span><Toggle checked={!!form.contactless} onChange={v => set({ contactless: v })} label={tr('Contactless symbol')} /></div>
      </>}
      {hasNumber && <>
        <label className="acct-label" htmlFor="acct-mask">{form.account_type === 'card' ? tr('Card number · last 4 digits') : tr('Account number · last 4 digits')}</label>
        <div className="acct-input acct-mask"><span aria-hidden="true">•••• •••• ••••</span><input id="acct-mask" inputMode="numeric" autoComplete="off" pattern="\d{4}" title={tr('Exactly 4 digits')} value={form.mask || ''} onChange={e => set({ mask: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="1234" aria-describedby="acct-mask-hint" /></div>
        <p className="acct-hint" id="acct-mask-hint">{form.account_type === 'card' ? tr('Optional. Only the last 4 digits, to tell your cards apart. Never enter a full number, CVV or PIN.') : tr('Optional. Only the last 4 digits, to tell your accounts apart. Never enter a full number, CVV or PIN.')}</p>
      </>}

      <label className="acct-label" htmlFor="acct-currency">{tr('Account currency')}</label>
      <div className="acct-field select"><span><strong>{currency[0]}</strong><small>{currency[1]}</small></span><span className="acct-field-icon" style={{ color }}>{currency[2]}</span><Icon name="chevron" size={16} />
        <select id="acct-currency" aria-label={tr('Account currency')} value={currency[0]} onChange={e => set({ currency: e.target.value })} disabled={editing && cloudMode}>{CURRENCIES.map(c => <option key={c} value={c}>{c} · {currencyName(c, getFormatLocale())}</option>)}</select></div>
      <p className="acct-hint">{tr('New accounts start in your home currency ({code}); change it here before saving.', { code: base })}</p>

      <div className={`acct-field acct-style${openStyle ? ' open' : ''}`}>
        <button type="button" className="acct-style-head" onClick={() => setOpenStyle(v => !v)} aria-expanded={openStyle}>
          <span className="acct-style-swatch" style={{ background: color }}><Icon name={icon} size={18} strokeWidth={2} /></span>
          <span><strong>{tr('Account style')}</strong><small>{tr('Custom icon and color')}</small></span><em>{tr('Edit')}</em><Icon name="down" size={16} />
        </button>
        {openStyle && <div className="acct-style-body">
          <div className="acct-swatches" role="radiogroup" aria-label={tr('Account color')}>{ACCOUNT_COLORS.map(c => <button type="button" key={c} role="radio" aria-checked={color === c} aria-label={tr('Color {value}', { value: c })} style={{ background: c }} onClick={() => set({ color: c })}>{color === c && <Icon name="check" size={14} strokeWidth={3} />}</button>)}</div>
          <div className="acct-icons" role="radiogroup" aria-label={tr('Account icon')}>{ACCOUNT_ICONS.map(i => <button type="button" key={i} role="radio" aria-checked={icon === i} aria-label={tr('Icon {value}', { value: i })} className={icon === i ? 'on' : ''} onClick={() => set({ icon: i })}><Icon name={i} size={18} /></button>)}</div>
        </div>}
      </div>

      <label className="acct-label" htmlFor="acct-balance">{editing ? tr('Opening balance') : tr('Starting balance')}</label>
      <div className="acct-input with-action">
        <input id="acct-balance" inputMode="decimal" value={form.opening_balance} onChange={e => set({ opening_balance: e.target.value.replace(/[^\d.+\-−×÷*/]/g, '').replace(/\*/g, '×').replace(/\//g, '÷') })} placeholder={tr('Starting balance (e.g. 5,000)')} />
        <button type="button" onClick={() => setPad(v => !v)} aria-label={pad ? tr('Hide calculator') : tr('Show calculator')} aria-pressed={pad}><Icon name="calc" size={18} /></button>
      </div>
      {pad && <div className="acct-pad">{PAD.map(k => <button type="button" key={k} className={/[÷×−+]/.test(k) ? 'op' : ''} onClick={() => set({ opening_balance: press(String(form.opening_balance || '').replace(/^0$/, ''), k) })}>{k === '⌫' ? <Icon name="backspace" size={18} /> : k}</button>)}<button type="button" className="eq" onClick={() => set({ opening_balance: Number.isFinite(balance) ? String(balance) : '' })}>=</button></div>}
      <p className="acct-hint">{tr('Your account\'s starting point before expenses, income, transfers and adjustments.')}</p>


      {!cloudMode && <p className="acct-hint">{tr('Stored on this device only. Sign in to sync it to your MOVO account.')}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
    <div className="tx-bottom"><button type="submit" className="primary-button acct-save" disabled={busy || !form.name.trim() || !Number.isFinite(balance)}>{busy ? tr('Saving…') : editing ? tr('Save changes') : tr('Add account')}</button></div>
  </form>}</Sheet>;
}
