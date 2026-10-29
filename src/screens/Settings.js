import React from 'react';
import Icon from '../components/Icon';
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
    {[['home', 'Home', true], ['wallet', 'Wallet'], ['spark', ''], ['list', 'Transactions'], ['user', 'Profile']].map(([icon, label, on], i) => i === 2
      ? <span key="orb" className="orb small"><Icon name="spark" size={22} filled /></span>
      : <span key={label} className={on ? 'on' : ''}><Icon name={icon} size={20} filled={on} />{label}</span>)}
  </div>;
}

function Row({ icon, title, sub, right, onClick, chevron = true, danger }) {
  const Tag = onClick ? 'button' : 'div';
  return <Tag type={onClick ? 'button' : undefined} className={`menu-row${danger ? ' danger' : ''}`} onClick={onClick}>
    <span className="menu-icon bare"><Icon name={icon} size={20} /></span>
    <span className="menu-main"><strong>{title}</strong>{sub && <small>{sub}</small>}</span>{right}{chevron && onClick && <Icon name="chevron" size={16} />}
  </Tag>;
}

export default function Settings({ c }) {
  const { prefs, setPref, go, query, setQuery } = c;
  const sections = [
    { title: 'Account', rows: [
      { icon: 'user', title: 'Profile', sub: 'Personal information', onClick: () => go('EditProfile') },
      { icon: 'database', title: 'Plan & Usage', sub: 'Manage your plan and tokens', onClick: () => go('EditProfile') },
      { icon: 'layout', title: 'Connected Accounts', sub: 'Banks, cards, e-wallets, email', onClick: () => go('Wallet') },
    ] },
    { title: 'Appearance', rows: [
      { icon: 'palette', title: 'Theme', sub: 'Light, Dark or Custom', onClick: () => go('Appearance') },
      { icon: 'globe', title: 'App Language', sub: 'English (Philippines)', onClick: () => c.notify('English (Philippines) is the only language right now.') },
      { icon: 'layout', title: 'Display & Layout', sub: 'Customize your experience', onClick: () => go('Appearance') },
    ] },
    { title: 'Notifications', rows: [
      { icon: 'bell', title: 'Push Notifications', sub: 'Transaction alerts, reminders', toggle: 'push' },
      { icon: 'mail', title: 'Email Notifications', sub: 'Statements, reports, security', toggle: 'email' },
      { icon: 'message', title: 'In-App Alerts', sub: 'Budgets, insights, updates', toggle: 'inapp' },
    ] },
    { title: 'Security & Privacy', rows: [
      { icon: 'face', title: 'Face ID / Touch ID', sub: 'Use biometrics to unlock', toggle: 'biometrics' },
      { icon: 'lock', title: 'App Lock', sub: 'Require authentication', onClick: () => c.notify('App lock needs device support and is not available in the browser.') },
      { icon: 'shield', title: 'Privacy & Data', sub: 'Manage your data and permissions', onClick: () => { c.setShow(!c.show); c.notify(c.show ? 'Balances are hidden.' : 'Balances are visible.'); } },
      { icon: 'trash', title: 'Clear Local Data', sub: 'Remove cached data', onClick: () => c.setSheet({ name: 'clear' }) },
    ] },
    { title: 'Data & Sync', rows: [
      { icon: 'cloud', title: 'Cloud Sync', sub: 'Backup and sync your data', toggle: 'cloudSync' },
      { icon: 'database', title: 'Local Storage', sub: 'Store data on this device', toggle: 'localStorage' },
      { icon: 'refresh', title: 'Auto Categorization', sub: 'Automatically categorize transactions', toggle: 'autocat' },
    ] },
    { title: 'Help & Support', rows: [
      { icon: 'help', title: 'Help Center', sub: 'FAQs, guides and tutorials', onClick: () => c.notify('Help Center is not available yet.') },
    ] },
  ];
  const q = query.trim().toLowerCase();
  const shown = sections.map(s => ({ ...s, rows: s.rows.filter(r => !q || `${r.title} ${r.sub}`.toLowerCase().includes(q)) })).filter(s => s.rows.length);
  return <>
    <SubHeader title="Settings" onBack={() => go('Profile')} />
    <label className="search-field"><Icon name="search" size={18} /><input aria-label="Search settings" placeholder="Search settings" value={query} onChange={e => setQuery(e.target.value)} /></label>
    {shown.map(s => <section key={s.title}><h2 className="group-title">{s.title}</h2>
      <div className="card menu-card">{s.rows.map(r => <Row key={r.title} {...r} right={r.toggle ? <Toggle checked={prefs[r.toggle] && (r.toggle !== 'cloudSync' || c.cloudMode)} onChange={v => (r.toggle === 'cloudSync' && !c.cloudMode ? go('Sign in') : setPref(r.toggle, v))} label={r.title} /> : undefined} chevron={!r.toggle} />)}</div></section>)}
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
    <h2 className="group-title">Preview</h2>
    <div className="card pad"><NavPreview accentName={prefs.accent} /></div>
    <h2 className="group-title">Display & Layout</h2>
    <section className="card menu-card">
      <Row icon="layout" title="Compact Mode" sub="Show more content" chevron={false} right={<Toggle checked={prefs.compact} onChange={v => setPref('compact', v)} label="Compact Mode" />} />
      <Row icon="palette" title="Show Category Colors" sub="Use colors for transaction categories" chevron={false} right={<Toggle checked={prefs.categoryColors} onChange={v => setPref('categoryColors', v)} label="Show Category Colors" />} />
      <Row icon="card" title="Card View Style" sub="Rounded (Default)" onClick={() => c.notify('Rounded is the only card style right now.')} />
      <Row icon="calendar" title="Date Format" sub="Oct 27, 2026 (Default)" onClick={() => c.notify('Oct 27, 2026 is the only date format right now.')} />
      <Row icon="coin" title="Currency Format" sub="PHP (₱)" onClick={() => c.notify('Philippine peso is the only currency right now.')} />
    </section>
  </>;
}

export function NotificationSettings({ c }) {
  const { prefs, setPref, go } = c;
  const T = (key, label) => <Toggle checked={prefs[key]} onChange={v => setPref(key, v)} label={label} />;
  const item = (icon, title, sub, key, tone) => <div className="menu-row" key={key}><span className={`menu-icon ${tone ? `tone-${tone}` : 'bare'}`}><Icon name={icon} size={20} /></span><span className="menu-main"><strong>{title}</strong><small>{sub}</small></span>{T(key, title)}</div>;
  return <>
    <SubHeader title="Notifications" onBack={() => go('Notifications')} />
    <section className="card menu-card">{item('bell', 'Notifications', 'Manage how you receive notifications', 'notifications')}</section>
    <h2 className="group-title">Notification Channels</h2>
    <section className="card menu-card">
      {item('phone', 'Push Notifications', 'Receive notifications in the app', 'push')}
      {item('mail', 'Email Notifications', 'Receive important updates via email', 'email')}
      {item('message', 'In-App Alerts', 'Show alerts inside the app', 'inapp')}
    </section>
    <h2 className="group-title">Notification Categories</h2>
    <section className="card menu-card">
      {item('card', 'Transactions', 'Payments, transfers, receipts', 'catTransactions', 'blue')}
      {item('chart', 'Account & Security', 'Logins, security alerts, account updates', 'catAccount', 'blue')}
      {item('spark', 'NasrinAI Updates', 'New features, tips, and improvements', 'catAi', 'violet')}
      {item('tag', 'Promotions', 'Special offers and discounts', 'catPromo', 'gray')}
      {item('doc', 'Reports', 'Monthly summaries and insights', 'catReports', 'teal')}
    </section>
    <section className="card menu-card gap"><Row icon="moon" title="Quiet Hours" sub="Disable non-urgent notifications" right={<span className="muted-end">10:00 PM – 7:00 AM</span>} onClick={() => c.notify('Quiet hours are set to 10:00 PM – 7:00 AM.')} /></section>
  </>;
}
