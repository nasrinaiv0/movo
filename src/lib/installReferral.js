import { MovoNative } from './native';
import { nativePlatform } from './platform';
import { normalizeReferralCode, pendingReferralCode, savePendingReferralCode, PENDING_REFERRAL_EVENT } from './referrals';

/*
 * A friend's code that came through a Google Play download link (owner, 2026-11-12). The QR code and share link send
 * Android phones to Google Play with referrer "utm_source=movo_referral&utm_medium=qr&movo_ref=M78038" (api/download.js).
 * On the first launch of the Android app, MOVO asks Google Play for that referrer once, keeps only a valid referral
 * code from it, and fills it in where a friend's code is entered (plans panel, Refer MOVO). Nothing is sent anywhere
 * here; the code only counts once the person signs in and the server accepts it.
 * iPhone has no equivalent: its download page shows the code and copies it when tapped.
 */
const CHECKED_KEY = 'movo.installReferrer.v1';

/** "utm_source=movo_referral&utm_medium=qr&movo_ref=M78038" → "M78038"; null for anything else. */
export function referralFromInstallReferrer(referrer) {
  if (typeof referrer !== 'string' || !referrer || referrer.length > 1024) return null;
  let params;
  try { params = new URLSearchParams(referrer); } catch { return null; }
  if (params.get('utm_source') !== 'movo_referral') return null;
  return normalizeReferralCode(params.get('movo_ref') || '');
}

/** Runs once per install on Android; returns the code it kept, or null. */
export async function captureInstallReferral() {
  if (nativePlatform() !== 'android') return null;
  try { if (window.localStorage.getItem(CHECKED_KEY)) return null; } catch { return null; }
  let referrer = '';
  try {
    ({ referrer = '' } = (await MovoNative.installReferrer()) || {});
  } catch {
    return null; // an app build without this bridge, or Play busy: try again on the next launch
  }
  try { window.localStorage.setItem(CHECKED_KEY, new Date().toISOString()); } catch { /* storage blocked */ }
  const code = referralFromInstallReferrer(referrer);
  if (!code || pendingReferralCode()) return null; // a code from a link the person opened themselves stays
  savePendingReferralCode(code);
  try { window.dispatchEvent(new CustomEvent(PENDING_REFERRAL_EVENT, { detail: code })); } catch { /* no window */ }
  return code;
}
