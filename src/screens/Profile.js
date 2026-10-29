import React from 'react';
import Icon from '../components/Icon';
import { RootHeader, SubHeader, SectionTitle } from '../components/ui';
import { money, shown } from '../lib/format';
import { ThemePicker } from './Settings';

const Delta = ({ v, bad }) => (v == null ? null : <span className={`delta ${bad ? 'bad' : 'good'}`}>{bad ? '↓' : '↑'} {v}%</span>);

export default function Profile({ c }) {
  const { show, stats, deltas, user, accountsByType, prefs, setPref, go, session, signOutNow, exportCsv } = c;
  const sum = (arr) => arr.reduce((s, a) => s + a.balance, 0);
  const rows = [['Bank Accounts', 'bank', accountsByType.bank, 'Bank Accounts', 'account'], ['Cards', 'card', accountsByType.card, 'Cards', 'account'], ['E-Wallets', 'wallet', accountsByType.e_wallet, 'E-Wallets', 'account']];
  const menu = [['gear', 'Financial Settings', 'Settings'], ['bell', 'Notifications', 'NotificationSettings'], ['shield', 'Security & Privacy', 'Settings'], ['sliders', 'Preferences', 'Appearance']];
  return <>
    <RootHeader title="Profile" onSearch={() => go('Transactions')} onBell={() => go('Notifications')} onSettings={() => go('Settings')} unread={c.unread} />
    <button type="button" className="card profile-card" onClick={() => go('EditProfile')} aria-label="Edit profile">
      <span className="avatar big">{user.initial}<i><Icon name="camera" size={13} /></i></span>
      <span className="profile-text"><strong>{user.name}</strong><small>{user.email}</small><em className="plan-pill"><Icon name="diamond" size={13} /> NasrinAI Max <Icon name="chevron" size={12} /></em></span>
      <Icon name="chevron" size={18} />
    </button>
    <section className="stat-grid" aria-label="Profile summary">
      {[['Total Balance', 'chart', 'blue', stats.balance, deltas.balance, false], ['Total Income', 'arrowUp', 'green', stats.income, deltas.income, false], ['Total Expense', 'arrowDown', 'red', stats.expenses, deltas.expenses, true]].map(([label, icon, tone, value, d, bad]) =>
        <article className="card stat-card plain" key={label}><span className={`stat-icon big tone-${tone}`}><Icon name={icon} size={18} strokeWidth={2.2} /></span><small>{label}</small><strong>{shown(show, money(value))}</strong><Delta v={d} bad={bad} /></article>)}
    </section>

    <SectionTitle action="See All" onAction={() => go('Wallet')}>Accounts</SectionTitle>
    <section className="card menu-card">
      {rows.map(([label, icon, list, filter]) => <button type="button" key={label} className="menu-row" onClick={() => { c.setWalletFilter(filter); go('Wallet'); }}>
        <span className="menu-icon"><Icon name={icon} size={20} /></span><span className="menu-main"><strong>{label}</strong><small>{list.length} {list.length === 1 ? 'account' : 'accounts'}</small></span><b>{shown(show, money(sum(list), 'PHP', 2))}</b><Icon name="chevron" size={16} />
      </button>)}
    </section>
    <section className="card menu-card gap">
      {menu.map(([icon, label, view]) => <button type="button" key={label} className="menu-row" onClick={() => go(view)}><span className="menu-icon bare"><Icon name={icon} size={20} /></span><span className="menu-main"><strong>{label}</strong></span><Icon name="chevron" size={16} /></button>)}
    </section>

    <SectionTitle action="See All" onAction={() => go('Appearance')}>App Appearance</SectionTitle>
    <ThemePicker c={c} compact />

    <SectionTitle>Data & Sync</SectionTitle>
    <section className="card menu-card">
      <button type="button" className="menu-row" onClick={() => session ? c.notify(c.cloudMode ? 'Cloud mode is active for this signed-in session.' : 'You are signed in, but cloud records are not currently loaded.') : go('Sign in')}>
        <span className="menu-icon bare"><Icon name="cloud" size={20} /></span><span className="menu-main"><strong>Cloud Sync</strong><small>{session ? (c.cloudMode ? 'Signed in · cloud mode active' : 'Signed in · cloud mode unavailable') : 'Local-only · sign in to check cloud availability'}</small></span><Icon name="chevron" size={16} />
      </button>
      <button type="button" className="menu-row" onClick={() => c.notify('Local-only records are stored in this browser and do not automatically sync to other devices.')}>
        <span className="menu-icon bare"><Icon name="database" size={20} /></span><span className="menu-main"><strong>Local Storage</strong><small>Browser-specific storage; clearing browser data may erase local records</small></span><Icon name="chevron" size={16} />
      </button>
      <button type="button" className="menu-row" onClick={() => c.notify('Automatic categorization is not active. Choose a category when adding or importing a transaction.')}>
        <span className="menu-icon bare"><Icon name="refresh" size={20} /></span><span className="menu-main"><strong>Auto Categorization</strong><small>Not active in this build</small></span><Icon name="chevron" size={16} />
      </button>
    </section>

    <SectionTitle>About</SectionTitle>
    <section className="card menu-card">
      <div className="menu-row"><span className="menu-icon bare"><Icon name="star" size={20} /></span><span className="menu-main"><strong>MOVO App</strong><small>Version 1.0.0</small></span></div>
      <a className="menu-row" href="/terms.html"><span className="menu-icon bare"><Icon name="doc" size={20} /></span><span className="menu-main"><strong>Terms of Service</strong></span><Icon name="chevron" size={16} /></a>
      <a className="menu-row" href="/privacy.html"><span className="menu-icon bare"><Icon name="shield" size={20} /></span><span className="menu-main"><strong>Privacy Policy</strong></span><Icon name="chevron" size={16} /></a>
    </section>
    <section className="card menu-card gap">
      <button type="button" className="menu-row" onClick={exportCsv}><span className="menu-icon bare"><Icon name="download" size={20} /></span><span className="menu-main"><strong>Export transactions (CSV)</strong></span><Icon name="chevron" size={16} /></button>
      {session ? <button type="button" className="menu-row danger" onClick={signOutNow}><span className="menu-icon bare"><Icon name="logout" size={20} /></span><span className="menu-main"><strong>Sign out</strong></span></button>
        : c.supabaseConfigured && <button type="button" className="menu-row" onClick={() => go('Sign in')}><span className="menu-icon bare"><Icon name="user" size={20} /></span><span className="menu-main"><strong>Sign in / create account</strong></span><Icon name="chevron" size={16} /></button>}
    </section>
    <p className="fineprint">MOVO does not connect to your bank or read private Apple Pay history automatically. Only add records you choose to provide.</p>
  </>;
}

export function EditProfile({ c }) {
  const { user, prefs, setPref, go, session } = c;
  const field = (label, key, value, readOnly, extra) => <label className="field-row"><span>{label}</span>
    <span className="field-value">{extra}<input aria-label={label} value={value} readOnly={readOnly} onChange={e => setPref(key, e.target.value)} /></span></label>;
  return <>
    <SubHeader title="Profile" onBack={() => go('Profile')} right={<button type="button" className="link-button strong" onClick={() => { c.notify('Profile saved on this device.'); go('Profile'); }}>Save</button>} />
    <div className="avatar-edit"><span className="avatar huge">{user.initial}<i><Icon name="camera" size={16} /></i></span></div>
    <section className="card form-card">
      {field('Full Name', 'profileName', prefs.profileName || user.name)}
      {field('Email', 'email', user.email, true)}
      {field('Phone Number', 'phone', prefs.phone, false, <span className="flag">🇵🇭 <small>–</small></span>)}
      {field('Location', 'location', prefs.location, false, <Icon name="pin" size={17} />)}
    </section>
    <SectionTitle>Plan & Usage</SectionTitle>
    <section className="card plan-card">
      <div className="plan-top"><span className="tile tone-violet"><Icon name="diamond" size={22} /></span><span><strong>MOVO Personal</strong><small>Finance tracking workspace</small></span></div>
      <div className="usage"><div><b>AI usage reporting</b><span>Not connected</span></div><p className="fineprint">MOVO does not currently retrieve verified NasrinAI plan or token-usage data. No quota or billing status is implied by this screen.</p><button type="button" className="pill tone-blue" onClick={() => c.notify('Usage reporting is not connected yet. This screen does not estimate or change your NasrinAI allowance.')}>Usage details</button></div>
    </section>
    <SectionTitle>Connected Accounts</SectionTitle>
    <section className="card menu-card">
      {[['mail', 'Google', session?.user?.app_metadata?.provider === 'google' ? session.user.email : 'Sign in with Google', session?.user?.app_metadata?.provider === 'google'], ['phone', 'Apple', 'Sign in with Apple', false], ['message', 'Facebook', '', false]].map(([icon, name, sub, on]) =>
        <div className="menu-row" key={name}><span className="menu-icon bare"><Icon name={icon} size={20} /></span><span className="menu-main"><strong>{name}</strong>{sub && <small>{sub}</small>}</span><em className={`pill ${on ? 'tone-green' : 'tone-gray'}`}>{on ? 'Connected' : 'Not Connected'}</em></div>)}
    </section>
  </>;
}
