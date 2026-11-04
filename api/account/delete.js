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

    stage = 'delete_account_qr_images';
    const qrBucket = api.admin.storage.from('movo-account-qrs');
    for (let offset = 0; ; offset += 100) {
      const { data: folders, error: folderError } = await qrBucket.list(userId, { limit: 100, offset });
      if (folderError) throw folderError;
      for (const folder of folders || []) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(folder.name)) continue;
        for (let fileOffset = 0; ; fileOffset += 100) {
          const { data: files, error: filesError } = await qrBucket.list(`${userId}/${folder.name}`, { limit: 100, offset: fileOffset });
          if (filesError) throw filesError;
          const paths = (files || []).filter(file => file.id && /^[0-9a-f-]{36}\.png$/i.test(file.name)).map(file => `${userId}/${folder.name}/${file.name}`);
          for (let i = 0; i < paths.length; i += 100) {
            const { error } = await qrBucket.remove(paths.slice(i, i + 100));
            if (error) throw error;
          }
          if (!files || files.length < 100) break;
        }
      }
      if (!folders || folders.length < 100) break;
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
