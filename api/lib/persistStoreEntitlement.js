'use strict';

async function persistStoreEntitlement(admin, userId, verified) {
  const { data, error } = await admin.rpc('upsert_movo_store_entitlement', {
    p_user_id: userId,
    p_platform: verified.platform,
    p_product_id: verified.productId,
    p_tier: verified.tier,
    p_store_subscription_key: verified.storeSubscriptionKey,
    p_store_transaction_id: verified.storeTransactionId,
    p_original_transaction_id: verified.originalTransactionId,
    p_purchase_token_hash: verified.purchaseTokenHash,
    p_status: verified.status,
    p_expires_at: verified.expiresAt,
    p_environment: verified.environment,
  });
  if (error) {
    if (String(error.message || '').includes('purchase_already_linked')) {
      const conflict = new Error('purchase_already_linked');
      conflict.code = 'purchase_already_linked';
      throw conflict;
    }
    throw error;
  }
  return data || null;
}

module.exports = { persistStoreEntitlement };
