import React from 'react';
import { MovoMark } from './MovoLogo';
import { t as tr } from '../lib/i18n';

/*
 * Plan badge: the MOVO logo in the plan's colour on a dark tile, like the badge app icons. Pro is Gold, Pro+ is
 * Platinum, and the free month of Pro shows the white logo. Shown only for a server-verified plan; Free shows none.
 */
const PLAN_STYLE = {
  pro: { tone: 'gold', label: 'Gold', plan: 'Pro' },
  pro_plus: { tone: 'platinum', label: 'Platinum', plan: 'Pro+' },
};

export function planBadge(plan, trial = false) {
  const style = PLAN_STYLE[plan];
  if (!style) return null;
  return trial && plan === 'pro' ? { tone: 'white', label: 'Free month', plan: 'Pro' } : style;
}

export default function PlanBadge({ plan, trial = false, size = 26, label = false, className = '' }) {
  const badge = planBadge(plan, trial);
  if (!badge) return null;
  const name = `${tr(badge.label)} · ${badge.plan}`;
  return <span className={`plan-badge${label ? ' with-label' : ''} ${className}`.trim()}>
    <span className={`plan-badge-mark tone-${badge.tone}`} style={{ '--plan-badge': `${size}px` }}
      role={label ? undefined : 'img'} aria-label={label ? undefined : name} aria-hidden={label ? true : undefined}>
      <MovoMark size={Math.round(size * 0.62)} tone={badge.tone} />
    </span>
    {label && <span className="plan-badge-text">{badge.plan}<small>{tr(badge.label)}</small></span>}
  </span>;
}
