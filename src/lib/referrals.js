import { AppAttest } from '@capgo/capacitor-app-attest';
import { apiUrl, isNativeApp } from './platform';

async function request(path, token, method = 'GET', body) {
  const response = await fetch(apiUrl(path), {
    method,
    headers: { Authorization: 'Bearer ' + token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'referral_service_unavailable');
  return data;
}
export const getReferralStatus = session => request('/api/referrals/status', session.access_token);
export const createReferralInvite = session => request('/api/referrals/invite', session.access_token, 'POST', {});
export const claimReferralInvite = (session, token) => request('/api/referrals/claim', session.access_token, 'POST', { token });

/** Native-only: fail closed unless Apple/Google can verify a signed, challenge-bound proof.
 * This is best-effort from app startup; the server alone awards points.
 */
export async function activateNativeReferral(session) {
  if (!isNativeApp() || !session?.access_token) return false;
  const status = await getReferralStatus(session);
  if (!status.pendingNativeProof) return false;
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
