import React, { useRef, useState } from 'react';
import Icon from '../components/Icon';
import { SubHeader, SectionTitle, Trend } from '../components/ui';
import { money, shown } from '../lib/format';
import { ThemePicker } from './Settings';
import { t as tr } from '../lib/i18n';
import { maskEmail } from '../lib/emailPrivacy';
import { revokeOtherSessions } from '../lib/financeRepository';
import PlanBadge from '../components/PlanBadge';
import { totalBalance } from '../lib/totalBalance';


export default function Profile({ c }) {
  const { show, stats, deltas, user, accountsByType, go, session, signOutNow, exportCsv } = c;
  const [revokingOtherSessions, setRevokingOtherSessions] = useState(false);
  const revokeOtherDevices = async () => {
    if (revokingOtherSessions || !window.confirm(tr('Sign out of other devices?'))) return;
    setRevokingOtherSessions(true);
    try {
      await revokeOtherSessions();
      c.notify(tr('Other devices will need to sign in again after their current session expires.'));
    } catch {
      c.notify(tr('Could not revoke other sessions. Please try again.'));
    } finally {
      setRevokingOtherSessions(false);
    }
  };

  // Each row follows the Total Balance rules (lib/totalBalance.js): open accounts only, a debit card linked to its bank
  // counted once (through the bank), card payments that moved no money left out. The rows then add up to the total.
  const sum = (arr) => totalBalance(arr, c.toBase || (v => v), c.prefs?.creditCardPayments || {}).total;
  const open = (arr) => arr.filter(a => !a.is_archived);
  const rows = [['Bank Accounts', 'bank', accountsByType.bank, 'Bank Accounts', 'account'], ['Cards', 'card', accountsByType.card, 'Cards', 'account'], ['E-Wallets', 'wallet', accountsByType.e_wallet, 'E-Wallets', 'account']];
  const menu = [['gearSolid', 'Financial Settings', 'Settings'], ['bell', 'Notifications', 'NotificationSettings'], ['shield', 'Security & Privacy', 'Settings'], ['sliders', 'Preferences', 'Appearance']];
  return <>
    <SubHeader title={tr('Profile')} onBack={() => go('Menu')} right={<button type="button" className="round-button" aria-label={tr('Settings')} onClick={() => go('Settings')}><Icon name="gearSolid" size={19} /></button>} />
    <div className="card profile-card-wrap">
      <button type="button" className="profile-card" onClick={() => go('EditProfile')} aria-label={tr('Edit profile')}>
        <span className="avatar big">{c.prefs?.profilePhoto ? <img className="avatar-photo" src={c.prefs.profilePhoto} alt="" /> : user.initial}<i><Icon name="camera" size={13} /></i></span>
        <span className="profile-text"><strong>{user.name}</strong><small>{maskEmail(user.email)}</small>{(c.plan === 'pro' || c.plan === 'pro_plus') && <em className="plan-pill"><PlanBadge plan={c.plan} trial={c.entitlement?.source === 'trial'} size={18} label /></em>}</span>
        <Icon name="chevron" size={18} />
      </button>
      {/* Only for someone not signed in: a signed-in person in local or offline mode is still signed in. */}
      {!session?.user && c.supabaseConfigured && <button type="button" className="primary-button profile-signin" onClick={() => go('Sign in')}><Icon name="user" size={18} /> {tr('Sign in')}</button>}
    </div>
    <section className="stat-grid" aria-label={tr('Profile summary')}>
      {[['Total Balance', 'chart', 'blue', stats.balance, deltas.balance], ['Total Income', 'arrowDown', 'green', stats.income, deltas.income], ['Total Expense', 'arrowUp', 'red', stats.expenses, deltas.expenses]].map(([label, icon, tone, value, d]) =>
        <article className="card stat-card plain" key={label}><span className={`stat-icon big tone-${tone}`}><Icon name={icon} size={18} strokeWidth={2.2} /></span><small>{tr(label)}</small><strong>{shown(show, money(value, undefined, 0))}</strong><Trend value={d} size={11} /></article>)}
    </section>

    <SectionTitle action={tr('See All')} onAction={() => go('Wallet')}>{tr('Accounts')}</SectionTitle>
    <section className="card menu-card">
      {rows.map(([label, icon, list, filter]) => <button type="button" key={label} className="menu-row" onClick={() => { c.setWalletFilter(filter); go('Wallet'); }}>
        <span className="menu-icon"><Icon name={icon} size={20} /></span><span className="menu-main"><strong>{tr(label)}</strong><small>{open(list).length === 1 ? tr('1 account') : tr('{n} accounts', { n: open(list).length })}</small></span><b>{shown(show, money(sum(list)))}</b><Icon name="chevron" size={16} />
      </button>)}
    </section>
    <section className="card menu-card gap">
      {menu.map(([icon, label, view]) => <button type="button" key={label} className="menu-row" onClick={() => go(view)}><span className="menu-icon bare"><Icon name={icon} size={20} /></span><span className="menu-main"><strong>{tr(label)}</strong></span><Icon name="chevron" size={16} /></button>)}
    </section>

    <SectionTitle action={tr('See All')} onAction={() => go('Appearance')}>{tr('App Appearance')}</SectionTitle>
    <ThemePicker c={c} compact />

    <SectionTitle>{tr('Data & Sync')}</SectionTitle>
    <section className="card menu-card">
      <button type="button" className="menu-row" onClick={() => c.cloudMode ? c.notify('Cloud sync is active for this signed-in account. Sign out to use local-only mode.') : go(session?.user ? 'Settings' : 'Sign in')}>
        <span className="menu-icon bare"><Icon name="cloud" size={20} /></span><span className="menu-main"><strong>{tr('Cloud Sync')}</strong><small>{c.cloudMode ? tr('Active for your signed-in account') : session?.user ? (c.syncState?.message || tr('Changes are kept on this device until safely reconciled.')) : tr('Sign in to use cloud storage')}</small></span><span className="pill tone-blue">{c.cloudMode ? tr('Active') : session?.user ? tr('Off') : tr('Sign in')}</span><Icon name="chevron" size={16} />
      </button>
      <div className="menu-row"><span className="menu-icon bare"><Icon name="database" size={20} /></span><span className="menu-main"><strong>{tr('Local Storage')}</strong><small>{tr('Manually entered records persist across reloads in this browser; they are not synced to other devices or encrypted by MOVO.')}</small></span><span className="pill tone-gray">{tr('Automatic')}</span></div>
      <div className="menu-row"><span className="menu-icon bare"><Icon name="refresh" size={20} /></span><span className="menu-main"><strong>{tr('Auto Categorization')}</strong><small>{tr('Automatic categorization is not implemented yet.')}</small></span><span className="pill tone-gray">{tr('Unavailable')}</span></div>
    </section>

    <SectionTitle>{tr('About')}</SectionTitle>
    <section className="card menu-card">
      {[['star', 'MOVO App', 'Version 1.0.0'], ['doc', 'Terms of Service'], ['shield', 'Privacy Policy']].map(([icon, title, sub]) => {
        const action = title === 'Terms of Service' ? () => c.openLegal?.('TermsOfService') : title === 'Privacy Policy' ? () => c.openLegal?.('PrivacyPolicy') : null;
        const Tag = action ? 'button' : 'div';
        return <Tag key={title} type={action ? 'button' : undefined} className="menu-row" onClick={action}>
          <span className="menu-icon bare"><Icon name={icon} size={20} /></span><span className="menu-main"><strong>{tr(title)}</strong>{sub && <small>{tr(sub)}</small>}</span>{action && <Icon name="chevron" size={16} />}
        </Tag>;
      })}
    </section>
    <section className="card menu-card gap">
      <button type="button" className="menu-row" onClick={exportCsv}><span className="menu-icon bare"><Icon name="download" size={20} /></span><span className="menu-main"><strong>{tr('Export transactions (CSV)')}</strong></span><Icon name="chevron" size={16} /></button>
      {session && <button type="button" className="menu-row" onClick={revokeOtherDevices} disabled={revokingOtherSessions} aria-busy={revokingOtherSessions}>
        <span className="menu-icon bare"><Icon name="shield" size={20} /></span>
        <span className="menu-main"><strong>{tr('Sign out of other devices')}</strong><small>{tr('Keep this device signed in')}</small></span>
        <Icon name="chevron" size={16} />
      </button>}
      {session ? <button type="button" className="menu-row danger" onClick={signOutNow}><span className="menu-icon bare"><Icon name="logout" size={20} /></span><span className="menu-main"><strong>{tr('Sign out')}</strong></span></button>
        : c.supabaseConfigured && <button type="button" className="menu-row" onClick={() => go('Sign in')}><span className="menu-icon bare"><Icon name="user" size={20} /></span><span className="menu-main"><strong>{tr('Sign in / create account')}</strong></span><Icon name="chevron" size={16} /></button>}
    </section>
    <p className="fineprint">{tr('MOVO does not connect to your bank or read private Apple Pay history automatically. Only add records you choose to provide.')}</p>
  </>;
}

export function EditProfile({ c }) {
  const { user, prefs, setPref, go, session } = c;
  const [draft, setDraft] = useState(() => ({
    profileName: prefs.profileName || user.name,
    phone: prefs.phone || '',
    location: prefs.location || '',
  }));
  const [error, setError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const photoInput = useRef(null);
  const handlePhotoFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!/^image\\//i.test(file.type || '') || file.size > 8 * 1024 * 1024) { setPhotoError(tr('Choose an image under 8 MB.')); return; }
    const reader = new FileReader();
    reader.onerror = () => setPhotoError(tr('This image could not be read.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => setPhotoError(tr('This image could not be opened.'));
      image.onload = () => {
        try {
          const side = Math.min(image.naturalWidth || image.width, image.naturalHeight || image.height);
          if (!side) throw new Error();
          const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
          const sx = ((image.naturalWidth || image.width) - side) / 2;
          const sy = ((image.naturalHeight || image.height) - side) / 2;
          const ctx = canvas.getContext('2d'); if (!ctx) throw new Error();
          ctx.drawImage(image, sx, sy, side, side, 0, 0, 512, 512);
          setPref('profilePhoto', canvas.toDataURL('image/jpeg', 0.78));
          setPhotoError(''); c.notify(tr('Profile photo updated on this device.'));
        } catch { setPhotoError(tr('This image could not be cropped. Try another photo.')); }
      };
      image.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  };
  const saveProfile = (event) => {
    event.preventDefault();
    const profileName = draft.profileName.trim();
    const phone = draft.phone.trim();
    const location = draft.location.trim();
    if (!profileName) { setError(tr('Enter your name before saving.')); return; }
    if (profileName.length > 100 || phone.length > 40 || location.length > 100) {
      setError(tr('Name must be 100 characters or fewer, phone 40, and location 100.'));
      return;
    }
    setError('');
    setPref('profileName', profileName);
    setPref('phone', phone);
    setPref('location', location);
    c.notify('Profile saved on this device.');
    go('Profile');
  };
  const field = (label, key, value, readOnly, extra, maxLength) => <label className={`ep-field${readOnly ? ' is-readonly' : ''}`}><span className="ep-label">{tr(label)}</span>
    <span className="ep-value">{extra}<input aria-label={label} value={value} readOnly={readOnly} maxLength={maxLength} onChange={e => setDraft(current => ({ ...current, [key]: e.target.value }))} /></span></label>;
  const google = session?.user?.app_metadata?.provider === 'google';
  const providers = [
    ['mail', 'Google', google ? maskEmail(session.user.email) : c.supabaseConfigured ? tr('Google sign-in is available') : tr('Google sign-in is not configured'), google ? 'on' : 'off'],
    ['phone', 'Apple', tr('Apple sign-in is not available in MOVO yet'), 'na'],
    ['message', 'Facebook', tr('Facebook sign-in is not available in MOVO yet'), 'na'],
  ];
  return <>
    <SubHeader title={tr('Profile')} onBack={() => go('Profile')} right={<button type="submit" form="movo-profile-form" className="link-button strong">{tr('Save')}</button>} />
    <div className="edit-profile">
      <header className="ep-head">
        <span className="avatar huge">{prefs.profilePhoto ? <img className="avatar-photo" src={prefs.profilePhoto} alt="" /> : (draft.profileName.trim() || user.name).slice(0, 1).toUpperCase()}</span>
        <div className="ep-photo-actions"><button type="button" className="link-button" onClick={() => photoInput.current?.click()}><Icon name="camera" size={16} /> {tr('Change photo')}</button>{prefs.profilePhoto && <button type="button" className="link-button" onClick={() => { setPref('profilePhoto', ''); setPhotoError(''); }}>{tr('Remove photo')}</button>}</div>
        <input ref={photoInput} type="file" accept="image/*" hidden onChange={handlePhotoFile} />
        {photoError && <p className="form-error" role="alert">{photoError}</p>}
        <strong>{draft.profileName.trim() || user.name}</strong>
        <small>{maskEmail(user.email)}</small>
      </header>

      <SectionTitle>{tr('Personal details')}</SectionTitle>
      <form id="movo-profile-form" className="card ep-card" onSubmit={saveProfile} noValidate>
        {field('Full Name', 'profileName', draft.profileName, false, undefined, 100)}
        {field('Email', 'email', maskEmail(user.email), true)}
        {field('Phone Number', 'phone', draft.phone, false, <span className="flag">🇵🇭</span>, 40)}
        {field('Location', 'location', draft.location, false, <Icon name="pin" size={17} />, 100)}
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="ep-note">{tr('Name, phone number, and location are saved in this browser only. Your sign-in email is managed by your authentication provider.')}</p>

      <SectionTitle>{tr('Plan & Usage')}</SectionTitle>
      <section className="card ep-card">
        <div className="ep-row"><span className="ep-icon"><Icon name="info" size={20} /></span><span className="ep-main"><strong>{tr('Plan management unavailable')}</strong><small>{tr('MOVO billing and token-usage data are not connected.')}</small></span></div>
      </section>
      <p className="ep-note">{tr('No active plan or usage amount is asserted by this screen. Plan details will appear here when a verified billing integration is available.')}</p>

      <SectionTitle>{tr('Connected Accounts')}</SectionTitle>
      <section className="card ep-card">
        {providers.map(([icon, name, sub, state]) => <div className="ep-row" key={name}>
          <span className="ep-icon"><Icon name={icon} size={20} /></span>
          <span className="ep-main"><strong>{name}</strong><small>{sub}</small></span>
          <em className={`pill ${state === 'on' ? 'tone-green' : 'tone-gray'}`}>{state === 'on' ? tr('Connected') : state === 'off' ? tr('Not connected') : tr('Unavailable')}</em>
        </div>)}
      </section>
    </div>
  </>;
}
