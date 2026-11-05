import React, { useState } from 'react';
import Icon from './Icon';
import AccountPicker from './AccountPicker';
import { Sheet, Toggle } from './ui';
import { shortcutRecipe, shortcutPrompt, linkTemplate } from '../lib/autoLog';
import { t as tr } from '../lib/i18n';
import { appOrigin } from '../lib/platform';

/*
 * Automatic logging: registration status, the default account for unmatched card names, and the exact iPhone
 * Shortcuts recipe for the chosen setup: bank and e-wallet app notifications (the default; iOS 27 Notification
 * trigger), Apple Pay, or Siri voice, each fully automatic or with Log / Skip. The recipe on
 * screen and the copied prompt come from the same source (lib/autoLog.js); the device key is masked on screen and only
 * included in what is copied.
 */
const MODES = [
  ['notifications', 'bell', 'Bank notifications', 'GCash, Maya and bank apps'],
  ['applepay', 'card', 'Apple Pay', 'Logs every payment'],
  ['voice', 'mic', 'Siri voice', '“Hey Siri, Log to MOVO”'],
];
export const recipeMode = (source, automatic) => {
  if (source === 'applepay') return automatic ? 'automatic' : 'interactive';
  if (source === 'voice') return automatic ? 'voice' : 'voice-interactive';
  return automatic ? 'notifications-automatic' : 'notifications';
};
const STATUS = {
  ready: ['tone-green', 'check', 'Registered for background logging'],
  registering: ['tone-blue', 'refresh', 'Registering this device…'],
  error: ['tone-red', 'info', 'Could not register this device'],
  'needs-signin': ['tone-gray', 'cloud', 'Sign in with cloud storage to use background logging'],
};

export default function AutoLogSheet({ showBalance = true, prefs, setPref, status, accounts = [], cloudMode, notify, onResetKey, onClose }) {
  const [mode, setMode] = useState('notifications');
  const selectedRecipeMode = recipeMode(mode, Boolean(prefs.autoLog));
  const key = prefs.autoLogKey || '';
  const origin = appOrigin();
  const masked = key ? `${key.slice(0, 4)}••••${key.slice(-4)}` : '…';
  const recipe = shortcutRecipe(origin, masked, selectedRecipeMode);
  const copy = (text, done) => navigator.clipboard?.writeText(text).then(() => notify(done), () => notify(tr('Could not copy the prompt. Please try again.')));
  const [tone, icon, label] = STATUS[status] || STATUS['needs-signin'];
  const cloudAccounts = accounts.filter(a => /^[0-9a-f-]{36}$/i.test(String(a.id)));

  return <Sheet title={tr('Automatic logging')} subtitle={tr('Log Apple Pay payments, Siri voice entries and bank notifications straight into MOVO.')} onClose={onClose} label={tr('Automatic logging')} className="autolog-sheet">
    <section className="card al-card al-status">
      <div className={`al-chip ${tone}`} role="status" aria-live="polite"><Icon name={icon} size={14} strokeWidth={2.4} /> {tr(label)}</div>
      <div className="al-row"><span className="al-row-text"><strong>{tr('Log without asking')}</strong><small>{prefs.autoLog ? tr('Payments are added instantly.') : tr('MOVO asks you to confirm each payment.')}</small></span><Toggle checked={prefs.autoLog} onChange={v => setPref('autoLog', v)} label={tr('Log without asking')} /></div>
    </section>

    {cloudMode && cloudAccounts.length > 0 && <section className="al-default">
      <AccountPicker id="al-default-account" label={tr('Default account')} accounts={cloudAccounts} value={prefs.autoLogAccount || ''} showBalance={showBalance} placeholder={tr('Match by bank account')} onChange={v => setPref('autoLogAccount', v)} />
      <small className="al-hint">{tr('Card payments log to the bank account of the same bank. This default is used when none matches.')}</small>
    </section>}

    <div className="al-modes" role="radiogroup" aria-label={tr('Choose automation style')}>
      {MODES.map(([id, ic, title, sub]) => <button type="button" role="radio" key={id} aria-checked={mode === id} className={`al-mode${mode === id ? ' selected' : ''}`} onClick={() => setMode(id)}>
        <span className="al-mode-icon"><Icon name={ic} size={18} /></span><strong>{tr(title)}</strong><small>{tr(sub)}</small>
      </button>)}
    </div>

    <section className="card al-card al-recipe" aria-label={tr('Shortcut steps')}>
      <div className="al-recipe-head"><span className="al-name"><Icon name="spark" size={14} strokeWidth={2.2} /> {recipe.name}</span></div>
      <ol className="al-steps">
        <li className="al-trigger"><span>{recipe.trigger}</span></li>
        {recipe.steps.map(step => {
          // "Action — setting · setting · …" reads as the action name with one setting per line.
          const cut = step.indexOf(' — ');
          const action = cut < 0 ? step : step.slice(0, cut); const rest = cut < 0 ? '' : step.slice(cut + 3);
          return <li key={step}><strong className="al-action">{action}</strong>{rest && <span className="al-settings">{rest.replace(/\.$/, '').split(' · ').map(part => <span key={part}>{part}</span>)}</span>}</li>;
        })}
      </ol>
      <div className="al-actions">
        <button type="button" className="primary-button" disabled={!key} onClick={() => copy(shortcutPrompt(origin, key, selectedRecipeMode), tr('Prompt copied. Paste it into Describe a shortcut.'))}><Icon name="doc" size={16} /> {tr('Copy prompt')}</button>
        <button type="button" className="secondary-button" disabled={!key} onClick={() => copy(`Bearer ${key}`, tr('Authorization value copied.'))}><Icon name="lock" size={16} /> {tr('Copy key')}</button>
      </div>
      <small className="al-hint">{tr('Paste the prompt into Describe a shortcut (Apple Intelligence), or add the steps above yourself. Test with one small payment first.')}</small>
    </section>

    <details className="al-more">
      <summary>{tr('Advanced')}</summary>
      <small className="al-hint">{tr('Review link: opens MOVO to confirm instead of logging in the background.')}</small>
      <code className="al-code">{linkTemplate(origin, masked)}</code>
      <div className="al-actions">
        <button type="button" className="secondary-button" onClick={onResetKey}><Icon name="refresh" size={16} /> {tr('Reset key')}</button>
        <button type="button" className="secondary-button" disabled={!key} onClick={() => copy(linkTemplate(origin, key), tr('Review link copied.'))}><Icon name="doc" size={16} /> {tr('Copy review link')}</button>
      </div>
    </details>
  </Sheet>;
}
