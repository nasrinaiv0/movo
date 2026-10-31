import React, { useEffect, useRef, useState } from 'react';
import Icon, { NasrinMark } from '../components/Icon';
import { SubHeader, Toggle, Sheet } from '../components/ui';
import { t as tr } from '../lib/i18n';
import { longDate, money } from '../lib/format';
import { countryName } from '../lib/regions';
import { SCENERIES, PHOTO, toSceneryPhoto } from '../lib/scenery';
import { enablePush, pushSupported } from '../lib/alerts';
import { lockState, setPasscode, removeLock, validPasscode, biometricAvailable, enableBiometric, disableBiometric, verifyPasscode } from '../lib/appLock';

export const ACCENTS = [['green', '#13b45f'], ['blue', '#2f6bff'], ['purple', '#7c4dff'], ['orange', '#ff8a1f'], ['red', '#ef4444'], ['slate', '#334155']];
export const THEMES = [
  ['system', 'System (Default)', 'Follows your device setting', 'contrast'],
  ['light', 'Light', 'Clean and minimal', 'sun'],
  ['dark', 'Dark', 'Bold and modern', 'moon'],
  ['blue', 'Blue', 'Calm and focused', 'palette'],
  ['purple', 'Purple', 'Creative and fresh', 'palette'],
  ['orange', 'Orange', 'Warm and energetic', 'palette'],
];
const SEGMENTS = [['light', 'Light', 'sun'], ['dark', 'Dark', 'moon'], ['system', 'System', 'contrast'], ['custom', 'Custom', 'palette']];
const segmentOf = (theme) => (['blue', 'purple', 'orange'].includes(theme) ? 'custom' : theme);
const settingDescriptionId = (title) => `setting-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-description`;

export function applyTheme(c, theme) {
  c.setPref('theme', theme);
  if (['blue', 'purple', 'orange'].includes(theme)) c.setPref('accent', theme);
}

export function ThemePicker({ c, compact }) {
  const { prefs, setPref } = c;
  const current = segmentOf(prefs.theme);
  return <>
    <section className="theme-segments" role="radiogroup" aria-label={tr('App appearance')}>
      {SEGMENTS.map(([key, label, icon]) => <button type="button" key={key} role="radio" aria-checked={current === key} className={current === key ? 'selected' : ''}
        onClick={() => (key === 'custom' ? c.setSheet({ name: 'themes' }) : applyTheme(c, key))}>
        <span className={`seg-art seg-${key}`}><Icon name={icon} size={compact ? 22 : 26} /></span>{tr(label)}{current === key && <i className="check-badge"><Icon name="check" size={11} strokeWidth={3} /></i>}
      </button>)}
    </section>
    <h3 className="mini-title">{compact ? tr('App Theme Color') : tr('Accent Color')}</h3>
    <div className="accent-row" role="radiogroup" aria-label={tr('Accent color')}>
      {ACCENTS.map(([key, color]) => <button type="button" key={key} role="radio" aria-checked={prefs.accent === key} aria-label={tr('{name} accent', { name: tr(key[0].toUpperCase() + key.slice(1)) })} className={prefs.accent === key ? 'selected' : ''} style={{ '--dot': color }} onClick={() => setPref('accent', key)}>{prefs.accent === key && <Icon name="check" size={16} strokeWidth={3} />}</button>)}
    </div>
  </>;
}

export function ThemeSheet({ c }) {
  const { prefs } = c;
  return <Sheet title={tr('Choose Theme')} subtitle={tr('Personalize your app experience.')} onClose={() => c.setSheet(null)}>
    <div className="theme-list">
      {THEMES.map(([key, name, sub]) => <button type="button" key={key} className={`theme-option${prefs.theme === key ? ' selected' : ''}`} onClick={() => { applyTheme(c, key); c.setSheet(null); }} role="radio" aria-checked={prefs.theme === key}>
        <span className={`theme-art art-${key}`} /><span className="account-main"><strong>{tr(name)}</strong><small>{tr(sub)}</small></span>
        <span className="radio">{prefs.theme === key && <Icon name="check" size={13} strokeWidth={3} />}</span>
      </button>)}
    </div>
    <label className="custom-color"><span>{tr('Custom accent')}</span><input type="color" aria-label={tr('Custom accent color')} value={prefs.customColor} onChange={e => { c.setPref('customColor', e.target.value); c.setPref('accent', 'custom'); }} /></label>
  </Sheet>;
}

export function NavPreview({ accentName }) {
  return <div className={`nav-preview accent-${accentName}`} aria-label={tr('Navigation preview')}>
    {[['home', true], ['wallet'], ['spark'], ['list'], ['user']].map(([icon, on], i) => i === 2
      ? <span key="orb" className="orb small"><NasrinMark size={22} /></span>
      : <span key={icon} className={on ? 'on' : ''}><Icon name={icon} size={22} strokeWidth={1.8} filled={on} /></span>)}
  </div>;
}

function Row({ icon, title, sub, right, onClick, chevron = true, danger, status }) {
  const Tag = onClick ? 'button' : 'div';
  const descriptionId = sub ? settingDescriptionId(title) : undefined;
  return <Tag type={onClick ? 'button' : undefined} aria-disabled={!onClick && status ? 'true' : undefined} className={`menu-row${danger ? ' danger' : ''}${status ? ' unavailable-row' : ''}`} onClick={onClick}>
    <span className="menu-icon bare"><Icon name={icon} size={20} /></span>
    <span className="menu-main"><strong>{tr(title)}</strong>{sub && <small id={descriptionId}>{tr(sub)}</small>}</span>{right}{status && <span className="pill tone-gray">{tr(status)}</span>}{chevron && onClick && <Icon name="chevron" size={16} />}
  </Tag>;
}


/** Approximate space MOVO uses in this browser's storage. */
export function storageUsed() {
  try { return Object.keys(localStorage).filter(k => k.startsWith('movo.')).reduce((n, k) => n + k.length + (localStorage.getItem(k) || '').length, 0) * 2; } catch { return 0; }
}
const fmtBytes = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** Turns browser alerts on (asking permission) or off; explains when the browser says no. */
export async function togglePush(c, on) {
  if (!on) { c.setPref('push', false); return; }
  const result = await enablePush();
  if (result === 'granted') { c.setPref('push', true); c.notify(tr('Alerts are on for this device.')); }
  else if (result === 'unsupported') c.notify(tr('This browser cannot show alerts. On iPhone, add Movo to your Home Screen first.'));
  else c.notify(tr('Alerts are blocked in your browser settings for this site.'));
}

/** Set, change or remove the app-lock passcode. */
function LockSheet({ c, onClose }) {
  const state = lockState();
  const [step, setStep] = useState(state.enabled ? 'current' : 'new');
  const [pin, setPin] = useState('');
  const [first, setFirst] = useState('');
  const [error, setError] = useState('');
  const next = async (e) => {
    e.preventDefault(); setError('');
    if (step === 'current') { if (await verifyPasscode(pin)) { setStep('manage'); setPin(''); } else setError(tr('Wrong passcode. Try again.')); return; }
    if (!validPasscode(pin)) { setError(tr('Use 4 to 6 digits.')); return; }
    if (step === 'new') { setFirst(pin); setPin(''); setStep('confirm'); return; }
    if (pin !== first) { setError(tr('The passcodes do not match.')); setPin(''); setStep('new'); return; }
    await setPasscode(pin); c.notify(tr('App lock is on.')); onClose();
  };
  if (step === 'manage') return <Sheet center title={tr('App Lock')} onClose={onClose} label={tr('App Lock')}>
    <div className="sheet-list">
      <button type="button" className="sheet-card" onClick={() => setStep('new')}><span className="account-main"><strong>{tr('Change passcode')}</strong></span></button>
      <button type="button" className="sheet-card danger-text" onClick={() => { removeLock(); c.notify(tr('App lock is off.')); onClose(); }}><span className="account-main"><strong>{tr('Turn off app lock')}</strong></span></button>
    </div>
  </Sheet>;
  const title = step === 'current' ? tr('Enter current passcode') : step === 'confirm' ? tr('Confirm passcode') : tr('Choose a passcode');
  return <Sheet center title={tr('App Lock')} subtitle={tr('Locks Movo on this device when you open it or come back after a minute. It does not encrypt your records.')} onClose={onClose} label={tr('App Lock')}>
    <form className="sheet-form" onSubmit={next}>
      <label>{title}<input type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]*" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus aria-label={title} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="sheet-actions"><button type="button" className="secondary-button" onClick={onClose}>{tr('Cancel')}</button><button type="submit" className="primary-button">{step === 'confirm' ? tr('Turn on') : tr('Continue')}</button></div>
    </form>
  </Sheet>;
}

/** Plan & Usage: what this account uses in Movo. No paid plan is sold in this build. */
function UsageSheet({ c, onClose }) {
  const rows = [
    [tr('Plan'), c.cloudMode ? tr('Free · cloud sync') : tr('Free · this device only')],
    [tr('Transactions'), String(c.txs?.length || 0)],
    [tr('Accounts'), String(c.accountsView?.length || 0)],
    [tr('Subscriptions tracked'), String(c.subscriptions?.length || 0)],
    [tr('Storage on this device'), fmtBytes(storageUsed())],
  ];
  return <Sheet center title={tr('Plan & Usage')} subtitle={tr('Movo is free. There is no paid plan or billing in this version.')} onClose={onClose} label={tr('Plan & Usage')}>
    <dl className="detail-list">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
  </Sheet>;
}

export default function Settings({ c }) {
  const { prefs, setPref, go, query, setQuery } = c;
  const [panel, setPanel] = useState('');
  const [bio, setBio] = useState(false);
  const [, rerender] = useState(0);
  useEffect(() => { biometricAvailable().then(setBio); }, []);
  const lock = lockState();
  const pushOn = !!prefs.push && typeof Notification !== 'undefined' && Notification.permission === 'granted';
  const toggleValue = (key) => (key === 'push' ? pushOn : key === 'biometrics' ? lock.biometric : key === 'email' ? false : key === 'cloudSync' ? c.cloudMode : prefs[key] !== false && !!prefs[key]);
  const toggleDisabled = (key) => (key === 'email' || (key === 'push' && !pushSupported()) || (key === 'biometrics' && (!bio || !lock.enabled)) || (key === 'cloudSync' && c.cloudMode));
  const toggleChange = async (key, v) => {
    if (key === 'push') return togglePush(c, v);
    if (key === 'biometrics') {
      try { if (v) { await enableBiometric(); c.notify(tr('Face ID / Touch ID can now unlock Movo.')); } else disableBiometric(); } catch { c.notify(tr('Face ID / Touch ID was not set up.')); }
      return rerender(n => n + 1);
    }
    if (key === 'cloudSync' && !c.cloudMode) return go('Sign in');
    return setPref(key, v);
  };
  const sections = [
    { title: tr('Account'), rows: [
      { icon: 'user', title: tr('Profile'), sub: tr('Personal information'), onClick: () => go('EditProfile') },
      { icon: 'database', title: tr('Plan & Usage'), sub: tr('Free plan · see what you use'), onClick: () => setPanel('usage') },
      { icon: 'layout', title: tr('Connected Accounts'), sub: tr('Manually tracked accounts; no bank connection is active.'), onClick: () => go('Wallet') },
    ] },
    { title: tr('Appearance'), rows: [
      { icon: 'palette', title: tr('Theme'), sub: tr('Light, Dark or Custom'), onClick: () => go('Appearance') },
      { icon: 'drop', title: tr('Liquid Glass'), sub: tr('Choose how clear the glass looks'), onClick: () => go('Appearance') },
      { icon: 'pin', title: tr('Country or region'), sub: c.country ? countryName(c.country, c.lang?.locale) : tr('Not set'), onClick: () => c.openCountry?.() },
      { icon: 'globe', title: tr('Language'), sub: c.lang?.name || 'English', onClick: () => c.openLanguage?.() },
      { icon: 'coin', title: tr('Home Currency'), sub: `${c.base || 'PHP'} · totals, budgets and charts`, onClick: () => c.openCurrency?.() },
      { icon: 'layout', title: tr('Display & Layout'), sub: tr('Customize your experience'), onClick: () => go('Appearance') },
    ] },
    { title: tr('Notifications'), rows: [
      { icon: 'bell', title: tr('Push Notifications'), sub: pushSupported() ? tr('Alerts on this device for renewals, limits and monthly reports.') : tr('This browser cannot show alerts. On iPhone, add Movo to your Home Screen first.'), toggle: 'push' },
      { icon: 'mail', title: tr('Email Notifications'), sub: tr('Not available yet; MOVO does not send email alerts.'), toggle: 'email' },
      { icon: 'message', title: tr('In-App Alerts'), sub: tr('Show or hide the in-app notification feed.'), toggle: 'inapp' },
      { icon: 'spark', title: tr('Daily NasrinAI briefing'), sub: tr('A summary and money tips once a day when you open MOVO.'), toggle: 'briefing' },
    ] },
    { title: tr('Security & Privacy'), rows: [
      { icon: 'lock', title: tr('App Lock'), sub: lock.enabled ? tr('On · passcode required to open Movo') : tr('Off · require a passcode to open Movo'), onClick: () => setPanel('lock') },
      { icon: 'face', title: tr('Face ID / Touch ID'), sub: !bio ? tr('This device or browser does not offer Face ID / Touch ID.') : lock.enabled ? tr('Unlock Movo with your face or fingerprint.') : tr('Turn on App Lock first.'), toggle: 'biometrics' },
      { icon: 'shield', title: tr('Privacy & Data'), sub: tr('Read how MOVO handles your information'), onClick: () => c.openLegal?.('PrivacyPolicy') },
      { icon: 'trash', title: tr('Clear All Data'), sub: c.cloudMode ? 'Delete all activity and data on this device and in your MOVO account' : 'Delete all activity and data stored on this device', onClick: () => c.setSheet({ name: 'clear' }), danger: true },
    ] },
    { title: tr('Data & Sync'), rows: [
      { icon: 'cloud', title: tr('Cloud Sync'), sub: c.cloudMode ? tr('Cloud sync is active for your signed-in account.') : tr('Sign in to enable secure cloud sync.'), onClick: c.cloudMode ? undefined : () => go('Sign in'), status: c.cloudMode ? undefined : tr('Sign in required') },
      { icon: 'database', title: tr('Local Storage'), sub: tr('{size} used on this device · {n} records', { size: fmtBytes(storageUsed()), n: c.txs?.length || 0 }) },
      { icon: 'refresh', title: tr('Auto Categorization'), sub: tr('Picks a category from the description as you type; you can always change it.'), toggle: 'autocat' },
    ] },
    { title: tr('Automatic Logging'), rows: [
      { icon: 'refresh', title: tr('Auto-log Apple Pay & Google Pay'), sub: tr('When on, payments from your phone automation are logged instantly; when off, MOVO asks you to confirm each one.'), toggle: 'autoLog' },
      { icon: 'link', title: tr('Set Up Phone Automation'), sub: tr('Connect an iPhone Shortcuts or Android automation to MOVO'), onClick: () => c.openAutoLog?.() },
      { icon: 'scan', title: tr('Receipt Scanner'), sub: tr('Scan receipts and payment screenshots; see your scan log'), onClick: () => c.openScanner?.() },
    ] },
    { title: tr('Help & Support'), rows: [
      { icon: 'help', title: tr('Help Center'), sub: tr('Answers about transactions, storage, privacy, and NasrinAI.'), onClick: () => go('HelpCenter') },
    ] },
    { title: tr('Legal'), rows: [
      { icon: 'doc', title: tr('Terms of Service'), sub: tr('Rules for using MOVO'), onClick: () => c.openLegal?.('TermsOfService') },
      { icon: 'shield', title: tr('Privacy Policy'), sub: tr('How MOVO handles your information'), onClick: () => c.openLegal?.('PrivacyPolicy') },
    ] },
  ];
  const q = query.trim().toLowerCase();
  const shown = sections.map(s => ({ ...s, rows: s.rows.filter(r => !q || `${r.title} ${r.sub}`.toLowerCase().includes(q)) })).filter(s => s.rows.length);
  return <>
    <SubHeader title={tr('Settings')} onBack={() => go('Menu')} />
    <label className="search-field"><Icon name="search" size={18} /><input aria-label={tr('Search settings')} placeholder={tr('Search settings')} value={query} onChange={e => setQuery(e.target.value)} /></label>
    {shown.map(s => <section key={s.title}><h2 className="group-title">{tr(s.title)}</h2>
      <div className="card menu-card">{s.rows.map(r => <Row key={r.title} {...r} right={r.toggle ? <Toggle checked={toggleValue(r.toggle)} onChange={v => toggleChange(r.toggle, v)} label={r.title} describedBy={settingDescriptionId(r.title)} disabled={toggleDisabled(r.toggle)} reason={r.toggle === 'cloudSync' ? tr('Cloud sync follows your signed-in account; sign out to use local-only mode.') : r.toggle === 'email' ? tr('Movo does not send email yet.') : tr('Not available on this device.')} /> : undefined} chevron={!r.toggle} />)}</div></section>)}
    {!shown.length && <p className="empty">{tr('No settings match “{query}”.', { query })}</p>}
    {panel === 'lock' && <LockSheet c={c} onClose={() => { setPanel(''); rerender(n => n + 1); }} />}
    {panel === 'usage' && <UsageSheet c={c} onClose={() => setPanel('')} />}
  </>;
}

const PICKS = 11;

/** Background scenery: plain, one of the Scenery wallpapers, or your own photo, with a visibility slider. */
function SceneryPicker({ c }) {
  const { prefs, setPref, sceneryPhoto, setSceneryPhoto } = c;
  const [all, setAll] = useState(false);
  const [error, setError] = useState('');
  const file = useRef(null);
  const current = prefs.scenery || '';
  const pick = (id) => { setError(''); setPref('scenery', id); };
  const upload = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    setError('');
    try {
      const url = await toSceneryPhoto(f, { type: tr('Choose a photo or image file.'), size: tr('That image is larger than 15 MB.'), read: tr('Could not read that photo.') });
      if (!setSceneryPhoto(url)) throw new Error(tr('This browser could not save the photo. Free up space or try a smaller image.'));
      setPref('scenery', PHOTO); setAll(false);
    } catch (err) { setError(err.message); }
  };
  /* Keep the chosen scenery visible in the short list even when it comes from further down the full set. */
  const shortList = SCENERIES.slice(0, PICKS);
  if (current && current !== PHOTO && !shortList.some(s => s.id === current)) { const chosen = SCENERIES.find(s => s.id === current); if (chosen) shortList.unshift(chosen); }
  const tile = (s) => <button type="button" key={s.id} className={`scenery-tile${current === s.id ? ' selected' : ''}`} aria-pressed={current === s.id} aria-label={tr('{name} background', { name: s.name })} onClick={() => pick(s.id)}><img src={s.thumb} alt="" loading="lazy" decoding="async" /></button>;
  return <section className="card pad scenery-settings">
    <div className="scenery-row" role="group" aria-label={tr('Background scenery')}>
      <button type="button" className={`scenery-tile plain${current ? '' : ' selected'}`} aria-pressed={!current} aria-label={tr('Plain background')} onClick={() => pick('')}><span>{tr('None')}</span></button>
      <button type="button" className={`scenery-tile photo${current === PHOTO ? ' selected' : ''}`} aria-pressed={current === PHOTO} aria-label={sceneryPhoto ? tr('Your photo') : tr('Upload your own background')} onClick={() => (sceneryPhoto ? pick(PHOTO) : file.current?.click())}>
        {sceneryPhoto ? <img src={sceneryPhoto} alt="" /> : <span><Icon name="upload" size={18} />{tr('Your photo')}</span>}
      </button>
      {shortList.map(tile)}
      <button type="button" className="scenery-tile more" onClick={() => setAll(true)}><span>{tr('All')}<small>{SCENERIES.length}</small></span></button>
    </div>
    <input ref={file} type="file" accept="image/*" hidden onChange={upload} aria-label={tr('Choose a background photo')} />
    {sceneryPhoto && <button type="button" className="link-button" onClick={() => file.current?.click()}>{tr('Change photo')}</button>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <label className="clarity"><span className="clarity-top"><b>{tr('Scenery visibility')}</b><em>{prefs.sceneryVisibility <= 33 ? tr('Subtle') : prefs.sceneryVisibility >= 67 ? tr('Vivid') : tr('Balanced')} · {prefs.sceneryVisibility}%</em></span>
      <input type="range" min="0" max="100" step="1" value={prefs.sceneryVisibility} disabled={!current} aria-label={tr('Scenery visibility')} onChange={e => setPref('sceneryVisibility', Number(e.target.value))} style={{ '--fill': `${prefs.sceneryVisibility}%` }} />
      <span className="clarity-ends"><small>{tr('Subtle')}</small><small>{tr('Vivid')}</small></span></label>
    <p className="form-note">{tr('A soft veil in your theme colour keeps text readable. Your own photo stays on this device.')}</p>
    {all && <Sheet title={tr('Background scenery')} subtitle={tr('{n} sceneries', { n: SCENERIES.length })} onClose={() => setAll(false)} label={tr('Background scenery')}>
      <div className="scenery-grid">{SCENERIES.map(tile)}</div>
    </Sheet>}
  </section>;
}

export function Appearance({ c }) {
  const { prefs, setPref, go } = c;
  return <>
    <SubHeader title={tr('Appearance')} onBack={() => go('Settings')} />
    <h2 className="group-title">{tr('Theme')}</h2>
    <div className="card pad"><ThemePicker c={c} />
      <button type="button" className="link-button strong" onClick={() => c.setSheet({ name: 'themes' })}>{tr('All themes')} <Icon name="chevron" size={14} /></button></div>
    <h2 className="group-title">{tr('Liquid Glass')}</h2>
    <section className="card pad glass-settings">
      <div className="glass-head"><span className="menu-main"><strong>{tr('Liquid Glass')}</strong><small>{tr('Translucent, light-bending surfaces')}</small></span><Toggle checked={prefs.glass} onChange={v => setPref('glass', v)} label={tr('Liquid Glass')} /></div>
      <div className={`glass-preview${prefs.glass ? '' : ' off'}`} aria-hidden="true"><i /><i /><span className="glass-chip"><Icon name="wallet" size={18} /> ₱128,450.00</span></div>
      <label className="clarity"><span className="clarity-top"><b>{tr('Glass clarity')}</b><em>{prefs.clarity <= 33 ? tr('Frosted') : prefs.clarity >= 67 ? tr('Clear') : tr('Balanced')} · {prefs.clarity}%</em></span>
        <input type="range" min="0" max="100" step="1" value={prefs.clarity} disabled={!prefs.glass} aria-label={tr('Glass clarity')} onChange={e => setPref('clarity', Number(e.target.value))} style={{ '--fill': `${prefs.clarity}%` }} />
        <span className="clarity-ends"><small>{tr('Frosted')}</small><small>{tr('Clear')}</small></span></label>
    </section>
    <h2 className="group-title">{tr('Background')}</h2>
    <SceneryPicker c={c} />
    <h2 className="group-title">{tr('Preview')}</h2>
    <div className="card pad"><NavPreview accentName={prefs.accent} /></div>
    <h2 className="group-title">{tr('Display & Layout')}</h2>
    <section className="card menu-card">
      <Row icon="layout" title={tr('Compact Mode')} sub="Show more content" chevron={false} right={<Toggle checked={prefs.compact} onChange={v => setPref('compact', v)} label={tr('Compact Mode')} />} />
      <Row icon="palette" title={tr('Show Category Colors')} sub="Use colors for transaction categories" chevron={false} right={<Toggle checked={prefs.categoryColors} onChange={v => setPref('categoryColors', v)} label={tr('Show Category Colors')} />} />
      <Row icon="card" title={tr('Card View Style')} sub={tr('Bank card or account tile, from Wallet → Sort & view')} onClick={() => go('Wallet')} />
      <Row icon="pin" title={tr('Country or region')} sub={c.country ? countryName(c.country, c.lang?.locale) : tr('Not set')} onClick={() => c.openCountry?.()} />
      <Row icon="globe" title={tr('Language')} sub={c.lang?.name} onClick={() => c.openLanguage?.()} />
      <Row icon="calendar" title={tr('Date Format')} sub={tr('{date} · follows your language', { date: longDate(new Date()) })} />
      <Row icon="coin" title={tr('Home Currency')} sub={`${c.base || 'PHP'} · ${money(1234.5)}`} onClick={() => c.openCurrency?.()} />
    </section>
  </>;
}

export function NotificationSettings({ c }) {
  const { prefs, setPref, go } = c;
  const pushOn = !!prefs.push && typeof Notification !== 'undefined' && Notification.permission === 'granted';
  const T = (key, label, { checked = prefs[key] !== false && !!prefs[key], onChange = v => setPref(key, v), disabled = false, reason } = {}) => <Toggle checked={!disabled && checked} onChange={onChange} label={tr(label)} describedBy={`notification-setting-${key}-description`} disabled={disabled} reason={reason ? tr(reason) : undefined} />;
  const item = (icon, title, sub, key, tone, opts) => <div className="menu-row" key={key}><span className={`menu-icon ${tone ? `tone-${tone}` : 'bare'}`}><Icon name={icon} size={20} /></span><span className="menu-main"><strong>{tr(title)}</strong><small id={`notification-setting-${key}-description`}>{tr(sub)}</small></span>{T(key, title, opts)}</div>;
  return <>
    <SubHeader title={tr('Notifications')} onBack={() => go('Notifications')} />
    <section className="card menu-card">{item('bell', 'Notifications', 'Manage how you receive notifications', 'notifications')}</section>
    <h2 className="group-title">{tr('Notification Channels')}</h2>
    <section className="card menu-card">
      {item('phone', 'Push Notifications', pushSupported() ? 'Alerts on this device for renewals, limits and monthly reports.' : 'This browser cannot show alerts. On iPhone, add Movo to your Home Screen first.', 'push', undefined, { checked: pushOn, onChange: v => togglePush(c, v), disabled: !pushSupported(), reason: 'This browser cannot show alerts.' })}
      {item('mail', 'Email Notifications', 'Movo does not send email yet.', 'email', undefined, { disabled: true, reason: 'Movo does not send email yet.' })}
      {item('message', 'In-App Alerts', 'Show alerts inside the app', 'inapp')}
    </section>
    <h2 className="group-title">{tr('Notification Categories')}</h2>
    <section className="card menu-card">
      {item('card', 'Transactions', 'Payments, transfers, renewals and limits', 'catTransactions', 'blue')}
      {item('shield', 'Account & Security', 'Sign-ins to your account on a new device', 'catAccount', 'orange')}
      {item('spark', 'NasrinAI Updates', 'New features in Movo and NasrinAI', 'catAi', 'violet')}
      {item('tag', 'Money tips', 'One tip a week from your own numbers', 'catPromo', 'green')}
      {item('doc', 'Reports', 'Your monthly summary on the 1st', 'catReports', 'teal')}
    </section>
    <section className="card menu-card gap">
      {item('moon', 'Quiet Hours', prefs.quietOn ? tr('Alerts wait until {end}', { end: prefs.quietEnd }) : 'Hold device alerts overnight', 'quietOn')}
      {prefs.quietOn && <div className="menu-row quiet-times">
        <label>{tr('From')}<input type="time" value={prefs.quietStart} onChange={e => setPref('quietStart', e.target.value || '22:00')} /></label>
        <label>{tr('To')}<input type="time" value={prefs.quietEnd} onChange={e => setPref('quietEnd', e.target.value || '07:00')} /></label>
      </div>}
    </section>
  </>;
}
