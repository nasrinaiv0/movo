import { supabase, supabaseConfigured } from './supabaseClient';
import { t as tr } from './i18n';

/*
 * MOVO plans (owner spec 2026-11-03): Free, Pro and Pro+.
 *
 * The plan comes from the server (`my_movo_plan`, migration 20261104010000_plans_entitlements), which is also where
 * every rule that protects data or costs money is enforced: cloud writes, premium card styles, phone automation and
 * full NasrinAI. The checks here only shape the interface. A cached copy is kept for offline display, never trusted
 * by the server.
 *
 * Before the plans migration exists on the server, a signed-in person keeps everything as it was (`legacy`), so the
 * app can ship before the database is updated without locking anyone out.
 */
export const PLAN_LABEL = { free: 'Free', pro: 'Pro', pro_plus: 'Pro+' };
const RANK = { free: 0, pro: 1, pro_plus: 2, legacy: 3 };

/** Minimum plan for each locked feature. Anything not listed is free. */
export const FEATURES = {
  cloud: 'pro', // sync and back up records in the cloud (Free keeps them on the device, with export / import)
  portraitCards: 'pro',
  cardAnimations: 'pro', // card stack / cylinder motion; Free gets a short crossfade
  insights: 'pro', // insights and the daily briefing
  customRange: 'pro', // the Custom range in Money flow
  uploads: 'pro', // upload your own card style or scenery
  premiumStyles: 'pro', // card styles from the premium-stickers collection
  nasrinaiFull: 'pro', // the model, history and voice; Free answers from saved records
  receiptScan: 'pro', // scanning with the camera (uploading a receipt stays free)
  automation: 'pro_plus', // Apple Pay, bank-notification and Siri logging
  premiumLook: 'pro_plus', // glow finishes and extra motion
};

/** What each locked feature is called in the plans sheet. */
export const FEATURE_LABEL = {
  cloud: 'Cloud sync and backup',
  portraitCards: 'Portrait card format',
  cardAnimations: 'Card animations',
  insights: 'Insights and daily briefings',
  customRange: 'Custom range in Money flow',
  uploads: 'Upload your own card styles and sceneries',
  premiumStyles: 'Premium card styles',
  nasrinaiFull: 'Full NasrinAI with chat history and voice',
  receiptScan: 'Receipt scanning with the camera',
  automation: 'Automatic logging from Apple Pay, bank notifications and Siri',
  premiumLook: 'Glow finishes and extra animations',
};

export const normalizePlan = (plan) => (plan === 'pro' || plan === 'pro_plus' || plan === 'legacy' ? plan : 'free');
export const can = (plan, feature) => RANK[normalizePlan(plan)] >= RANK[FEATURES[feature] || 'free'];
export const requiredPlan = (feature) => FEATURES[feature] || 'free';

const CACHE = 'movo.plan.v1';
export function cachedPlan(userId) {
  try { const v = JSON.parse(localStorage.getItem(CACHE)); return v && v.userId === userId ? v.info : null; } catch { return null; }
}
function remember(userId, info) { try { localStorage.setItem(CACHE, JSON.stringify({ userId, info })); } catch { /* storage unavailable */ } }
export function forgetPlan() { try { localStorage.removeItem(CACHE); } catch { /* storage unavailable */ } }

const missingFunction = (error) => error && (error.code === 'PGRST202' || error.code === '42883' || /could not find the function/i.test(String(error.message || '')));

/** The signed-in person's plan and referral progress, or { plan: 'legacy' } before the plans migration. */
export async function fetchPlan(userId) {
  if (!supabaseConfigured || !supabase || !userId) return { plan: 'free' };
  const { data, error } = await supabase.rpc('my_movo_plan');
  if (missingFunction(error)) return { plan: 'legacy' };
  if (error) { const cached = cachedPlan(userId); if (cached) return { ...cached, offline: true }; throw error; }
  const info = { ...data, plan: normalizePlan(data?.plan) };
  remember(userId, info);
  return info;
}

/** A salted hash of this install's random id: one trial per device, without sending the id itself. */
export async function deviceHash() {
  let id = '';
  try { id = localStorage.getItem('movo.device.v1') || ''; if (!id) { id = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`; localStorage.setItem('movo.device.v1', id); } } catch { id = 'this-device'; }
  const bytes = new TextEncoder().encode(`movo-trial-v1:${id}`);
  const digest = await window.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

const PLAN_ERRORS = {
  trial_already_claimed: 'You have already used your free month of Pro.',
  trial_not_available: 'The free month is for new MOVO members.',
  trial_device_used: 'The free month was already claimed on this device.',
  referral_code_invalid: 'That referral code was not found. Check it and try again.',
  referral_self: 'You cannot use your own referral code.',
  referral_already_applied: 'You have already used a referral code.',
  referral_too_late: 'Referral codes can only be used before your first subscription.',
  plan_required: 'This needs MOVO Pro. Your records stay safe: you can still view, export and delete them.',
};
const errorCode = (error) => Object.keys(PLAN_ERRORS).find(code => String(error?.message || '') === code || String(error?.message || '').includes(code));
export const planErrorMessage = (error) => { const code = errorCode(error); return code ? tr(PLAN_ERRORS[code]) : tr('Something went wrong. Please try again.'); };

/** Cloud writes refused because the plan ended become a readable message (used by the repositories). */
export function planAwareError(error) {
  if (error && errorCode(error) === 'plan_required') { const e = new Error(tr(PLAN_ERRORS.plan_required)); e.code = 'plan_required'; return e; }
  return error;
}

async function call(fn, args, userId) {
  if (!supabaseConfigured || !supabase) throw new Error('not_configured');
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  const info = { ...data, plan: normalizePlan(data?.plan) };
  if (userId) remember(userId, info);
  return info;
}
export const claimTrial = async (userId) => call('claim_pro_trial', { p_device_hash: await deviceHash() }, userId);
export const applyReferral = (code, userId) => call('apply_referral_code', { p_code: String(code || '').trim().toUpperCase() }, userId);

/** Referral codes use 8 letters and digits without 0, O, 1 and I. */
export const REFERRAL_CODE = /^[A-HJ-NP-Z2-9]{8}$/;
