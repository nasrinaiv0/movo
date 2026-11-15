'use strict';

/**
 * PR #305 preview-only handoff probe. No user input or OAuth values are
 * accepted: this tests whether Chrome follows an HTTP 302 to the already
 * registered MOVO Auth Test custom scheme without sending any credentials.
 * Never merge this diagnostic into production.
 */
const TARGET = 'movo-authcheck://auth-callback';

function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; base-uri 'none'");
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.statusCode = 405;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Method not allowed');
    return;
  }
  res.statusCode = 302;
  res.setHeader('Location', TARGET);
  res.end();
}

module.exports = handler;
