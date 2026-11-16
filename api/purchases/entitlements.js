'use strict';

const { createClient } = require('@supabase/supabase-js');
const { getPlan } = require('../lib/planAccess');

const json = (res, status, body) => {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(status).json(body);
};

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return json(res, 405, { error: 'method_not_allowed' }); }
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
  const token = match ? match[1].trim() : '';
  if (!token) return json(res, 401, { error: 'sign_in_required' });
  const url = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) return json(res, 503, { error: 'service_unavailable' });
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
  const auth = createClient(url, anon, options);
  const admin = createClient(url, service, options);
  try {
    const { data: authData, error: authError } = await auth.auth.getUser(token);
    const userId = authData?.user?.id;
    if (authError || !userId) return json(res, 401, { error: 'sign_in_required' });
    const { data, error } = await admin.from('movo_store_entitlements')
      .select('platform,product_id,tier,status,expires_at,environment,verified_at')
      .eq('user_id', userId).order('expires_at', { ascending: false });
    if (error) throw error;
    const { error: grantError } = await admin.from('movo_plan_grants').upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
    if (grantError) throw grantError;
    // Only the service-role-managed database allowlist permits sandbox display.
    const { data: testUser, error: testUserError } = await admin.from('movo_store_test_users')
      .select('user_id').eq('user_id', userId).maybeSingle();
    if (testUserError) throw testUserError;
    const plan = await getPlan(admin, userId);
    const eligible = (data || []).filter(item => item.environment === 'production'
      || (item.environment === 'sandbox' && !!testUser));
    return json(res, 200, {
      ...plan,
      entitlements: eligible.map(({ platform, product_id, tier: itemTier, status, expires_at, environment, verified_at }) => ({
        platform, productId: product_id, tier: itemTier, status, expiresAt: expires_at, environment, verifiedAt: verified_at,
      })),
    });
  } catch (cause) {
    console.error('[movo-purchases] entitlement lookup failed', { message: String(cause?.message || 'unknown').slice(0, 120) });
    return json(res, 503, { error: 'entitlements_unavailable' });
  }
};
