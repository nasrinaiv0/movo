const { createClient } = require('@supabase/supabase-js');

/*
 * POST /api/account/delete — permanently deletes the signed-in person's MOVO account (App Store guideline 5.1.1(v)).
 *
 * Who: only the person themselves. The Supabase access token in `Authorization: Bearer …` is verified with Supabase
 * Auth; the user id always comes from that verified token, never from the request body. The body must also carry
 * `{ "confirm": "DELETE" }` so a stray request cannot delete an account.
 *
 * What: private bank QR objects are removed first, then transactions (they reference accounts with ON DELETE RESTRICT), then the Auth user through
 * the Admin API, which also ends sessions and removes linked Google/Apple identities. Every other MOVO table
 * references auth.users ON DELETE CASCADE, so accounts, budgets, bills, plans, automations, the automation inbox,
 * preferences and NasrinAI chats go with it. The service-role key stays on the server.
 */
const MAX_BODY_BYTES = 2048;

const USER_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_STORAGE_OBJECTS_PER_BUCKET = 100000;
const STORAGE_PAGE_SIZE = 1000;

/**
 * Recursively removes objects below one user's UUID prefix. Supabase Storage must be
 * mutated through the Storage API; deleting storage.objects rows directly leaves orphaned blobs.
 */
async function removeUserBucketObjects(admin, bucketName, userId) {
  if (!USER_ID_RE.test(userId)) throw new Error('invalid_user_id');
  const bucket = admin.storage.from(bucketName);
  const folders = [userId];
  const paths = [];
  const visited = new Set();

  while (folders.length) {
    const prefix = folders.shift();
    if (visited.has(prefix)) continue;
    visited.add(prefix);
    let offset = 0;
    for (;;) {
      const { data, error } = await bucket.list(prefix, { limit: STORAGE_PAGE_SIZE, offset });
      if (error) {
        const status = String(error.statusCode || error.status || '');
        if (status === '404' || /bucket not found/i.test(error.message || '')) return;
        throw error;
      }
      const entries = Array.isArray(data) ? data : [];
      for (const entry of entries) {
        const name = String(entry?.name || '');
        if (!name || name === '.' || name === '..' || name.includes('/') || name.includes('\\')) continue;
        const path = prefix + '/' + name;
        if (entry.id == null && entry.metadata == null) folders.push(path);
        else if (entry.id != null) paths.push(path);
        if (paths.length + folders.length + visited.size > MAX_STORAGE_OBJECTS_PER_BUCKET) {
          throw new Error('storage_cleanup_limit_exceeded');
        }
      }
      if (entries.length < STORAGE_PAGE_SIZE) break;
      offset += STORAGE_PAGE_SIZE;
    }
  }
  for (let offset = 0; offset < paths.length; offset += 1000) {
    const { error } = await bucket.remove(paths.slice(offset, offset + 1000));
    if (error) throw error;
  }
}


function json(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(status).json(body);
}

function clients() {
  const url = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) return null;
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
  return { auth: createClient(url, anon, options), admin: createClient(url, service, options) };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(res, 405, { error: 'method_not_allowed' }); }
  if (Number(req.headers['content-length'] || 0) > MAX_BODY_BYTES) return json(res, 413, { error: 'payload_too_large' });
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  if (body.confirm !== 'DELETE') return json(res, 400, { error: 'confirmation_required' });
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
  const token = match ? match[1].trim() : '';
  if (!token) return json(res, 401, { error: 'sign_in_required' });
  const api = clients();
  if (!api) return json(res, 503, { error: 'service_unavailable' });

  let stage = 'verify_user';
  try {
    const { data, error } = await api.auth.auth.getUser(token);
    const userId = data?.user?.id;
    if (error || !userId) return json(res, 401, { error: 'sign_in_required' });

    stage = 'delete_user_storage';
    // Storage objects are not removed by ON DELETE CASCADE. Walk only this user's UUID
    // prefix in every private user-owned bucket before deleting the Auth user.
    for (const bucketName of ['movo-account-qrs', 'movo-receipts']) {
      await removeUserBucketObjects(api.admin, bucketName, userId);
    }

    stage = 'delete_transactions';
    const { error: txError } = await api.admin.from('transactions').delete().eq('user_id', userId);
    if (txError) throw txError;

    stage = 'delete_auth_user';
    const { error: userError } = await api.admin.auth.admin.deleteUser(userId);
    if (userError) throw userError;

    console.info('[movo-account] account deleted');
    return json(res, 200, { deleted: true });
  } catch (cause) {
    // No ids, tokens or personal data in logs.
    console.error('[movo-account] delete failed', { stage, message: String(cause?.message || 'unknown').slice(0, 160) });
    return json(res, 500, { error: 'delete_failed' });
  }
};
