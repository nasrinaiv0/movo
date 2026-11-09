'use strict';
const { createClient } = require('@supabase/supabase-js');
const { normalizeTrialCode, CLAIM_ERRORS } = require('../lib/referralCode');
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
    // Short codes (M78038) and, until the short-code migration is applied, the older 24-character codes.
    const code = normalizeTrialCode(req.body?.referralCode);
    if (code === null) return res.status(400).json({ error: 'invalid_referral_code' });
    const { data, error } = await db.rpc('claim_movo_trial', { p_referral_code: code || null });
    if (error) return res.status(400).json({ error: 'trial_claim_failed' });
    // A wrong code is returned (not raised) so the database keeps counting attempts.
    if (data?.error) return res.status(data.error === 'too_many_attempts' ? 429 : 400).json({ error: CLAIM_ERRORS.has(data.error) ? data.error : 'trial_claim_failed' });
    return res.status(200).json(data);
  } catch { return res.status(503).json({ error: 'service_unavailable' }); }
};
