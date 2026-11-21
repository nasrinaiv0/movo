'use strict';

// Build-time public routing only. Never read an endpoint from account data or a link.
function publicApiOrigin(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return '';
  let url;
  try { url = new URL(text); } catch { /* invalid configuration */ }
  if (!url || /[\\\u0000-\u0020]/.test(text) || url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw Error('MOVO API origin must be an HTTPS origin without credentials, path, query or fragment.');
  }
  return url.origin;
}
module.exports = { publicApiOrigin };
