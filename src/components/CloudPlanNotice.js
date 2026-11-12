import React from 'react';
import Icon from './Icon';
import { MovoMark } from './MovoLogo';
import { Sheet } from './ui';
import { t as tr } from '../lib/i18n';

/*
 * Cloud Sync paused for lack of an active plan (owner, 2026-11-12): a calm premium panel instead of a red banner at
 * the top. It says the records are safe on this device and offers MOVO plans. App.js shows it at most once a day.
 */
const POINTS = [
  ['lock', 'Your records stay on this device'],
  ['shield', 'Nothing is deleted'],
  ['refresh', 'Sync starts again as soon as Pro is active'],
];

export default function CloudPlanNotice({ onPlans, onClose }) {
  return <Sheet title="" label={tr('Cloud Sync is paused')} onClose={onClose} center hideClose className="cloud-plan-notice">
    <div className="cpn-art" aria-hidden="true"><span className="cpn-glow" /><MovoMark size={46} /><span className="cpn-cloud"><Icon name="cloud" size={16} /></span></div>
    <h2 className="cpn-title">{tr('Cloud Sync is paused')}</h2>
    <p className="cpn-text">{tr('Your records are safe on this device. Start or renew Pro to sync them across your devices.')}</p>
    <ul className="cpn-points">{POINTS.map(([icon, text], i) => <li key={icon} style={{ '--i': i }}><span className="cpn-point-icon" aria-hidden="true"><Icon name={icon} size={15} /></span>{tr(text)}</li>)}</ul>
    <div className="cpn-actions">
      <button type="button" className="primary-button cpn-primary" onClick={onPlans}>{tr('View plans')}</button>
      <button type="button" className="link-button cpn-later" onClick={onClose}>{tr('Not now')}</button>
    </div>
  </Sheet>;
}
