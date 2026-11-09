'use strict';

const { createClient } = require('@supabase/supabase-js');
const { verifyApple, verifyGoogle } = require('../lib/purchaseVerification');
const { persistStoreEntitlement } = require('../lib/persistStoreEntitlement');

const MAX_BODY_BYTES = 30000;
const json = (res, status, body) => {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(status).json(body);
};

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
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
  const token = match ? match[1].trim() : '';
  if (!token) return json(res, 401, { error: 'sign_in_required' });
  const api = clients();
  if (!api) return json(res, 503, { error: 'service_unavailable' });

  try {
    const { data: authData, error: authError } = await api.auth.auth.getUser(token);
    const userId = authData?.user?.id;
    if (authError || !userId) return json(res, 401, { error: 'sign_in_required' });
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    let verified;
    if (body.platform === 'apple') verified = await verifyApple(body.jwsRepresentation, userId);
    else if (body.platform === 'google') verified = await verifyGoogle(body.purchaseToken, body.productIdentifier, userId);
    else return json(res, 400, { error: 'unsupported_store' });

    const entitlementId = await persistStoreEntitlement(api.admin, userId, verified);

    // Google requires acknowledgement within three days. Only acknowledge after store verification
    // and durable entitlement persistence; if acknowledgement fails, fail closed until retry.
    if (verified.platform === 'google' && verified.needsAcknowledgement) {
      try {
        const { google } = require('googleapis');
        const credentials = JSON.parse(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON);
        const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/androidpublisher'] });
        const publisher = google.androidpublisher({ version: 'v3', auth });
        await publisher.purchases.subscriptions.acknowledge({
          packageName: process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.nasrinai.movo',
          subscriptionId: verified.productId,
          token: verified.purchaseToken,
          requestBody: {},
        });
      } catch (ackError) {
        await api.admin.from('movo_store_entitlements')
          .update({ status: 'pending', verified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('platform', 'google')
          .eq('purchase_token_hash', verified.purchaseTokenHash);
        throw ackError;
      }
    }
    if (verified.paidVerified && verified.environment === 'production') {
      const { error } = await api.admin.rpc('record_movo_paid_referral', { p_entitlement_id: entitlementId, p_user_id: userId });
      if (error) throw error;
      if (process.env.MOVO_REFERRAL_POINTS_ENABLED === 'true') {
        const { error: pointsError } = await api.admin.rpc('movo_award_referral_upgrade', { p_entitlement_id: entitlementId, p_user_id: userId });
        if (pointsError) throw pointsError;
      }
    }
    return json(res, 200, { verified: true, entitlementId, acknowledged: verified.platform === 'google', tier: verified.tier, status: verified.status, expiresAt: verified.expiresAt });
  } catch (cause) {
    const message = String(cause?.message || '');
    const clientErrors = [
      'invalid_apple_transaction', 'invalid_google_purchase_token', 'apple_transaction_verification_failed',
      'apple_bundle_mismatch', 'unknown_store_product', 'purchase_account_mismatch', 'google_product_mismatch',
      'incomplete_apple_transaction', 'incomplete_google_subscription', 'unsupported_apple_product_type',
    ];
    const error = clientErrors.find((code) => message.includes(code));
    console.error('[movo-purchases] verification failed', { code: error || 'verification_unavailable' });
    if (message.includes('purchase_already_linked')) return json(res, 409, { error: 'purchase_already_linked' });
    return json(res, error ? 400 : 503, { error: error || 'verification_unavailable' });
  }
};
