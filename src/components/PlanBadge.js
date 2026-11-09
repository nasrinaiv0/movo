import React from 'react';
import { MovoMark } from './MovoLogo';
import { BADGES, TIER_LABEL } from '../lib/streak';
import { t as tr } from '../lib/i18n';

/*
 * Plan badge: Pro wears the Gold MOVO badge and Pro+ the Platinum one, the same artwork as the Gold and Platinum
 * streak badges (shown only for a server-verified plan; Free shows nothing).
 */
const PLAN_TIER = { pro: 'max', pro_plus: 'ultra' };
const PLAN_NAME = { pro: 'Pro', pro_plus: 'Pro+' };

export function planBadge(plan) {
  const tier = PLAN_TIER[plan];
  if (!tier) return null;
  return { tier, color: BADGES.find(b => b.tier === tier)?.color, label: TIER_LABEL[tier], plan: PLAN_NAME[plan] };
}

export default function PlanBadge({ plan, size = 26, label = false, className = '' }) {
  const badge = planBadge(plan);
  if (!badge) return null;
  const name = `${tr(badge.label)} · ${badge.plan}`;
  return <span className={`plan-badge${label ? ' with-label' : ''} ${className}`.trim()}>
    <span className={`streak-badge plan-badge-mark tier-${badge.tier} earned`} style={{ '--badge': badge.color, '--plan-badge': `${size}px` }}
      role={label ? undefined : 'img'} aria-label={label ? undefined : name} aria-hidden={label ? true : undefined}>
      <MovoMark size={Math.round(size * 0.56)} tone="white" />
    </span>
    {label && <span className="plan-badge-text">{badge.plan}<small>{tr(badge.label)}</small></span>}
  </span>;
}
