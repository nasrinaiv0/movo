'use strict';

const { createClient } = require('@supabase/supabase-js');
const { decodeAppleTransaction, verifyAppleNotification, verifyApple } = require('../lib/purchaseVerification');
const { persistStoreEntitlement } = require('../lib/persistStoreEntitlement');

const json = (res, status, body) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(status).json(body);
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(res, 405, { error: 'method_not_allowed' }); }
  const signedPayload = req.body?.signedPayload;
  if (!signedPayload || typeof signedPayload !== 'string') return json(res, 400, { error: 'signed_payload_required' });
  const url = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return json(res, 503, { error: 'service_unavailable' });
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });

  try {
    const notification = await verifyAppleNotification(signedPayload);
    const signedTransaction = notification.data?.signedTransactionInfo;
    if (!signedTransaction) return json(res, 200, { received: true, processed: false });
    const { transaction } = await decodeAppleTransaction(signedTransaction);
    if (!transaction.originalTransactionId) return json(res, 200, { received: true, processed: false });
    const { data: existing, error } = await admin.from('movo_store_entitlements')
      .select('user_id')
      .eq('platform', 'apple')
      .eq('store_subscription_key', String(transaction.originalTransactionId))
      .maybeSingle();
    if (error) throw error;
    if (!existing?.user_id) return json(res, 200, { received: true, processed: false });
    const verified = await verifyApple(signedTransaction, existing.user_id);
    const entitlementId = await persistStoreEntitlement(admin, existing.user_id, verified);
    if (verified.paidVerified && verified.environment === 'production' && !verified.needsAcknowledgement) {
      const { error: referralError } = await admin.rpc('record_movo_paid_referral', { p_entitlement_id: entitlementId, p_user_id: existing.user_id });
      if (referralError) throw referralError;
      if (process.env.MOVO_REFERRAL_POINTS_ENABLED === 'true') {
        const { error: pointsError } = await admin.rpc('movo_award_referral_upgrade', { p_entitlement_id: entitlementId, p_user_id: existing.user_id });
        if (pointsError) throw pointsError;
      }
    } else if (verified.status === 'revoked' && process.env.MOVO_REFERRAL_POINTS_ENABLED === 'true') {
      const { error: reverseError } = await admin.rpc('movo_reverse_referral_upgrade', { p_user_id: existing.user_id });
      if (reverseError) throw reverseError;
    }
    return json(res, 200, { received: true, processed: true });
  } catch (error) {
    console.error('[movo-purchases] Apple notification rejected', { code: String(error?.message || 'unknown').slice(0, 80) });
    return json(res, 400, { error: 'invalid_notification' });
  }
};
