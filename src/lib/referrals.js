import { AppAttest } from '@capgo/capacitor-app-attest';
import { apiUrl, appOrigin, isNativeApp } from './platform';

/*
 * Referrals. Everyone has one short, reusable code: "M" + five digits (M78038); the five characters continue
 * with 0-9 and A-Z without I and O once digit codes run short. Keep in step with api/lib/referralCode.js and the
 * SQL check constraint. The server decides everything: links, eligibility and points.
 */
export const REFERRAL_CODE = /^M[0-9A-HJ-NP-Z]{5}$/;
const LEGACY_CODE = /^[a-f0-9]{24}$/;
const PENDING_KEY = 'movo.pendingReferral.v1';

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
  return `${appOrigin()}/api/download?${params}`;
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
export function savePendingReferralCode(value) {
  const code = normalizeReferralCode(value || '');
  try { if (code) window.localStorage.setItem(PENDING_KEY, code); } catch { /* storage blocked: nothing to keep */ }
  return code;
}
export function clearPendingReferralCode() {
  try { window.localStorage.removeItem(PENDING_KEY); } catch { /* nothing stored */ }
}

async function request(path, token, method = 'GET', body) {
  const response = await fetch(apiUrl(path), {
    method,
    headers: { Authorization: 'Bearer ' + token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
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
/** Every 500 points become one month of Pro; the server checks the balance and queues the months. */
export const POINTS_PER_MONTH = 500;
export const redeemReferralPoints = (session, months = 1) => request('/api/referrals/redeem', session.access_token, 'POST', { months });

/** Native-only: fail closed unless Apple/Google can verify a signed, challenge-bound proof.
 * This is best-effort from app startup; the server alone awards points.
 */
export async function activateNativeReferral(session) {
  if (!isNativeApp() || !session?.access_token) return false;
  const status = await getReferralStatus(session);
  if (!status.pointsEnabled || !status.pendingNativeProof) return false;
  const capability = await AppAttest.isSupported();
  if (!capability?.isSupported) return false;
  const payload = await request('/api/referrals/challenge', session.access_token, 'POST', {});
  const cloudProjectNumber = process.env.REACT_APP_GOOGLE_PLAY_CLOUD_PROJECT_NUMBER || undefined;
  const prepared = await AppAttest.prepare(cloudProjectNumber ? { cloudProjectNumber } : undefined);
  const proof = await AppAttest.createAttestation({
    keyId: prepared.keyId, challenge: payload.challenge,
    ...(cloudProjectNumber ? { cloudProjectNumber } : {})
  });
  const activated = await request('/api/referrals/activate', session.access_token, 'POST', {
    challengeId: payload.challengeId, challenge: payload.challenge,
    platform: proof.platform, format: proof.format, token: proof.token, keyId: proof.keyId,
  });
  return Boolean(activated.verified);
}
