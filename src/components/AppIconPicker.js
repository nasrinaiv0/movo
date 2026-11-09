import React, { useState } from 'react';
import Icon from './Icon';
import { MovoMark } from './MovoLogo';
import { APP_ICONS, appIconById, appIconLockReason, appIconsAvailable } from '../lib/appIcons';
import { setNativeAppIcon } from '../lib/native';
import { isNativeApp } from '../lib/platform';
import { t as tr } from '../lib/i18n';

/** The MOVO mark in an icon's colours on its tile, as it appears on the home screen. */
export function AppIconPreview({ icon, size = 60 }) {
  return <span className={`app-icon-preview icon-${icon.id}`} style={{ '--app-icon': `${size}px`, background: icon.bg }} aria-hidden="true">
    <MovoMark size={Math.round(size * 0.62)} tone={icon.tone} />
  </span>;
}

/*
 * Home-screen icon from MOVO badges: a subscriber uses any badge they have unlocked as the app icon (Pro: Bronze,
 * Silver and Gold right away; Pro+: Platinum too; a longer streak can unlock a higher badge). The iPhone app switches
 * the icon; elsewhere the choice is saved and applied in the iPhone app.
 */
export default function AppIconPicker({ c }) {
  const { prefs, setPref } = c;
  const plan = c.subscriptionPlan || c.plan;
  const [message, setMessage] = useState('');
  const current = appIconById(prefs.appIcon).id;
  const choose = async icon => {
    const lock = appIconLockReason(icon, prefs.streak, plan);
    if (lock?.kind === 'plan') { c.openPlans?.(); return; }
    if (lock) { setMessage(tr('Keep a {n}-day streak to unlock this icon.', { n: lock.days })); return; }
    setPref('appIcon', icon.id);
    if (!isNativeApp()) { setMessage(tr('Saved. The home-screen icon changes in the MOVO iPhone app.')); return; }
    const changed = await setNativeAppIcon(icon.native);
    setMessage(changed ? '' : tr('This device could not change the app icon.'));
  };
  return <section className="card pad app-icon-picker" aria-label={tr('App icon')}>
    <div className="app-icon-grid" role="radiogroup" aria-label={tr('App icon')}>
      {APP_ICONS.map(icon => {
        const lock = appIconLockReason(icon, prefs.streak, plan);
        return <button type="button" role="radio" aria-checked={current === icon.id} key={icon.id}
          className={`app-icon-option${current === icon.id ? ' selected' : ''}${lock ? ' locked' : ''}`} onClick={() => choose(icon)}>
          <span className="app-icon-frame"><AppIconPreview icon={icon} />{lock && <span className="app-icon-lock"><Icon name="lock" size={12} strokeWidth={2.4} /></span>}</span>
          <strong>{tr(icon.name)}</strong>
          <small>{current === icon.id ? tr('In use') : !lock ? tr('Unlocked') : lock.kind === 'plan' ? tr('Pro or Pro+') : tr('{n}-day streak', { n: lock.days })}</small>
        </button>;
      })}
    </div>
    <p className="form-note">{appIconsAvailable(plan)
      ? tr('Badges you unlock become app icons. Pro unlocks up to Gold right away; Pro+ unlocks Platinum.')
      : tr('Subscribe to Pro or Pro+ to use your badges as the app icon, unlocked right after payment.')}</p>
    {message && <p className="form-note" role="status">{message}</p>}
  </section>;
}
