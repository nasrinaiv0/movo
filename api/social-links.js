'use strict';

/* Public profile destinations only. The server reads Vercel environment
   variables supplied to the deployed function; changing Vercel settings requires redeploying. */
const ACCOUNTS = [
  { id: 'instagram', key: 'MOVO_SOCIAL_INSTAGRAM_URL', hosts: ['instagram.com', 'www.instagram.com'] },
  { id: 'facebook', key: 'MOVO_SOCIAL_FACEBOOK_URL', hosts: ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'fb.com'] },
  { id: 'twitter', key: 'MOVO_SOCIAL_TWITTER_URL', fallback: 'MOVO_SOCIAL_X_URL', hosts: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'] },
  { id: 'threads', key: 'MOVO_SOCIAL_THREADS_URL', hosts: ['threads.net', 'www.threads.net', 'threads.com', 'www.threads.com'] },
  { id: 'tiktok', key: 'MOVO_SOCIAL_TIKTOK_URL', hosts: ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com'] },
];

function safeProfileUrl(value, hosts) {
  if (typeof value !== 'string' || !value.trim() || value.length > 2048) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    if (!hosts.includes(url.hostname.toLowerCase())) return null;
    if (url.pathname === '/' && !url.search) return null; // Don't imply a generic network is MOVO's profile.
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function send(res, code, data) {
  res.status(code);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=300');
  res.end(JSON.stringify(data));
}

function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return send(res, 405, { error: 'method_not_allowed' });
  }
  const links = ACCOUNTS.map(({ id, key, fallback, hosts }) => {
    const raw = process.env[key] || (fallback && process.env[fallback]);
    const url = safeProfileUrl(raw, hosts);
    return url ? { id, url } : null;
  }).filter(Boolean);
  return send(res, 200, { links });
}

module.exports = handler;
module.exports.safeProfileUrl = safeProfileUrl;
