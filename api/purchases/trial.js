'use strict';
const { createClient } = require('@supabase/supabase-js');
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method_not_allowed' }); }
  const token = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '')?.[1];
  if (!token) return res.status(401).json({ error: 'sign_in_required' });
  const url = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
  if (!url || !key) return res.status(503).json({ error: 'service_unavailable' });
  try {
    const db = createClient(url, key, { global: { headers: { Authorization: 'Bearer ' + token } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: auth, error: authError } = await db.auth.getUser(token);
    if (authError || !auth?.user?.id) return res.status(401).json({ error: 'sign_in_required' });
    const code = req.body?.referralCode;
    if (code != null && (typeof code !== 'string' || !/^[a-f0-9]{24}$/.test(code))) return res.status(400).json({ error: 'invalid_referral_code' });
    const { data, error } = await db.rpc('claim_movo_trial', { p_referral_code: code || null });
    if (error) return res.status(400).json({ error: 'trial_claim_failed' });
    return res.status(200).json(data);
  } catch { return res.status(503).json({ error: 'service_unavailable' }); }
};
