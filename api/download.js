'use strict';
const { normalizeReferralCode } = require('./lib/referralCode');

/*
 * Download QR codes and share links point here: /api/download?platform=ios|android&ref=M78038.
 * Once MOVO is listed, people go to the App Store (MOVO_IOS_APP_STORE_URL) or Google Play (MOVO_ANDROID_STORE_URL);
 * the server settings change without a new build. Until then they open the MOVO web app on this site, which keeps
 * the referral code so it can be entered after signing in. Only exact store addresses are accepted, so this can
 * never become an open redirect.
 */
const STORES = {
  ios: { setting: 'MOVO_IOS_APP_STORE_URL', valid: /^https:\/\/apps\.apple\.com\/(?:[a-z]{2}\/)?app\/(?:[a-z0-9-]+\/)?id\d{6,12}$/ },
  android: { setting: 'MOVO_ANDROID_STORE_URL', valid: /^https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.nasrinai\.movo$/ },
};

module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const platform = String(req.query?.platform || '');
  const store = Object.hasOwn(STORES, platform) ? STORES[platform] : null;
  const ref = normalizeReferralCode(String(req.query?.ref || ''));
  const listed = store ? String(process.env[store.setting] || '').trim() : '';
  let location;
  if (store && store.valid.test(listed)) location = listed;
  else {
    const params = new URLSearchParams();
    if (store) params.set('download', platform);
    if (ref) params.set('ref', ref);
    location = `/${params.toString() ? `?${params}` : ''}`;
  }
  res.statusCode = 302;
  res.setHeader('Location', location);
  return res.end();
};
