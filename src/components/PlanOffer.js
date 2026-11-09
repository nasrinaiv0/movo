import React, { useRef, useState } from 'react';
import Icon from './Icon';
import { canAnimate } from '../lib/motion';
import { Sheet } from './ui';
import PlanBadge from './PlanBadge';
import { apiUrl } from '../lib/platform';
import { PLAN_LABELS, effectivePlan } from '../lib/planAccess';
import { t as tr } from '../lib/i18n';

/*
 * MOVO plans: a compact comparison (swipe or tap a tab) and the first-month-free offer. Every verified first-time
 * account gets one month of Pro (server rule: claim_movo_trial); App.js starts it automatically after this sheet
 * if the person did not claim it here, so a referral code can still be entered first.
 */
const PLAN_CARDS = [
  { name: 'Free', tagline: 'On this device', features: ['Unlimited records on this device', 'Export & import', 'Receipt attachments', 'NasrinAI answers from your records'] },
  { name: 'Pro', tagline: 'Sync and insights', features: ['Cloud Sync', 'Insights & briefings', 'Full NasrinAI', 'Receipt scanner', 'Portrait cards & animations', 'Custom Money Flow', 'Premium card styles & uploads', 'Gold badges'] },
  { name: 'Pro+', tagline: 'Everything, automated', features: ['Everything in Pro', 'Automatic logging', 'Glow and motion finish', 'Platinum badges'], future: 'Premium mascots and advanced widgets arrive in a future release. The current ram stays the same.' },
];

export function PlanComparison() {
  const rail = useRef(null);
  const [active, setActive] = useState(0);
  const select = index => { setActive(ind¶»§q«^