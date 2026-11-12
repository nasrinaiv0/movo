// Local stand-in for the app's host: serves the build, /api/purchases/entitlements, a minimal GoTrue and a PostgREST
// with real compare-and-swap semantics. Test-only; holds no real data.
const http = require('http'), fs = require('fs'), path = require('path');
const root = process.argv[2], port = Number(process.argv[3] || 3312);
const OWNER = '123e4567-e89b-42d3-a456-426614174000';
const tables = {}; const log = []; let fail = false;
let clock = Date.parse('2026-11-10T01:00:00Z');
const stamp = () => { clock += 1000; return new Date(clock).toISOString().replace('Z', '000+00:00'); };
const T = name => (tables[name] = tables[name] || []);
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp', '.bin': 'application/octet-stream', '.woff2': 'font/woff2' };
const user = { id: OWNER, aud: 'authenticated', role: 'authenticated', email: 'tester@example.com', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const same = (a, b) => (Number.isFinite(Date.parse(a)) && Number.isFinite(Date.parse(b)) && /T/.test(String(a)) ? Date.parse(a) === Date.parse(b) : String(a) === String(b));
function match(row, params) {
  for (const [key, raw] of params) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(key)) continue;
    const dot = raw.indexOf('.'); const op = raw.slice(0, dot); const val = raw.slice(dot + 1); const v = row[key];
    if (op === 'eq') { if (!same(v ?? '', val)) return false; }
    else if (op === 'neq') { if (same(v ?? '', val)) return false; }
    else if (op === 'in') { if (!val.replace(/^\(|\)$/g, '').split(',').map(x => x.replace(/^"|"$/g, '')).includes(String(v))) return false; }
    else if (op === 'is') { if (val === 'null' ? v != null : String(v) !== val) return false; }
    else if (op === 'gte') { if (!(String(v) >= val)) return false; }
    else if (op === 'gt') { if (!(String(v) > val)) return false; }
    else if (op === 'lte') { if (!(String(v) <= val)) return false; }
    else if (op === 'lt') { if (!(String(v) < val)) return false; }
  }
  return true;
}
const send = (res, code, body, headers = {}) => { const text = body === undefined ? '' : (typeof body === 'string' ? body : JSON.stringify(body)); res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers }); res.end(text); };
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x'); const p = url.pathname; let body = '';
  req.on('data', c => { body += c; });
  req.on('end', () => {
    const json = () => { try { return JSON.parse(body || 'null'); } catch { return null; } };
    if (p.startsWith('/__mock/')) {
      if (p === '/__mock/state') return send(res, 200, { tables, log, fail });
      if (p === '/__mock/reset') { for (const k of Object.keys(tables)) delete tables[k]; log.length = 0; fail = false; const seed = json() || {}; for (const [k, rows] of Object.entries(seed)) for (const r of rows) T(k).push({ user_id: OWNER, created_at: stamp(), updated_at: stamp(), ...r }); return send(res, 200, { ok: true }); }
      if (p === '/__mock/patch') { const { table, id, set } = json(); const row = T(table).find(r => r.id === id); if (!row) return send(res, 404, {}); Object.assign(row, set, { updated_at: stamp() }); return send(res, 200, row); }
      if (p === '/__mock/remove') { const { table, id } = json(); tables[table] = T(table).filter(r => r.id !== id); return send(res, 200, { ok: true }); }
      if (p === '/__mock/fail') { fail = json() === true; return send(res, 200, { fail }); }
      return send(res, 404, {});
    }
    const cloud = p.startsWith('/rest/v1/') || p.startsWith('/auth/v1/') || p.startsWith('/storage/v1/') || p.startsWith('/api/');
    if (cloud && fail) { req.socket.destroy(); return undefined; }
    if (p === '/api/purchases/entitlements') return send(res, 200, { tier: 'pro_plus', active: true, expiresAt: '2099-01-01T00:00:00Z' });
    if (p.startsWith('/api/')) return send(res, 404, {});
    if (p.startsWith('/auth/v1/')) {
      if (p === '/auth/v1/user') return send(res, 200, user);
      if (p === '/auth/v1/token') return send(res, 400, { error: 'invalid_grant', error_description: 'mock' });
      return send(res, 200, {});
    }
    if (p.startsWith('/storage/v1/')) return send(res, 404, { error: 'not_found' });
    if (p.startsWith('/rest/v1/rpc/')) {
      const name = p.slice('/rest/v1/rpc/'.length); const args = json() || {}; log.push({ rpc: name, args });
      if (name === 'delete_transaction_with_reversals') { const before = T('transactions').length; tables.transactions = T('transactions').filter(r => r.id !== args.p_transaction_id); return before === tables.transactions.length ? send(res, 400, { code: 'P0002', message: 'not found' }) : send(res, 204); }
      if (name === 'apply_movo_sync_operation' && args.p_kind === 'create') {
        const record = { ...args.p_payload, id: args.p_record_id, user_id: OWNER, created_at: stamp(), updated_at: stamp(), is_pending: false };
        T(args.p_group).push(record);
        return send(res, 200, { ownerId: OWNER, operationId: args.p_operation_id, recordId: args.p_record_id, revision: (args.p_revision || 0) + 1, record });
      }
      return send(res, 200, null);
    }
    if (p.startsWith('/rest/v1/')) {
      const table = p.slice('/rest/v1/'.length); const params = [...url.searchParams]; const object = /vnd\.pgrst\.object/.test(req.headers.accept || '');
      const none = () => send(res, 406, { code: 'PGRST116', details: 'The result contains 0 rows', hint: null, message: 'JSON object requested, multiple (or no) rows returned' });
      const reply = (rows, code = 200) => (object ? (rows.length === 1 ? send(res, code, rows[0]) : none()) : send(res, code, rows));
      const wantsRows = /return=representation/.test(req.headers.prefer || '');
      if (req.method === 'GET' || req.method === 'HEAD') {
        let rows = T(table).filter(r => match(r, params));
        const order = (url.searchParams.get('order') || '').split(',').filter(Boolean).map(x => x.split('.'));
        rows = [...rows].sort((a, b) => { for (const [k, dir] of order) { const x = a[k] ?? '', y = b[k] ?? ''; if (x !== y) return (x < y ? -1 : 1) * (dir === 'desc' ? -1 : 1); } return 0; });
        const range = /^(\d+)-(\d+)$/.exec(req.headers.range || ''); const off = range ? Number(range[1]) : Number(url.searchParams.get('offset') || 0);
        const lim = range ? Number(range[2]) - off + 1 : Number(url.searchParams.get('limit') || 1e9);
        return reply(rows.slice(off, off + lim));
      }
      if (req.method === 'POST') {
        const input = json(); const list = Array.isArray(input) ? input : [input]; const out = []; const upsert = /resolution=merge-duplicates/.test(req.headers.prefer || ''); const key = url.searchParams.get('on_conflict') || 'id';
        for (const r of list) {
          const existing = T(table).find(x => x[key] !== undefined && x[key] === r[key]);
          if (existing && !upsert) { log.push({ table, duplicate: r[key] }); return send(res, 409, { code: '23505', message: 'duplicate key value violates unique constraint', details: null, hint: null }); }
          if (existing) { Object.assign(existing, r, table === 'user_preferences' ? {} : { updated_at: stamp() }); out.push(existing); }
          else { const row = { created_at: stamp(), is_pending: false, ...r, updated_at: stamp() }; T(table).push(row); out.push(row); }
          log.push({ table, insert: r[key] });
        }
        return wantsRows ? reply(out, 201) : send(res, 201);
      }
      if (req.method === 'PATCH') {
        const rows = T(table).filter(r => match(r, params)); const set = json() || {};
        for (const r of rows) Object.assign(r, set, { updated_at: stamp() });
        log.push({ table, update: params.filter(([k]) => k === 'id').map(([, v]) => v).join(), matched: rows.length });
        return wantsRows ? reply(rows) : send(res, 204);
      }
      if (req.method === 'DELETE') {
        const gone = T(table).filter(r => match(r, params)); tables[table] = T(table).filter(r => !gone.includes(r)); log.push({ table, delete: gone.map(r => r.id) });
        return wantsRows ? reply(gone) : send(res, 204);
      }
      return send(res, 405, {});
    }
    let file = path.join(root, decodeURIComponent(p)); if (!file.startsWith(root)) return send(res, 403, {});
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(file).pipe(res);
    return undefined;
  });
}).listen(port, () => console.log('mock cloud on', port));
