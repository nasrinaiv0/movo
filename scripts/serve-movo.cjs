'use strict';

// Optional Node transport for the existing handlers. Business/auth/accounting logic stays in api/.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { pipeline } = require('node:stream');
const ROOT = path.resolve(__dirname, '..');
const ROUTES = Object.freeze({
  '/api/log': 'log.js', '/api/crypto': 'crypto.js', '/api/stocks': 'stocks.js',
  '/api/download': 'download.js', '/api/friends': 'friends/index.js', '/api/owner': 'owner/index.js',
  '/api/social-links': 'social-links.js', '/api/account/delete': 'account/delete.js',
  '/api/account/clear': 'account/clear.js', '/api/account/retention': 'account/retention.js',
  '/api/nasrinai/chat': 'nasrinai/chat.js', '/api/receipts/scan': 'receipts/scan.js',
  ...Object.fromEntries(['apple-notifications', 'google-notifications', 'config', 'entitlements',
    'retry-acknowledgements', 'trial', 'verify'].map(name => ['/api/purchases/' + name, 'purchases/' + name + '.js'])),
  ...Object.fromEntries(['activate', 'challenge', 'claim', 'redeem', 'status'].map(name => ['/api/referrals/' + name, 'referrals/' + name + '.js'])),
});
const REWRITES = { '/': 'index.html', '/index.html': 'index.html', '/friend': 'friend.html',
  '/privacy': 'privacy.html', '/terms': 'terms.html', '/security': 'security.html', '/owner': 'index.html' };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.gif': 'image/gif',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.wasm': 'application/wasm',
  '.mp4': 'video/mp4', '.mp3': 'audio/mpeg' };
const LIMIT = 4 * 1024 * 1024;
const REQUEST_HEADERS = new Set(['authorization', 'content-type', 'x-movo-referral-rewards']);
const REQUEST_FAILURE = Symbol('request failure');
const error = (status, code) => Object.assign(Error(code), { status, [REQUEST_FAILURE]: true });
const privateFile = relative => relative.split(path.sep).some(part => part.startsWith('.') && part !== '.well-known') || relative.endsWith('.map');

function allowedOrigins(value) {
  const origins = String(value || 'https://movo.nasrinai.com,https://movo-lime.vercel.app').split(',').map(v => v.trim()).filter(Boolean);
  for (const origin of origins) {
    let url;
    try { url = new URL(origin); } catch { /* report configuration without echoing it */ }
    if (!url || url.origin !== origin || url.protocol !== 'https:' || url.username || url.password) throw Error('MOVO_ALLOWED_ORIGINS requires exact HTTPS origins.');
  }
  if (process.env.NODE_ENV !== 'production') origins.push('http://localhost:3000');
  return new Set(origins);
}

async function body(req) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return;
  if (Number(req.headers['content-length']) > LIMIT) throw error(413, 'payload_too_large');
  const chunks = [];
  let bytes = 0;
  await new Promise((resolve, reject) => {
    req.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > LIMIT) { chunks.length = 0; reject(error(413, 'payload_too_large')); }
      else chunks.push(chunk);
    });
    req.on('end', resolve);
    req.on('error', () => reject(error(400, 'invalid_request')));
    req.on('aborted', () => reject(error(400, 'invalid_request')));
  });
  // Preserve handler-specific size checks for chunked requests as well.
  req.headers['content-length'] = String(bytes);
  if (!bytes) { req.body = {}; return; }
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) throw error(415, 'json_required');
  try { req.body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw error(400, 'invalid_json'); }
}

function responseHelpers(res) {
  res.status = code => { res.statusCode = code; return res; };
  res.json = value => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(value)); return res; };
}

function createMovoServer({ buildDir = path.join(ROOT, 'build'), origins = process.env.MOVO_ALLOWED_ORIGINS,
  loadHandler = route => require(path.join(ROOT, 'api', ROUTES[route])) } = {}) {
  const allowed = allowedOrigins(origins);
  const securityHeaders = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')).headers[0].headers;
  const server = http.createServer({ maxHeaderSize: 16384 }, async (req, res) => {
    responseHelpers(res);
    for (const { key, value } of securityHeaders) res.setHeader(key, value);
    res.setHeader('Cache-Control', 'no-store');
    try {
      // Never use the client-supplied Host to decide which handler or filesystem path is trusted.
      if (!req.url.startsWith('/') || req.url.startsWith('//') || req.url.includes('\\')) throw error(400, 'invalid_request');
      const url = new URL(req.url, 'http://movo.internal');
      const pathname = decodeURIComponent(url.pathname);
      if (pathname === '/healthz' && ['GET', 'HEAD'].includes(req.method)) return res.json({ status: 'ok', service: 'movo' });
      if (pathname === '/api' || pathname.startsWith('/api/')) {
        res.setHeader('Vary', 'Origin');
        res.setHeader('Cache-Control', 'no-store, private');
        if (!Object.hasOwn(ROUTES, pathname)) throw error(404, 'not_found');
        const origin = req.headers.origin;
        if (origin && !allowed.has(origin)) throw error(403, 'origin_not_allowed');
        if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
        if (req.method === 'OPTIONS') {
          const requested = String(req.headers['access-control-request-headers'] || '').toLowerCase().split(',').map(v => v.trim()).filter(Boolean);
          if (requested.some(header => !REQUEST_HEADERS.has(header))) throw error(403, 'headers_not_allowed');
          res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', [...REQUEST_HEADERS].join(', '));
          res.statusCode = 204;
          return res.end();
        }
        req.query = Object.create(null);
        for (const [key, value] of url.searchParams) {
          req.query[key] = Object.hasOwn(req.query, key) ? [].concat(req.query[key], value) : value;
        }
        await body(req);
        return await loadHandler(pathname)(req, res);
      }
      if (!['GET', 'HEAD'].includes(req.method)) { res.setHeader('Allow', 'GET, HEAD'); throw error(405, 'method_not_allowed'); }
      const relative = REWRITES[pathname] || (pathname.startsWith('/owner/') ? 'index.html' : pathname.slice(1));
      if (privateFile(relative)) throw error(404, 'not_found');
      const base = await fs.promises.realpath(buildDir);
      const candidate = path.resolve(base, relative);
      if (!candidate.startsWith(base + path.sep)) throw error(404, 'not_found');
      const file = await fs.promises.realpath(candidate);
      if (!file.startsWith(base + path.sep) || privateFile(path.relative(base, file))) throw error(404, 'not_found');
      const stat = await fs.promises.stat(file);
      if (!stat.isFile()) throw error(404, 'not_found');
      res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
      res.setHeader('Accept-Ranges', 'bytes');
      let start = 0, end = stat.size - 1;
      if (req.headers.range) {
        const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if (range && (range[1] || range[2])) {
          start = range[1] ? Number(range[1]) : Math.max(0, stat.size - Number(range[2]));
          end = range[1] && range[2] ? Math.min(end, Number(range[2])) : end;
        }
        if (!range || !(range[1] || range[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= stat.size || (!range[1] && Number(range[2]) === 0)) {
          res.setHeader('Content-Range', 'bytes */' + stat.size);
          throw error(416, 'range_not_satisfiable');
        }
        res.statusCode = 206;
        res.setHeader('Content-Range', 'bytes ' + start + '-' + end + '/' + stat.size);
      }
      res.setHeader('Content-Length', stat.size ? end - start + 1 : 0);
      if (pathname.startsWith('/static/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      if (pathname.startsWith('/brands/')) res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox");
      if (req.method === 'HEAD') return res.end();
      pipeline(fs.createReadStream(file, stat.size ? { start, end } : {}), res, () => {});
    } catch (failure) {
      if (res.headersSent || res.writableEnded) { if (!res.writableEnded) res.destroy(); return; }
      const known = failure?.[REQUEST_FAILURE];
      const status = known ? failure.status : ['ENOENT', 'ENOTDIR'].includes(failure?.code) ? 404 : failure instanceof URIError ? 400 : 500;
      res.status(status).json({ error: known ? failure.message : status === 500 ? 'service_unavailable' : status === 400 ? 'invalid_request' : 'not_found' });
    }
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  server.setTimeout(65000);
  return server;
}

if (require.main === module) {
  process.env.NODE_ENV ||= 'production';
  const port = Number(process.env.PORT || 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('PORT must be between 1 and 65535.');
  const server = createMovoServer();
  server.listen(port, process.env.MOVO_BIND_HOST || '127.0.0.1', () => console.log('MOVO Node server listening on port', port));
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => { server.closeAllConnections(); process.exit(1); }, 10000).unref();
  });
}
module.exports = { createMovoServer, ROUTES, LIMIT };
