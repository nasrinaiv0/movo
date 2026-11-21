'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createMovoServer, ROUTES, LIMIT } = require('./serve-movo.cjs');

async function fixture(run, options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movo-node-'));
  const build = path.join(root, 'build');
  fs.mkdirSync(build);
  fs.writeFileSync(path.join(build, 'index.html'), '<html>MOVO public shell</html>');
  fs.writeFileSync(path.join(build, 'sw.js'), 'public-worker');
  fs.writeFileSync(path.join(root, 'private.txt'), 'synthetic outside-build secret');
  fs.writeFileSync(path.join(build, '.env'), 'synthetic hidden-file secret');
  fs.symlinkSync(path.join(root, 'private.txt'), path.join(build, 'escape.txt'));
  fs.symlinkSync(path.join(build, '.env'), path.join(build, 'hidden-alias.txt'));
  const server = createMovoServer({ buildDir: build, origins: 'https://movo.example', ...options });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  try { await run(url); }
  finally { await new Promise(resolve => server.close(resolve)); fs.rmSync(root, { recursive: true, force: true }); }
}

test('portable server serves the public shell with security/worker headers, ranges and no source traversal', async () => {
  await fixture(async base => {
    const page = await fetch(base);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /MOVO public shell/);
    assert.equal(page.headers.get('cache-control'), 'no-store');
    assert.equal(page.headers.get('x-content-type-options'), 'nosniff');
    assert.match(page.headers.get('content-security-policy'), /object-src 'none'/);
    assert.equal((await fetch(base + '/owner/diagnostic')).status, 200);
    const worker = await fetch(base + '/sw.js');
    assert.match(worker.headers.get('content-type'), /javascript/);
    assert.equal(worker.headers.get('cache-control'), 'no-store');
    const range = await fetch(base + '/sw.js', { headers: { Range: 'bytes=0-5' } });
    assert.equal(range.status, 206);
    assert.equal(await range.text(), 'public');
    assert.equal((await fetch(base + '/sw.js', { headers: { Range: 'bytes=999-' } })).status, 416);
    for (const file of ['/escape.txt', '/.env', '/hidden-alias.txt', '/%2e%2e/private.txt', '/scripts/serve-movo.cjs', '/api/lib/iapSecurity.js', '/static/main.js.map']) {
      assert.equal((await fetch(base + file)).status, 404, file);
    }
    assert.equal((await fetch(base + '/unknown-route')).status, 404);
    assert.equal((await fetch(base, { method: 'POST' })).status, 405);
    assert.deepEqual(await (await fetch(base + '/healthz')).json(), { status: 'ok', service: 'movo' });
  });
});

test('portable API preserves bearer/body/query contracts, exact CORS and single invocation of writes', async () => {
  let calls = 0;
  await fixture(async base => {
    const preflight = await fetch(base + '/api/log', { method: 'OPTIONS', headers: {
      Origin: 'https://movo.example', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization, content-type' } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://movo.example');
    assert.equal(calls, 0);
    const denied = await fetch(base + '/api/log', { method: 'POST', headers: { Origin: 'https://attacker.example', Authorization: 'Bearer fixture' } });
    assert.equal(denied.status, 403);
    assert.equal(calls, 0);
    const sent = await fetch(base + '/api/log?x=one&x=two', { method: 'POST', headers: {
      Origin: 'https://movo.example', Authorization: 'Bearer fixture', 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: 12.34 }) });
    assert.equal(sent.status, 200);
    assert.deepEqual(await sent.json(), { received: { amount: 12.34 }, query: ['one', 'two'] });
    assert.equal(sent.headers.get('cache-control'), 'no-store, private');
    assert.equal(calls, 1);
    assert.equal((await fetch(base + '/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
    assert.equal((await fetch(base + '/api/log', { method: 'POST', body: 'not-json' })).status, 415);
    assert.equal(calls, 1);
  }, { loadHandler: route => (req, res) => {
    assert.equal(route, '/api/log');
    assert.equal(req.headers.authorization, 'Bearer fixture');
    assert.equal(Number(req.headers['content-length']), Buffer.byteLength(JSON.stringify(req.body)));
    calls += 1;
    return res.status(200).json({ received: req.body, query: req.query.x });
  } });
});

test('body limits and unhandled handler failures never disclose private exception details or retry writes', async () => {
  let calls = 0;
  await fixture(async base => {
    const tooLarge = await fetch(base + '/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: ' '.repeat(LIMIT + 1) });
    assert.equal(tooLarge.status, 413);
    assert.equal(calls, 0);
    const failure = await fetch(base + '/api/log', { method: 'POST' });
    assert.equal(failure.status, 500);
    assert.deepEqual(await failure.json(), { error: 'service_unavailable' });
    assert.equal(calls, 1);
  }, { loadHandler: () => () => { calls += 1; throw Object.assign(Error('synthetic secret must stay private'), { status: 400 }); } });
});

test('the real existing routes retain purchase gating and authorization without Vercel', async () => {
  const saved = process.env.MOVO_STORE_BILLING_ENABLED;
  delete process.env.MOVO_STORE_BILLING_ENABLED;
  try {
    await fixture(async base => {
      const config = await fetch(base + '/api/purchases/config?platform=apple');
      assert.equal(config.status, 200);
      assert.deepEqual(await config.json(), { enabled: false });
      const unauthorized = await fetch(base + '/api/friends');
      assert.equal(unauthorized.status, 401);
      assert.deepEqual(await unauthorized.json(), { error: 'sign_in_required' });
      assert.equal((await fetch(base + '/api/nasrinai/chat')).status, 401);
      assert.equal((await fetch(base + '/api/account/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: 'DELETE' }) })).status, 401);
      const chunked = async function* () { yield JSON.stringify({ confirm: 'DELETE', filler: 'x'.repeat(10000) }); };
      assert.equal((await fetch(base + '/api/account/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: chunked(), duplex: 'half' })).status, 413);
    });
    // The transport exposes only entry points, never arbitrary files under api/.
    for (const target of Object.values(ROUTES)) assert.equal(typeof require(path.join(__dirname, '../api', target)), 'function');
  } finally { if (saved === undefined) delete process.env.MOVO_STORE_BILLING_ENABLED; else process.env.MOVO_STORE_BILLING_ENABLED = saved; }
});
