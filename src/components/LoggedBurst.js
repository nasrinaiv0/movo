import React, { useEffect } from 'react';
import { MovoMark } from './MovoLogo';
import Icon from './Icon';
import { canAnimate } from '../lib/motion';
import { t as tr } from '../lib/i18n';

/** A short, calm "saved" moment with the Movo wallet mark, shown when a transaction is logged. */
export default function LoggedBurst({ id, label, badge, onDone }) {
  useEffect(() => {
    if (!id) return undefined;
    const timer = setTimeout(onDone, canAnimate() ? (badge ? 2600 : 1500) : 900);
    return () => clearTimeout(timer);
  }, [id, badge, onDone]);
  if (!id) return null;
  if (badge) return <div key={id} className="logged-burst badge-burst" role="status" aria-live="polite">
    <span className="streak-badge earned unlocking" style={{ '--badge': badge.color }}><Icon name={badge.icon} size={26} strokeWidth={2} /></span>
    <strong>{label}</strong>
  </div>;
  return <div key={id} className="logged-burst" role="status" aria-live="polite">
    <span className="logged-mark"><MovoMark size={46} /><svg className="logged-check" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" /><path d="M7 12.5l3.2 3.2L17 9" /></svg></span>
    <strong>{label || tr('Transaction logged')}</strong>
  </div>;
}
