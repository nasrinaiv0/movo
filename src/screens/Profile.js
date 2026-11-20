import React, { useRef, useState } from 'react';
import ProfileAvatar from '../components/ProfileAvatar';
import { cropProfilePhoto } from '../lib/useProfilePhoto';
import Icon from '../components/Icon';
import { SubHeader, SectionTitle, Trend } from '../components/ui';
import { money, shown, getFormatLocale } from '../lib/format';
import { ThemePicker } from './Settings';
import { t as tr } from '../lib/i18n';
import { maskEmail } from '../lib/emailPrivacy';
import { revokeOtherSessions } from '../lib/financeRepository';
import PlanBadge from '../components/PlanBadge';
import ReferralSheet from '../components/ReferralSheet';
import { totalBalance } from '../lib/totalBalance';
import { useConfirm } from '../components/ConfirmDialog';


export default function Profile({ c }) {
  const { show, stats, deltas, user, accountsByType, go, session, signOutNow, exportCsv } = c;
  const [revokingOtherSessions, setRevokingOtherSessions] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const confirm = useConfirm();
  const revokeOtherDevices = async () => {
    if (revokingOtherSessions) return;
    setRevokingOtherSessions(true);
    try {
      await confirm({
        title: tr('Sign out of other devices?'), icon: 'shield', confirmLabel: tr('Sign out others'),
        message: tr('Every other device signed in to this account will need to sign in again. This device stays signed in, and no records are deleted.'),
        failure: tr('Could not revoke other sessions. Please try again.'),
        action: async () => { await revokeOtherSessions(); c.notify(tr('Other devices will need to sign in again after their current session expires.')); },
      });
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
  const menu = [
    ['gearSolid', 'gray', 'Financial Settings', 'Settings', 'All MOVO settings'],
    ['bell', 'red', 'Notifications', 'NotificationSettings', 'Alerts and reminders'],
    ['shield', 'blue', 'Security & Privacy', 'Settings', 'App lock and your data'],
    ['sliders', 'purple', 'Preferences', 'Appearance', 'Theme, text and layout'],
  ];
  // The overview follows the month chosen on Home; a trend is shown only when it says something (no "999+%" against an
  // almost-empty last month).
  const monthName = (() => {
    const [y, m] = String(c.homeMonthKey || '').split('-').map(Number);
    if (!y || !m) return '';
    try { return new Date(y, m - 1, 15).toLocaleDateString(getFormatLocale(), { month: 'long', year: 'numeric' }); } catch { return ''; }
  })();
  const meaningful = (d) => Boolean(d && Number.isFinite(d.percent) && Math.abs(d.percent) < 999);
  const ic = (icon, tone, size = 20) => <span className={`menu-icon pf-ic mt-${tone}`}><Icon name={icon} size={size} strokeWidth={1.9} /></span>;
  return <>
    <SubHeader title={tr('Profile')} onBack={() => (c.goBack || go)('Menu')} right={<button type="button" className="round-button" aria-label={tr('Settings')} onClick={() => go('Settings')}><Icon name="gearSolid" size={19} /></button>} />
    <div className="card profile-card-wrap">
      <button type="button" className="profile-card" onClick={() => go('EditProfile')} aria-label={tr('Edit profile')}>
        <ProfileAvatar user={user} size="big"><i><Icon name="camera" size={13} /></i></ProfileAvatar>
        <span className="profile-text"><strong>{user.name}</strong><small>{maskEmail(user.email)}</small>{(c.plan === 'pro' || c.plan === 'pro_plus') && <em className="plan-pill"><PlanBadge plan={c.plan} trial={c.entitlement?.source === 'trial'} size={18} label /></em>}</span>
        <span className="profile-edit-icon" aria-hidden="true"><Icon name="edit" size={17} /></span>
      </button>
      {/* Only for someone not signed in: a signed-in person in local or offline mode is still signed in. */}
      {!session?.user && c.supabaseConfigured && <button type="button" className="primary-button profile-signin" onClick={() => go('Sign in')}><Icon name="user" size={18} /> {tr('Sign in')}</button>}
    </div>
    <div className="profile-social-actions" aria-label={tr('Friends and referrals')}>
      <button type="button" className="card profile-social-action" onClick={c.openFriends}>
        <span className="profile-social-icon"><Icon name="userPlus" size={20} /></span>
        <strong>{tr('Friends')}</strong>
        <small>{tr('Add a friend')}</small>
      </button>
      <button type="button" className="card profile-social-action" onClick={() => setReferralOpen(true)}>
        <span className="profile-social-icon"><Icon name="gift" size={20} /></span>
        <strong>{tr('Refer MOVO')}</strong>
        <small>{tr('Code and QR')}</small>
      </button>
    </div>
    <section className="card profile-overview" aria-label={tr('Profile summary')}>
      <div className="po-head"><strong>{tr('Overview')}</strong>{monthName && <small>{monthName}</small>}</div>
      <div className="po-main">
        <small>{tr('Total Balance')}</small>
        <strong>{shown(show, money(stats.balance, c.base))}</strong>
        {meaningful(deltas.balance) && <Trend value={deltas.balance} chip size={11} />}
      </div>
      <div className="po-split">
        {[['Income', 'arrowDown', 'green', 'income', stats.income, deltas.income], ['Expenses', 'arrowUp', 'red', 'expense', stats.expenses, deltas.expenses]].map(([label, icon, tone, kind, value, d]) =>
          <div className={`po-stat po-${kind}`} key={label}>
            {ic(icon, tone, 16)}
            <span className="po-text"><small>{tr(label)}</small><strong>{shown(show, money(value, c.base))}</strong></span>
            {meaningful(d) && <Trend value={d} size={10} />}
          </div>)}
      </div>
    </section>

    <div className="adaptive-settings-grid">
      <div>
        <SectionTitle action={tr('See All')} onAction={() => go('Wallet')}>{tr('Accounts')}</SectionTitle>
        <section className="card menu-card">
          {rows.map(([label, icon, list, filter]) => <button type="button" key={label} className="menu-row" onClick={() => { c.setWalletFilter(filter); go('Wallet'); }}>
            {ic(icon, { bank: 'blue', card: 'purple', wallet: 'teal' }[icon])}<span className="menu-main"><strong>{tr(label)}</strong><small>{open(list).length === 1 ? tr('1 account') : tr('{n} accounts', { n: open(list).length })}</small></span><b>{shown(show, money(sum(list), c.base))}</b><Icon name="chevron" size={16} />
          </button>)}
        </section>
      </div>
      <div>
        <SectionTitle>{tr('Settings')}</SectionTitle>
        <section className="card menu-card">
          {menu.map(([icon, tone, label, view, sub]) => <button type="button" key={label} className="menu-row" onClick={() => go(view)}>{ic(icon, tone)}<span className="menu-main"><strong>{tr(label)}</strong><small>{tr(sub)}</small></span><Icon name="chevron" size={16} /></button>)}
        </section>

      </div>
      <div>
        <SectionTitle action={tr('See All')} onAction={() => go('Appearance')}>{tr('App Appearance')}</SectionTitle>
        <ThemePicker c={c} compact />

      </div>
      <div>
        <SectionTitle>{tr('Data & Sync')}</SectionTitle>
        <section className="card menu-card">
          <button type="button" className="menu-row" onClick={() => c.cloudMode ? c.notify('Cloud sync is active for this signed-in account. Sign out to use local-only mode.') : go(session?.user ? 'Settings' : 'Sign in')}>
            {ic('cloud', 'blue')}<span className="menu-main"><strong>{tr('Cloud Sync')}</strong><small>{c.cloudMode ? tr('Active for your signed-in account') : session?.user ? (c.syncState?.message || tr('Changes are kept on this device until safely reconciled.')) : tr('Sign in to use cloud storage')}</small></span><span className="pill tone-blue">{c.cloudMode ? tr('Active') : session?.user ? tr('Off') : tr('Sign in')}</span><Icon name="chevron" size={16} />
          </button>
          <div className="menu-row">{ic('database', 'gray')}<span className="menu-main"><strong>{tr('Local Storage')}</strong><small>{tr('Kept in this browser. Not synced or encrypted by MOVO.')}</small></span><span className="pill tone-gray">{tr('Automatic')}</span></div>
        </section>
      </div>
      <div>
        <SectionTitle>{tr('About')}</SectionTitle>
        <section className="card menu-card">
          {[['star', 'MOVO App', 'Version 1.0.0'], ['doc', 'Terms of Service'], ['shield', 'Privacy Policy']].map(([icon, title, sub]) => {
            const action = title === 'Terms of Service' ? () => c.openLegal?.('TermsOfService') : title === 'Privacy Policy' ? () => c.openLegal?.('PrivacyPolicy') : null;
            const Tag = action ? 'button' : 'div';
            return <Tag key={title} type={action ? 'button' : undefined} className="menu-row" onClick={action}>
              {ic(icon, 'gray')}<span className="menu-main"><strong>{tr(title)}</strong>{sub && <small>{tr(sub)}</small>}</span>{action && <Icon name="chevron" size={16} />}
            </Tag>;
          })}
        </section>
        <section className="card menu-card gap">
          <button type="button" className="menu-row" onClick={exportCsv}>{ic('download', 'green')}<span className="menu-main"><strong>{tr('Export transactions (CSV)')}</strong></span><Icon name="chevron" size={16} /></button>
          {session && <button type="button" className="menu-row" onClick={revokeOtherDevices} disabled={revokingOtherSessions} aria-busy={revokingOtherSessions}>
            {ic('shield', 'orange')}
            <span className="menu-main"><strong>{tr('Sign out of other devices')}</strong><small>{tr('Keep this device signed in')}</small></span>
            <Icon name="chevron" size={16} />
          </button>}
          {session ? <button type="button" className="menu-row danger" onClick={signOutNow}>{ic('logout', 'red')}<span className="menu-main"><strong>{tr('Log out')}</strong></span></button>
            : null}
        </section>
      </div>
    </div>
    {referralOpen && <ReferralSheet key={session?.user?.id || 'guest'} session={session} entitlement={c.entitlement} onPlanChanged={c.refreshEntitlement} onClose={() => setReferralOpen(false)} onSignIn={() => { setReferralOpen(false); go('Sign in'); }} notify={c.notify} />}
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
  const confirm = useConfirm();
  const photoInput = useRef(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const savePhoto = async (file) => {
    if (photoBusy) return;
    setPhotoBusy(true);
    setPhotoError('');
    try {
      const photo = file ? await cropProfilePhoto(file) : '';
      await c.saveProfilePhoto(photo);
      c.notify(tr(photo ? 'Profile photo updated.' : 'Profile photo removed.'));
    } catch (cause) {
      setPhotoError(cause?.message === 'invalid_profile_photo'
        ? tr('This image could not be opened. Try a JPG, PNG or WebP photo.')
        : tr('Could not save your profile photo. Check your connection and try again.'));
    } finally { setPhotoBusy(false); }
  };
  const handlePhotoFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 20 * 1024 * 1024 || !(/^(image\/(jpeg|png|webp|heic|heif))$/i.test(file.type) ||
      (!file.type && /\.(jpe?g|png|webp|hei[cf])$/i.test(file.name)))) {
      setPhotoError(tr('Choose a JPG, PNG, WebP or HEIC image under 20 MB.'));
      return;
    }
    savePhoto(file);
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
        <ProfileAvatar user={{ ...user, initial: (draft.profileName.trim() || user.name).slice(0, 1).toUpperCase() }} size="huge" />
        <div className="ep-photo-actions">
          <button type="button" className="link-button" disabled={photoBusy} onClick={() => photoInput.current?.click()}><Icon name="camera" size={16} /> {tr(photoBusy ? 'Saving…' : 'Change photo')}</button>
          {user.photo && <button type="button" className="link-button" disabled={photoBusy} onClick={async () => {
            if (await confirm({ title: tr('Remove your photo?'), message: tr('You can add a new profile photo at any time.'), confirmLabel: tr('Remove'), danger: true, icon: 'user' })) savePhoto(null);
          }}>{tr('Remove photo')}</button>}
        </div>
        <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" hidden onChange={handlePhotoFile} />
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
