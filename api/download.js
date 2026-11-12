'use strict';
const { normalizeReferralCode } = require('./lib/referralCode');

/*
 * Download QR codes and share links point here: /api/download?platform=ios|android&ref=M78038 (owner, 2026-11-12:
 * "linked to the App Store and Google Play with a unique id per user referral").
 *
 *  - Android → Google Play, with the friend's code in Google Play's install referrer
 *    (referrer=utm_source=movo_referral&utm_medium=qr&movo_ref=M78038). The MOVO Android app reads it once on first
 *    launch (src/lib/installReferral.js), so the code is waiting when the friend signs in.
 *  - iPhone → the App Store. Apple passes nothing from a link to the installed app, so when a code is present a short
 *    page shows it first; "Copy code and open the App Store" copies it, and the friend enters it in MOVO.
 *  - No code (signed out) → straight to the store.
 *
 * Store addresses: MOVO_IOS_APP_STORE_URL / MOVO_ANDROID_STORE_URL when set (exact formats only), otherwise the App
 * Store page built from APPLE_APP_ID and the Google Play page of com.nasrinai.movo. If no store address is known the
 * link opens the MOVO web app, which keeps the code. Only exact store addresses are produced, so this can never
 * become an open redirect, and the referral code is the only value ever carried.
 */
const ANDROID_PACKAGE = 'com.nasrinai.movo';
const PLAY_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
const IOS_URL = /^https:\/\/apps\.apple\.com\/(?:[a-z]{2}\/)?app\/(?:[a-z0-9-]+\/)?id\d{6,12}$/;
const ANDROID_URL = /^https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.nasrinai\.movo$/;

function iosStore(env) {
  const configured = String(env.MOVO_IOS_APP_STORE_URL || '').trim();
  if (IOS_URL.test(configured)) return configured;
  const id = appleAppId(env.APPLE_APP_ID);
  return id ? `https://apps.apple.com/app/id${id}` : '';
}

/** The numeric App Store id from APPLE_APP_ID: tolerates spaces, quotes and an "id" prefix; '' when it is not one. */
function appleAppId(value) {
  const text = String(value || '').trim().replace(/^["']|["']$/g, '').trim().replace(/^id/i, '');
  if (!/^\d+$/.test(text)) return '';
  const number = Number(text);
  return Number.isSafeInteger(number) && number >= 100000 ? String(number) : '';
}

function androidStore(env) {
  const configured = String(env.MOVO_ANDROID_STORE_URL || '').trim();
  return ANDROID_URL.test(configured) ? configured : PLAY_URL;
}

/** The Google Play address for one friend's code. */
function playUrlFor(base, ref) {
  if (!ref) return base;
  const referrer = new URLSearchParams({ utm_source: 'movo_referral', utm_medium: 'qr', movo_ref: ref }).toString();
  return `${base}&referrer=${encodeURIComponent(referrer)}`;
}

/** The short iPhone page: the code, one button that copies it and opens the App Store, and a plain link. */
function iosPage(storeUrl, ref) {
  // `ref` is already normalised to M + five letters/digits and storeUrl matches an exact App Store format, so
  // neither can carry markup. The script is a same-origin file because the site CSP allows no inline script.
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Get MOVO</title>
<style>*{box-sizing:border-box}:root{color-scheme:light dark;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f6f3;color:#121512}
main{width:min(360px,calc(100% - 32px));text-align:center;padding:28px 20px;border-radius:22px;background:#fff}
h1{font-size:22px;margin:0 0 6px}p{font-size:15px;line-height:1.45;margin:0 0 16px;color:#5b625b}
.code{display:block;font-size:30px;font-weight:700;letter-spacing:.12em;margin:4px 0 18px;user-select:all}
.button{display:block;min-height:48px;line-height:48px;border-radius:16px;background:#121512;color:#fff;
text-decoration:none;font-weight:600;font-size:16px}small{display:block;margin-top:14px;color:#5b625b;font-size:13px}
@media (prefers-color-scheme:dark){body{background:#0d0f0d;color:#f2f4f2}main{background:#181b18}
p,small{color:#a6ada6}.button{background:#f2f4f2;color:#121512}}</style></head>
<body><main>
<h1>Join MOVO</h1>
<p>Your friend’s referral code:</p>
<strong class="code" id="movo-ref" data-ref="${ref}">${ref}</strong>
<a class="button" id="movo-store" href="${storeUrl}" data-store="${storeUrl}">Copy code and open the App Store</a>
<small id="movo-status" role="status">After installing, sign in and enter the code in Menu → Refer MOVO.</small>
</main><script src="/get-movo.js" defer></script></body></html>`;
}

function redirect(res, location) {
  res.statusCode = 302;
  res.setHeader('Location', location);
  return res.end();
}

module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const platform = String(req.query?.platform || '');
  const ref = normalizeReferralCode(String(req.query?.ref || ''));

  if (platform === 'android') return redirect(res, playUrlFor(androidStore(process.env), ref));
  if (platform === 'ios') {
    const store = iosStore(process.env);
    if (store && ref) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(req.method === 'HEAD' ? '' : iosPage(store, ref));
    }
    if (store) return redirect(res, store);
  }

  // Unknown platform, or the App Store address is not known yet: open the MOVO web app, which keeps the code.
  const params = new URLSearchParams();
  if (platform === 'ios' || platform === 'android') params.set('download', platform);
  if (ref) params.set('ref', ref);
  return redirect(res, `/${params.toString() ? `?${params}` : ''}`);
};

module.exports.playUrlFor = playUrlFor;
module.exports.PLAY_URL = PLAY_URL;
