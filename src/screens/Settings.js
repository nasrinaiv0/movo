import React from 'react';
import Icon, { NasrinMark } from '../components/Icon';
import { SubHeader, Toggle, Sheet } from '../components/ui';

export const ACCENTS = [['blue', '#2f6bff'], ['purple', '#7c4dff'], ['orange', '#ff8a1f'], ['green', '#13b45f'], ['red', '#ef4444'], ['slate', '#334155']];
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
    <section className="theme-segments" role="radiogroup" aria-label="App appearance">
      {SEGMENTS.map(([key, label, icon]) => <button type="button" key={key} role="radio" aria-checked={current === key} className={current === key ? 'selected' : ''}
        onClick={() => (key === 'custom' ? c.setSheet({ name: 'themes' }) : applyTheme(c, key))}>
        <span className={`seg-art seg-${key}`}><Icon name={icon} size={compact ? 22 : 26} /></span>{label}{current === key && <i className="check-badge"><Icon name="check" size={11} strokeWidth={3} /></i>}
      </button>)}
    </section>
    <h3 className="mini-title">{compact ? 'App Theme Color' : 'Accent Color'}</h3>
    <div className="accent-row" role="radiogroup" aria-label="Accent color">
      {ACCENTS.map(([key, color]) => <button type="button" key={key} role="radio" aria-checked={prefs.accent === key} aria-label={`${key} accent`} className={prefs.accent === key ? 'selected' : ''} style={{ '--dot': color }} onClick={() => setPref('accent', key)}>{prefs.accent === key && <Icon name="check" size={16} strokeWidth={3} />}</button>)}
    </div>
  </>;
}

export function ThemeSheet({ c }) {
  const { prefs } = c;
  return <Sheet title="Choose Theme" subtitle="Personalize your app experience." onClose={() => c.setSheet(null)}>
    <div className="theme-list">
      {THEMES.map(([key, name, sub]) => <button type="button" key={key} className={`theme-option${prefs.theme === key ? ' selected' : ''}`} onClick={() => { applyTheme(c, key); c.setSheet(null); }} role="radio" aria-checked={prefs.theme === key}>
        <span className={`theme-art art-${key}`} /><span className="account-main"><strong>{name}</strong><small>{sub}</small></span>
        <span className="radio">{prefs.theme === key && <Icon name="check" size={13} strokeWidth={3} />}</span>
      </button>)}
    </div>
    <label className="custom-color"><span>Custom accent</span><input type="color" aria-label="Custom accent color" value={prefs.customColor} onChange={e => { c.setPref('customColor', e.target.value); c.setPref('accent', 'custom'); }} /></label>
  </Sheet>;
}

export function NavPreview({ accentName }) {
  return <div className={`nav-preview accent-${accentName}`} aria-label="Navigation preview">
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
    <span className="menu-main"><strong>{title}</strong>{sub && <small id={descriptionId}>{sub}</small>}</span>{right}{status && <span className="pill tone-gray">{status}</span>}{chevron && onClick && <Icon name="chevron" size={16} />}
  </Tag>;
}

export default function Settings({ c }) {
  const { prefs, setPref, go, query, setQuery } = c;
  const sections = [
    { title: 'Account', rows: [
      { icon: 'user', title: 'Profile', sub: 'Personal information', onClick: () => go('EditProfile') },
      { icon: 'database', title: 'Plan & Usage', sub: 'Billing and token usage are not connected in this build.', status: 'Unavailable' },
      { icon: 'layout', title: 'Connected Accounts', sub: 'Manually tracked accounts; no bank connection is active.', onClick: () => go('Wallet') },
    ] },
    { title: 'Appearance', rows: [
      { icon: 'palette', title: 'Theme', sub: 'Light, Dark or Custom', onClick: () => go('Appearance') },
      { icon: 'drop', title: 'Liquid Glass', sub: 'Choose how clear the glass looks', onClick: () => go('Appearance') },
      { icon: 'globe', title: 'Language', sub: c.lang?.name || 'English', onClick: () => c.openLanguage?.() },
      { icon: 'coin', title: 'Home Currency', sub: `${c.base || 'PHP'} · totals, budgets and charts`, onClick: () => c.openCurrency?.() },
      { icon: 'layout', title: 'Display & Layout', sub: 'Customize your experience', onClick: () => go('Appearance') },
    ] },
    { title: 'Notifications', rows: [
      { icon: 'bell', title: 'Push Notifications', sub: 'Not available in this web build; no push delivery service is connected.', toggle: 'push' },
      { icon: 'mail', title: 'Email Notifications', sub: 'Not available yet; MOVO does not send email alerts.', toggle: 'email' },
      { icon: 'message', title: 'In-App Alerts', sub: 'Show or hide the in-app notification feed.', toggle: 'inapp' },
    ] },
    { title: 'Security & Privacy', rows: [
      { icon: 'face', title: 'Face ID / Touch ID', sub: 'Unavailable in a browser; native biometric unlock is not connected.', toggle: 'biometrics' },
      { icon: 'lock', title: 'App Lock', sub: 'Unavailable in this browser build; no separate app-lock feature is connected.', status: 'Unavailable' },
      { icon: 'shield', title: 'Privacy & Data', sub: 'Read how MOVO handles your information', onClick: () => c.openLegal?.('PrivacyPolicy') },
      { icon: 'trash', title: 'Clear All Data', sub: c.cloudMode ? 'Delete all activity and data on this device and in your MOVO account' : 'Delete all activity and data stored on this device', onClick: () => c.setSheet({ name: 'clear' }), danger: true },
    ] },
    { title: 'Data & Sync', rows: [
      { icon: 'cloud', title: 'Cloud Sync', sub: 'Active while signed in; sign out to use local-only mode.', toggle: 'cloudSync' },
      { icon: 'database', title: 'Local Storage', sub: 'Browser storage is managed automatically; this switch is not available.', toggle: 'localStorage' },
      { icon: 'refresh', title: 'Auto Categorization', sub: 'Automatic categorization is not implemented yet.', toggle: 'autocat' },
    ] },
    { title: 'Automatic Logging', rows: [
      { icon: 'refresh', title: 'Auto-log Apple Pay & Google Pay', sub: 'When on, payments from your phone automation are logged instantly; when off, MOVO asks you to confirm each one.', toggle: 'autoLog' },
      { icon: 'link', title: 'Set Up Phone Automation', sub: 'Connect an iPhone Shortcuts or Android automation to MOVO', onClick: () => c.openAutoLog?.() },
      { icon: 'scan', title: 'Receipt Scanner', sub: 'Scan receipts and payment screenshots; see your scan log', onClick: () => c.openScanner?.() },
    ] },
    { title: 'Help & Support', rows: [
      { icon: 'help', title: 'Help Center', sub: 'Answers about transactions, storage, privacy, and NasrinAI.', onClick: () => go('HelpCenter') },
    ] },
    { title: 'Legal', rows: [
      { icon: 'doc', title: 'Terms of Service', sub: 'Rules for using MOVO', onClick: () => c.openLegal?.('TermsOfService') },
      { icon: 'shield', title: 'Privacy Policy', sub: 'How MOVO handles your information', onClick: () => c.openLegal?.('PrivacyPolicy') },
    ] },
  ];
  const q = query.trim().toLowerCase();
  const shown = sections.map(s => ({ ...s, rows: s.rows.filter(r => !q || `${r.title} ${r.sub}`.toLowerCase().includes(q)) })).filter(s => s.rows.length);
  return <>
    <SubHeader title="Settings" onBack={() => go('Profile')} />
    <label className="search-field"><Icon name="search" size={18} /><input aria-label="Search settings" placeholder="Search settings" value={query} onChange={e => setQuery(e.target.value)} /></label>
    {shown.map(s => <section key={s.title}><h2 className="group-title">{s.title}</h2>
      <div className="card menu-card">{s.rows.map(r => <Row key={r.title} {...r} right={r.toggle ? <Toggle checked={!['push', 'email', 'biometrics', 'localStorage', 'autocat'].includes(r.toggle) && prefs[r.toggle] && (r.toggle !== 'cloudSync' || c.cloudMode)} onChange={v => (r.toggle === 'cloudSync' && !c.cloudMode ? go('Sign in') : setPref(r.toggle, v))} label={r.title} describedBy={settingDescriptionId(r.title)} disabled={['push', 'email', 'biometrics', 'localStorage', 'autocat'].includes(r.toggle) || (r.toggle === 'cloudSync' && c.cloudMode)} reason={r.toggle === 'cloudSync' ? 'Cloud sync follows your signed-in account; sign out to use local-only mode.' : 'This feature is not connected in the current web build.'} /> : undefined} chevron={!r.toggle} />)}</div></section>)}
    {!shown.length && <p className="empty">No settings match “{query}”.</p>}
  </>;
}

export function Appearance({ c }) {
  const { prefs, setPref, go } = c;
  return <>
    <SubHeader title="Appearance" onBack={() => go('Settings')} />
    <h2 className="group-title">Theme</h2>
    <div className="card pad"><ThemePicker c={c} />
      <button type="button" className="link-button strong" onClick={() => c.setSheet({ name: 'themes' })}>All themes <Icon name="chevron" size={14} /></button></div>
    <h2 className="group-title">Liquid Glass</h2>
    <section className="card pad glass-settings">
      <div className="glass-head"><span className="menu-main"><strong>Liquid Glass</strong><small>Translucent, light-bending surfaces</small></span><Toggle checked={prefs.glass} onChange={v => setPref('glass', v)} label="Liquid Glass" /></div>
      <div className={`glass-preview${prefs.glass ? '' : ' off'}`} aria-hidden="true"><i /><i /><span className="glass-chip"><Icon name="wallet" size={18} /> ₱128,450.00</span></div>
      <label className="clarity"><span className="clarity-top"><b>Glass clarity</b><em>{prefs.clarity <= 33 ? 'Frosted' : prefs.clarity >= 67 ? 'Clear' : 'Balanced'} · {prefs.clarity}%</em></span>
        <input type="range" min="0" max="100" step="1" value={prefs.clarity} disabled={!prefs.glass} aria-label="Glass clarity" onChange={e => setPref('clarity', Number(e.target.value))} style={{ '--fill': `${prefs.clarity}%` }} />
        <span className="clarity-ends"><small>Frosted</small><small>Clear</small></span></label>
    </section>
    <h2 className="group-title">Preview</h2>
    <div className="card pad"><NavPreview accentName={prefs.accent} /></div>
    <h2 className="group-title">Display & Layout</h2>
    <section className="card menu-card">
      <Row icon="layout" title="Compact Mode" sub="Show more content" chevron={false} right={<Toggle checked={prefs.compact} onChange={v => setPref('compact', v)} label="Compact Mode" />} />
      <Row icon="palette" title="Show Category Colors" sub="Use colors for transaction categories" chevron={false} right={<Toggle checked={prefs.categoryColors} onChange={v => setPref('categoryColors', v)} label="Show Category Colors" />} />
      <Row icon="card" title="Card View Style" sub="Rounded is the only available style." />
      <Row icon="calendar" title="Date Format" sub="Oct 27, 2026 is the only available format." />
      <Row icon="coin" title="Currency Format" sub="Philippine peso is the only available currency." />
    </section>
  </>;
}

export function NotificationSettings({ c }) {
  const { prefs, setPref, go } = c;
  const T = (key, label, disabled = false, reason = 'This delivery method is not connected in the current web build.') => <Toggle checked={!disabled && prefs[key]} onChange={v => setPref(key, v)} label={label} describedBy={`notification-setting-${key}-description`} disabled={disabled} reason={reason} />;
  const item = (icon, title, sub, key, tone, disabled = false, reason) => <div className="menu-row" key={key}><span className={`menu-icon ${tone ? `tone-${tone}` : 'bare'}`}><Icon name={icon} size={20} /></span><span className="menu-main"><strong>{title}</strong><small id={`notification-setting-${key}-description`}>{sub}</small></span>{T(key, title, disabled, reason)}</div>;
  return <>
    <SubHeader title="Notifications" onBack={() => go('Notifications')} />
    <section className="card menu-card">{item('bell', 'Notifications', 'Manage how you receive notifications', 'notifications')}</section>
    <h2 className="group-title">Notification Channels</h2>
    <section className="card menu-card">
      {item('phone', 'Push Notifications', 'Push delivery is not available in this web build.', 'push', undefined, true)}
      {item('mail', 'Email Notifications', 'Email delivery is not connected yet.', 'email', undefined, true)}
      {item('message', 'In-App Alerts', 'Show alerts inside the app', 'inapp')}
    </section>
    <h2 className="group-title">Notification Categories</h2>
    <section className="card menu-card">
      {item('card', 'Transactions', 'Payments, transfers, receipts', 'catTransactions', 'blue')}
      {item('chart', 'Account & Security', c.demoAlertsAvailable ? 'Sample account alerts in demo mode.' : 'Live account alerts are not connected.', 'catAccount', 'blue', !c.demoAlertsAvailable, 'Account and security alerts are only generated for sample/demo data; live event generation is not connected.')}
      {item('spark', 'NasrinAI Updates', c.demoAlertsAvailable ? 'Sample AI notices in demo mode.' : 'Live NasrinAI notices are not connected.', 'catAi', 'violet', !c.demoAlertsAvailable, 'NasrinAI update alerts are only generated for sample/demo data; live event generation is not connected.')}
      {item('tag', 'Promotions', c.demoAlertsAvailable ? 'Sample offers in demo mode.' : 'Live promotional alerts are not connected.', 'catPromo', 'gray', !c.demoAlertsAvailable, 'Promotional alerts are only sample/demo data; live promotional messaging is not connected.')}
      {item('doc', 'Reports', c.demoAlertsAvailable ? 'Sample report notices in demo mode.' : 'Live report notifications are not connected.', 'catReports', 'teal', !c.demoAlertsAvailable, 'Report alerts are only generated for sample/demo data; live report-event generation is not connected.')}
    </section>
    <section className="card menu-card gap"><Row icon="moon" title="Quiet Hours" sub="Scheduling is not available in this web build." right={<span className="muted-end">Unavailable</span>} chevron={false} /></section>
  </>;
}
