const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const root = path.join(__dirname, '..', 'build');
const manifest = fs.readFileSync(path.join(root, 'asset-manifest.json'), 'utf8');
const logos = fs.readdirSync(path.join(root, 'brands', 'offline')).map(name => '/brands/offline/' + name);
const notices = fs.existsSync(path.join(root, 'third-party-notices.txt')) ? ['/third-party-notices.txt'] : [];
const assets = [...notices, '/index.html', '/favicon.svg', '/icon-192.png', '/icon-512.png', ...logos,
  ...Object.values(JSON.parse(manifest).files).filter(file => /^\/static\/.+\.(?:js|css|woff2?|ttf|png|svg|webp)$/.test(file))];
const digest = crypto.createHash('sha256').update(manifest);
for (const name of notices) digest.update(fs.readFileSync(path.join(root, name)));
for (const name of logos) digest.update(fs.readFileSync(path.join(root, name)));
const revision = digest.digest('hex').slice(0, 16);
function listFiles(folder) {
  if (!fs.existsSync(folder)) return [];
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(item => {
    const file = path.join(folder, item.name);
    return item.isDirectory() ? listFiles(file) : ['/' + path.relative(root, file).split(path.sep).join('/')];
  });
}
const artwork = ['wallpapers', 'mascot', 'ocr'].flatMap(folder => listFiles(path.join(root, folder)));
const notifications = fs.readFileSync(path.join(__dirname, '..', 'public', 'sw.js'), 'utf8')
  .replace("self.addEventListener('install', () => self.skipWaiting());", '');

fs.writeFileSync(path.join(root, 'sw.js'), notifications + `
const CACHE = 'movo-shell-${revision}';
const ASSETS = ${JSON.stringify(assets)};
const ARTWORK = ${JSON.stringify(artwork)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('movo-shell-') && key !== CACHE).map(key => caches.delete(key)))));
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.search) return;
  if (request.mode === 'navigate' && ['/', '/index.html'].includes(url.pathname)) {
    // Only the public app shell can recover from a host outage. Never substitute
    // cached HTML for authentication denials, API responses or private routes.
    event.respondWith((async () => {
      let response, failure;
      try {
        response = await fetch(request);
        if (response.status !== 402 && response.status !== 429 && response.status < 500) return response;
      } catch (error) { failure = error; }
      let shell;
      try { shell = await caches.match('/index.html', { cacheName: CACHE }); } catch { /* storage unavailable */ }
      if (shell) return shell;
      if (response) return response;
      throw failure;
    })());
  } else if (ARTWORK.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(async cache => {
      const hit = await cache.match(request).catch(() => undefined);
      if (hit) return hit;
      const response = await fetch(request);
      if (response.ok && !request.headers.has('range')) await cache.put(request, response.clone()).catch(() => {});
      return response;
    }).catch(() => fetch(request)));
  } else if (ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(request, { cacheName: CACHE }).then(hit => hit || fetch(request)));
  }
});
`);
console.log('Offline app shell prepared with', assets.length, 'bundled resources.');
