'use strict';

const crypto = require('crypto');
const products = require('../../src/lib/store-products.json');

const BUNDLE_ID = 'com.nasrinai.movo';
const PRODUCT_TIERS = Object.freeze({ pro: 1, pro_plus: 2 });

function appAccountTokenForUser(userId) {
  const hex = crypto.createHash('sha256').update('movo-store-account:' + userId).digest('hex').slice(0, 32).split('');
  hex[12] = '5';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const value = hex.join('');
  return value.slice(0, 8) + '-' + value.slice(8, 12) + '-' + value.slice(12, 16) + '-' + value.slice(16, 20) + '-' + value.slice(20);
}

function getProduct(productId) {
  return Object.prototype.hasOwnProperty.call(products, productId) ? products[productId] : null;
}

function safeDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function appleVerifierConfig() {
  const rootCerts = String(process.env.APPLE_ROOT_CERTS_BASE64 || '')
    .split(',').map((part) => part.trim()).filter(Boolean).map((part) => Buffer.from(part, 'base64'));
  if (!rootCerts.length) throw new Error('apple_verification_not_configured');
  const appAppleId = Number(process.env.APPLE_APP_ID);
  const { Environment, SignedDataVerifier } = require('@apple/app-store-server-library');
  return { rootCerts, appAppleId, Environment, SignedDataVerifier };
}

async function decodeAppleTransaction(jws) {
  if (!jws || typeof jws !== 'string' || jws.length > 20000) throw new Error('invalid_apple_transaction');
  const config = appleVerifierConfig();
  for (const candidate of [config.Environment.PRODUCTION, config.Environment.SANDBOX]) {
    if (candidate === config.Environment.PRODUCTION && (!Number.isFinite(config.appAppleId) || config.appAppleId <= 0)) continue;
    try {
      const verifier = new config.SignedDataVerifier(
        config.rootCerts,
        true,
        candidate,
        BUNDLE_ID,
        candidate === config.Environment.PRODUCTION ? config.appAppleId : undefined,
      );
      const transaction = await verifier.verifyAndDecodeTransaction(jws);
      if (transaction.bundleId !== BUNDLE_ID) throw new Error('apple_bundle_mismatch');
      return { transaction, environment: candidate === config.Environment.SANDBOX ? 'sandbox' : 'production' };
    } catch (error) {
      if (error?.message === 'apple_bundle_mismatch') throw error;
    }
  }
  throw new Error('apple_transaction_verification_failed');
}

async function verifyAppleNotification(signedPayload) {
  if (!signedPayload || typeof signedPayload !== 'string' || signedPayload.length > 100000) throw new Error('invalid_apple_notification');
  const config = appleVerifierConfig();
  for (const candidate of [config.Environment.PRODUCTION, config.Environment.SANDBOX]) {
    if (candidate === config.Environment.PRODUCTION && (!Number.isFinite(config.appAppleId) || config.appAppleId <= 0)) continue;
    try {
      const verifier = new config.SignedDataVerifier(
        config.rootCerts,
        true,
        candidate,
        BUNDLE_ID,
        candidate === config.Environment.PRODUCTION ? config.appAppleId : undefined,
      );
      const notification = await verifier.verifyAndDecodeNotification(signedPayload);
      if (notification.data?.bundleId && notification.data.bundleId !== BUNDLE_ID) throw new Error('apple_bundle_mismatch');
      return notification;
    } catch (error) {
      if (error?.message === 'apple_bundle_mismatch') throw error;
    }
  }
  throw new Error('apple_notification_verification_failed');
}

async function verifyApple(jws, userId) {
  const submitted = await decodeAppleTransaction(jws);
  const { AppStoreServerAPIClient, Environment } = require('@apple/app-store-server-library');
  const signingKey = process.env.APPLE_IAP_SIGNING_KEY;
  const keyId = process.env.APPLE_IAP_KEY_ID;
  const issuerId = process.env.APPLE_IAP_ISSUER_ID;
  if (!signingKey || !keyId || !issuerId) throw new Error('apple_server_api_not_configured');
  const client = new AppStoreServerAPIClient(signingKey, keyId, issuerId, BUNDLE_ID,
    submitted.environment === 'sandbox' ? Environment.SANDBOX : Environment.PRODUCTION);
  const current = await client.getTransactionInfo(String(submitted.transaction.transactionId));
  const { transaction, environment } = await decodeAppleTransaction(current.signedTransactionInfo);
  if (transaction.transactionId !== submitted.transaction.transactionId || environment !== submitted.environment) throw new Error('invalid_apple_transaction');
  if (transaction.type !== 'Auto-Renewable Subscription') throw new Error('unsupported_apple_product_type');
  const product = getProduct(transaction.productId);
  if (!product) throw new Error('unknown_store_product');
  const expectedAccount = appAccountTokenForUser(userId);
  if (typeof transaction.appAccountToken !== 'string' || transaction.appAccountToken.toLowerCase() !== expectedAccount.toLowerCase()) {
    throw new Error('purchase_account_mismatch');
  }
  const expiresAt = safeDate(transaction.expiresDate);
  if (!transaction.transactionId || !transaction.originalTransactionId || !expiresAt) throw new Error('incomplete_apple_transaction');
  const status = transaction.revocationDate ? 'revoked' : (expiresAt.getTime() > Date.now() ? 'active' : 'expired');
  return {
    paidVerified: transaction.offerDiscountType !== 'FREE_TRIAL' && Number(transaction.price) > 0,
    platform: 'apple',
    productId: transaction.productId,
    tier: product.tier,
    storeSubscriptionKey: String(transaction.originalTransactionId),
    storeTransactionId: String(transaction.transactionId),
    originalTransactionId: String(transaction.originalTransactionId),
    purchaseTokenHash: null,
    status,
    expiresAt: expiresAt.toISOString(),
    environment,
  };
}

async function verifyGoogle(purchaseToken, productId, userId) {
  if (!purchaseToken || typeof purchaseToken !== 'string' || purchaseToken.length > 4096) throw new Error('invalid_google_purchase_token');
  const product = getProduct(productId);
  if (!product) throw new Error('unknown_store_product');
  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME || BUNDLE_ID;
  const serviceAccountRaw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountRaw) throw new Error('google_play_verification_not_configured');
  let credentials;
  try { credentials = JSON.parse(serviceAccountRaw); } catch { throw new Error('google_play_credentials_invalid'); }
  const { google } = require('googleapis');
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/androidpublisher'] });
  const publisher = google.androidpublisher({ version: 'v3', auth });
  const response = await publisher.purchases.subscriptionsv2.get({ packageName, token: purchaseToken });
  const data = response?.data || {};
  const lineItem = (data.lineItems || []).find((item) => item.productId === productId);
  if (!lineItem) throw new Error('google_product_mismatch');
  const expectedAccount = appAccountTokenForUser(userId);
  const linkedAccount = data.externalAccountIdentifiers?.obfuscatedExternalAccountId;
  if (typeof linkedAccount !== 'string' || linkedAccount.toLowerCase() !== expectedAccount.toLowerCase()) throw new Error('purchase_account_mismatch');
  const expiresAt = safeDate(lineItem.expiryTime);
  if (!expiresAt) throw new Error('incomplete_google_subscription');
  const state = String(data.subscriptionState || '');
  const statusMap = {
    SUBSCRIPTION_STATE_ACTIVE: 'active',
    SUBSCRIPTION_STATE_IN_GRACE_PERIOD: 'grace_period',
    SUBSCRIPTION_STATE_CANCELED: expiresAt.getTime() > Date.now() ? 'canceled' : 'expired',
    SUBSCRIPTION_STATE_PAUSED: 'paused',
    SUBSCRIPTION_STATE_ON_HOLD: 'on_hold',
    SUBSCRIPTION_STATE_EXPIRED: 'expired',
    SUBSCRIPTION_STATE_PENDING: 'pending',
    SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED: 'expired',
  };
  const status = statusMap[state] || 'pending';
  const purchaseTokenHash = crypto.createHash('sha256').update(purchaseToken).digest('hex');
  let paidVerified = false;
  if (!data.testPurchase && data.latestOrderId && publisher.orders?.get) {
    // Only an actual positive, processed order qualifies; free trials do not.
    const order = (await publisher.orders.get({ packageName, orderId: data.latestOrderId }))?.data;
    const purchasedLine = order?.lineItems?.find(item => item.productId === productId);
    paidVerified = order?.state === 'PROCESSED' && !!purchasedLine && (Number(purchasedLine.total?.units || 0) > 0 || Number(purchasedLine.total?.nanos || 0) > 0);
  }
  return {
    paidVerified,
    platform: 'google',
    productId,
    tier: product.tier,
    storeSubscriptionKey: purchaseTokenHash,
    storeTransactionId: String(data.latestOrderId || purchaseTokenHash),
    originalTransactionId: null,
    purchaseTokenHash,
    status,
    expiresAt: expiresAt.toISOString(),
    environment: data.testPurchase ? 'sandbox' : 'production',
    needsAcknowledgement: data.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING',
    purchaseToken,
  };
}

module.exports = {
  appAccountTokenForUser,
  getProduct,
  decodeAppleTransaction,
  verifyAppleNotification,
  verifyApple,
  verifyGoogle,
  PRODUCT_TIERS,
};
