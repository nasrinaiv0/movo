import { AppAttest } from '@capgo/capacitor-app-attest';
import { apiUrl, appOrigin, isNativeApp } from './platform';
import { newRecordId } from './recordId';

/*
 * Referrals. Everyone has one short, reusable code: "M" + five digits (M78038); the five characters continue
 * with 0-9 and A-Z without I and O once digit codes run short. Keep in step with api/lib/referralCode.js and the
 * SQL check constraint. The server decides everything: links, eligibility and points.
 */
export const REFERRAL_CODE = /^M[0-9A-HJ-NP-Z]{5}$/;
const LEGACY_CODE = /^[a-f0-9]{24}$/;
const PENDING_KEY = 'movo.pendingReferral.v1';
const SUBMIT_AFTER_SIGN_IN_KEY = 'movo.submitReferralAfterSignIn.v1';
/** Fired when a friend's code arrives after the app opened (the Google Play install referrer); detail is the code. */
export const PENDING_REFERRAL_EVENT = 'movo:pending-referral';

/** "m78 038" → "M78038"; null when it is not a referral code. */
export function normalizeReferralCode(value) {
  if (typeof value !== 'string') return null;
  const code = value.replace(/\s+/g, '').toUpperCase();
  return REFERRAL_CODE.test(code) ? code : null;
}

/** What the free month sends: a short code, an older 24-character code, '' for none, null when invalid. */
export function trialReferralCode(value) {
  const trimmed = String(value || '').replace(/\s+/g, '');
  if (!trimmed) return '';
  if (LEGACY_CODE.test(trimmed.toLowerCase())) return trimmed.toLowerCase();
  return normalizeReferralCode(trimmed);
}

/** Download link for one platform; the server sends it to the store, or to the web app until MOVO is listed. */
export function downloadUrl(platform, code) {
  const params = new URLSearchParams({ platform });
  const ref = normalizeReferralCode(code || '');
  if (ref) params.set('ref', ref);
  return new URL(apiUrl(`/api/download?${params}`), appOrigin()).href;
}

/** A friend's code that arrived through a download link (?ref=M78038), kept on this device until it is used. */
export function captureReferralFromUrl(location = typeof window !== 'undefined' ? window.location : null) {
  if (!location?.search) return null;
  const params = new URLSearchParams(location.search);
  if (!params.has('ref') && !params.has('download')) return null;
  const code = normalizeReferralCode(params.get('ref') || '');
  try { if (code) window.localStorage.setItem(PENDING_KEY, code); } catch { /* storage blocked: nothing to keep */ }
  params.delete('ref'); params.delete('download');
  try {
    const rest = params.toString();
    window.history.replaceState(window.history.state, '', `${location.pathname}${rest ? `?${rest}` : ''}${location.hash || ''}`);
  } catch { /* history unavailable: the address keeps the parameters */ }
  return code;
}
export function pendingReferralCode() {
  try { return normalizeReferralCode(window.localStorage.getItem(PENDING_KEY) || '') || ''; } catch { return ''; }
}
/** Keeps a code typed before signing in, so it is still there when the plans panel opens again (owner, 2026-11-12). */
export function savePendingReferralCode(value, { submitAfterSignIn = false } = {}) {
  const code = normalizeReferralCode(value || '');
  try {
    if (code) window.localStorage.setItem(PENDING_KEY, code);
    if (code && submitAfterSignIn) window.localStorage.setItem(SUBMIT_AFTER_SIGN_IN_KEY, code);
  } catch { /* storage blocked: nothing to keep */ }
  return code;
}
export function pendingReferralSubmission() {
  try {
    const code = pendingReferralCode();
    return code === window.localStorage.getItem(SUBMIT_AFTER_SIGN_IN_KEY) ? code : '';
  } catch { return ''; }
}
export function clearPendingReferralCode() {
  try {
    window.localStorage.removeItem(PENDING_KEY);
    window.localStorage.removeItem(SUBMIT_AFTER_SIGN_IN_KEY);
  } catch { /* nothing stored */ }
}

async function request(path, token, method = 'GET', body) {
  const response = await fetch(apiUrl(path), {
    method,
    headers: { Authorization: 'Bearer ' + token, 'X-Movo-Referral-Rewards': '2', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'referral_service_unavailable');
    error.code = data.error || 'referral_service_unavailable';
    throw error;
  }
  return data;
}
export const getReferralStatus = session => request('/api/referrals/status', session.access_token);
export const claimReferralCode = (session, code) => request('/api/referrals/claim', session.access_token, 'POST', { code });
export const REFERRAL_REWARDS = [
  { tier: 'pro', name: 'Pro', points: 500 },
  { tier: 'pro_plus', name: 'Pro+', points: 750 },
];

const pendingRedemptions = new Map();
/** Keep the same request after an interrupted response, including when reopening the sheet. */
export async function redeemReferralPoints(session, tier) {
  const key = `movo.referralRedemption.v1.${session.user.id}.${tier}`;
  let requestId = pendingRedemptions.get(key);
  if (!requestId) {
    try { requestId = window.localStorage.getItem(key); } catch { /* storage unavailable */ }
  }
  if (!requestId) requestId = newRecordId();
  pendingRedemptions.set(key, requestId);
  try { window.localStorage.setItem(key, requestId); } catch { /* retain in memory */ }
  try {
    const result = await request('/api/referrals/redeem', session.access_token, 'POST', { months: 1, tier, requestId });
    pendingRedemptions.delete(key);
    try { window.localStorage.removeItem(key); } catch { /* storage unavailable */ }
    return result;
  } catch (error) {
    if (error.code === 'invalid_redemption_request' || error.code === 'redemption_request_conflict') {
      pendingRedemptions.delete(key);
      try { window.localStorage.removeItem(key); } catch { /* storage unavailable */ }
    }
    throw error;
  }
}

/** Native-only: fail closed unless Apple/Google can verify a signed, challenge-bound proof.
 * This is best-effort from app startup; the server alone awards points.
 */
const nativeReferralChecks = new Map();

export function activateNativeReferral(session) {
  if (!isNativeApp() || !session?.access_token) return Promise.resolve(false);
  const token = session.access_token;
  const active = nativeReferralChecks.get(token);
  if (active) return active;
  const check = verifyNativeReferral(session).finally(() => nativeReferralChecks.delete(token));
  nativeReferralChecks.set(token, check);
  return check;
}

async function verifyNativeReferral(session) {
  const status = await getReferralStatus(session);
  if (!status.pointsEnabled || !status.pendingNativeProof) return false;
  const capability = await AppAttest.isSupported();
  if (!capability?.isSupported) return false;
  const payload = await request('/api/referrals/challenge', session.access_token, 'POST', {});
  const cloudProjectNumber = payload.projectNumber || process.env.REACT_APP_GOOGLE_PLAY_CLOUD_PROJECT_NUMBER || undefined;
  const prepared = await AppAttest.prepare(cloudProjectNumber ? { cloudProjectNumber } : undefined);
  const proof = await AppAttest.createAttestation({
    keyId: prepared.keyId, challenge: payload.challenge,
    ...(cloudProjectNumber ? { cloudProjectNumber } : {})
  });
  if (!proof?.token) return false;
  const activated = await request('/api/referrals/activate', session.access_token, 'POST', {
    challengeId: payload.challengeId, challenge: payload.challenge,
    platform: proof.platform, format: proof.format, token: proof.token, keyId: proof.keyId,
  });
  return Boolean(activated.verified);
}
