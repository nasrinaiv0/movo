'use strict';

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { verifyGoogle } = require('../lib/purchaseVerification');
const { persistStoreEntitlement } = require('../lib/persistStoreEntitlement');

const json = (res, status, body) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(status).json(body);
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(res, 405, { error: 'method_not_allowed' }); }
  const audience = process.env.GOOGLE_PLAY_RTDN_AUDIENCE;
  const expectedEmail = process.env.GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  if (!audience || !expectedEmail || !service || !url) return json(res, 503, { error: 'service_unavailable' });

  try {
    const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
    if (!match) return json(res, 401, { error: 'unauthorized' });
    const { google } = require('googleapis');
    const client = new google.auth.OAuth2();
    const ticket = await client.verifyIdToken({ idToken: match[1], audience });
    const claims = ticket.getPayload();
    if (!claims?.email_verified || claims.email !== expectedEmail) return json(res, 401, { error: 'unauthorized' });

    const encoded = req.body?.message?.data;
    if (!encoded || typeof encoded !== 'string' || encoded.length > 100000) return json(res, 400, { error: 'invalid_message' });
    const message = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.nasrinai.movo';
    if (message.packageName && message.packageName !== packageName) return json(res, 400, { error: 'package_mismatch' });
    if (!message.subscriptionNotification && !message.voidedPurchaseNotification) return json(res, 200, { received: true, processed: false });

    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const purchaseToken = message.subscriptionNotification?.purchaseToken || message.voidedPurchaseNotification?.purchaseToken;
    if (!purchaseToken) return json(res, 200, { received: true, processed: false });
    const tokenHash = crypto.createHash('sha256').update(purchaseToken).digest('hex');
    const { data: existing, error } = await admin.from('movo_store_entitlements')
      .select('user_id,product_id')
      .eq('platform', 'google')
      .eq('purchase_token_hash', tokenHash)
      .maybeSingle();
    if (error) throw error;
    if (!existing?.user_id) return json(res, 200, { received: true, processed: false });

    if (message.voidedPurchaseNotification) {
      const { error: revokeError } = await admin.from('movo_store_entitlements')
        .update({ status: 'revoked', verified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('platform', 'google')
        .eq('purchase_token_hash', tokenHash)
        .eq('user_id', existing.user_id);
      if (revokeError) throw revokeError;
      if (process.env.MOVO_REFERRAL_POINTS_ENABLED === 'true') {
        const { error: reverseError } = await admin.rpc('movo_reverse_referral_upgrade', { p_user_id: existing.user_id });
        if (reverseError) throw reverseError;
      }
      return json(res, 200, { received: true, processed: true });
    }

    const subscriptionId = message.subscriptionNotification.subscriptionId || existing.product_id;
    const verified = await verifyGoogle(purchaseToken, subscriptionId, existing.user_id);
    const entitlementId = await persistStoreEntitlement(admin, existing.user_id, verified);
    if (verified.paidVerified && verified.environment === 'production' && !verified.needsAcknowledgement) {
      const { error: referralError } = await admin.rpc('record_movo_paid_referral', { p_entitlement_id: entitlementId, p_user_id: existing.user_id });
      if (referralError) throw referralError;
      if (process.env.MOVO_REFERRAL_POINTS_ENABLED === 'true') {
        const { error: pointsError } = await admin.rpc('movo_award_referral_upgrade', { p_entitlement_id: entitlementId, p_user_id: existing.user_id });
        if (pointsError) throw pointsError;
      }
    }
    return json(res, 200, { received: true, processed: true });
  } catch (error) {
    console.error('[movo-purchases] Google notification rejected', { code: String(error?.message || 'unknown').slice(0, 80) });
    return json(res, 400, { error: 'invalid_notification' });
  }
};
