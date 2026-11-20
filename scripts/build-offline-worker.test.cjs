const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

test('offline worker caches only public display assets and tolerates storage failures', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movo-worker-'));
  try {
    for (const dir of ['scripts', 'public', 'build/brands/offline', 'build/wallpapers']) fs.mkdirSync(path.join(root, dir), { recursive: true });
    fs.copyFileSync(path.join(__dirname, 'build-offline-worker.cjs'), path.join(root, 'scripts/build-offline-worker.cjs'));
    fs.copyFileSync(path.join(__dirname, '../public/sw.js'), path.join(root, 'public/sw.js'));
    fs.writeFileSync(path.join(root, 'build/asset-manifest.json'), JSON.stringify({ files: { main: '/static/js/main.fixture.js' } }));
    fs.writeFileSync(path.join(root, 'build/brands/offline/bank.png'), 'fixture');
    fs.writeFileSync(path.join(root, 'build/wallpapers/card.webp'), 'fixture');
    execFileSync(process.execPath, [path.join(root, 'scripts/build-offline-worker.cjs')]);
    const listeners = {};
    const context = { URL, Response, self: { location: { origin: 'https://movo.test' }, addEventListener: (name, fn) => { listeners[name] = fn; } },
      caches: { open: async () => ({ match: async () => undefined, put: async () => { throw Error('quota'); } }) },
      fetch: async () => new Response('artwork', { status: 200 }) };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'build/sw.js'), 'utf8'), context);
    let result;
    const request = { method: 'GET', mode: 'cors', url: 'https://movo.test/wallpapers/card.webp', headers: new Headers() };
    listeners.fetch({ request, respondWith: p => { result = p; } });
    assert.equal(await (await result).text(), 'artwork');
    context.caches.open = async () => { throw Error('storage denied'); };
    listeners.fetch({ request, respondWith: p => { result = p; } });
    assert.equal(await (await result).text(), 'artwork');
    for (const url of ['/api/purchases/entitlements', '/wallpapers/card.webp?token=private', 'https://other.test/static/js/main.fixture.js']) {
      listeners.fetch({ request: { ...request, url: new URL(url, 'https://movo.test').href }, respondWith: () => assert.fail('private/unknown request intercepted') });
    }
    listeners.fetch({ request: { ...request, method: 'POST' }, respondWith: () => assert.fail('write intercepted') });
    assert.match(fs.readFileSync(path.join(root, 'build/sw.js'), 'utf8'), /movo-shell-/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
