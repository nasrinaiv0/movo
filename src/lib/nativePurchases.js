import { Capacitor } from '@capacitor/core';
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { supabase } from './supabaseClient';
import { apiUrl, isNativeApp } from './platform';
import { STORE_PRODUCTS } from './storeProducts';

let configurationPromise;
function ensureConfigured() {
  if (!configurationPromise) configurationPromise = NativePurchases.configure({ autoFinishTransactions: false }).catch(error => { configurationPromise = undefined; throw error; });
  return configurationPromise;
}

async function accountToken(userId) {
  const input = new TextEncoder().encode('movo-store-account:' + userId);
  const digest = await window.crypto.subtle.digest('SHA-256', input);
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 32).split('');
  hex[12] = '5';
  hex[16] = ((parseInt(hex[16], 16) & 3) | 8).toString(16);
  const value = hex.join('');
  return value.slice(0, 8) + '-' + value.slice(8, 12) + '-' + value.slice(12, 16) + '-' + value.slice(16, 20) + '-' + value.slice(20);
}

async function sessionDetails(session) {
  const active = session || (await supabase?.auth.getSession())?.data?.session;
  if (!active?.access_token || !active?.user?.id) throw new Error('Sign in to MOVO before purchasing or restoring a subscription.');
  return active;
}

async function postPurchase(session, transaction) {
  const platform = Capacitor.getPlatform();
  if (platform !== 'ios' && platform !== 'android') throw new Error('Purchases are available in the iOS and Android apps.');
  const body = platform === 'ios'
    ? { platform: 'apple', jwsRepresentation: transaction.jwsRepresentation }
    : { platform: 'google', productIdentifier: transaction.productIdentifier, purchaseToken: transaction.purchaseToken };
  if (platform === 'ios' && !body.jwsRepresentation) throw new Error('The App Store did not provide a verifiable signed transaction. Try restoring again.');
  if (platform === 'android' && !body.purchaseToken) throw new Error('Google Play did not provide a purchase token. Try restoring again.');

  const response = await fetch(apiUrl('/api/purchases/verify'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.verified) {
    if (result.error === 'purchase_already_linked') throw new Error('This store purchase is already linked to another MOVO account. Sign in to the original account or contact support.');
    throw new Error('MOVO could not verify this store purchase. Your purchase has not been unlocked. Please try again or contact support.');
  }
  return result;
}

async function finishVerifiedTransaction(transaction, verified) {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios' && transaction.needsFinish === true) {
    if (!transaction.transactionId) throw new Error('The App Store transaction could not be finished. Restore purchases to retry.');
    await NativePurchases.finishTransaction({ transactionId: String(transaction.transactionId) });
  }
  if (platform === 'android' && verified?.acknowledged !== true) {
    throw new Error('Google Play acknowledgement is pending. Restore purchases to retry.');
  }
}

async function verifyAndFinishPurchases(session, purchases) {
  const results = [];
  for (const transaction of purchases || []) {
    if (!STORE_PRODUCTS.some((item) => item.productIdentifier === transaction.productIdentifier)) continue;
    results.push(await postPurchase(session, transaction));
    await finishVerifiedTransaction(transaction, results[results.length - 1]);
  }
  return results;
}

export async function getStoreProducts() {
  if (!isNativeApp()) return [];
  await ensureConfigured();
  const { isBillingSupported } = await NativePurchases.isBillingSupported();
  if (!isBillingSupported) throw new Error('Store billing is not available on this device.');
  const { products } = await NativePurchases.getProducts({
    productIdentifiers: STORE_PRODUCTS.map((item) => item.productIdentifier),
    productType: PURCHASE_TYPE.SUBS,
  });
  const platform = Capacitor.getPlatform();
  return (products || []).map((item) => {
    // Android's identifier is the base plan; planIdentifier is the subscription product ID.
    const productIdentifier = platform === 'android'
      ? (item.planIdentifier || item.productIdentifier)
      : (item.identifier || item.productIdentifier);
    const configured = STORE_PRODUCTS.find((entry) =>
      entry.productIdentifier === productIdentifier
      && (platform !== 'android' || entry.basePlanId === item.identifier)
    );
    return configured ? { ...item, productIdentifier, basePlanId: configured.basePlanId, period: configured.period } : null;
  }).filter(Boolean);
}

export async function getStoreEntitlements(session) {
  const active = await sessionDetails(session);
  const response = await fetch(apiUrl('/api/purchases/entitlements'), {
    headers: { Authorization: 'Bearer ' + active.access_token },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error('Could not load your verified subscription status.');
  return result;
}

export async function purchaseStoreProduct(selection, session) {
  // PlanOffer forwards the exact store quote it displayed, including its
  // ephemeral Play offerToken. Legacy callers may still pass a product ID.
  const productIdentifier = typeof selection === 'string' ? selection : selection?.productIdentifier;
  if (!isNativeApp()) throw new Error('Please use the MOVO iOS or Android app to subscribe.');
  const platform = Capacitor.getPlatform();
  if (platform !== 'ios' && platform !== 'android') throw new Error('Official native app required for checkout.');
  const provider = platform === 'android' ? 'google' : 'apple';
  const readiness = await fetch(apiUrl('/api/purchases/config?platform=' + provider), { cache: 'no-store' });
  const configuration = await readiness.json().catch(() => ({}));
  if (!readiness.ok || configuration.enabled !== true) throw new Error('Subscriptions are not available yet. Please try again later.');
  await ensureConfigured();
  const active = await sessionDetails(session);
  const product = STORE_PRODUCTS.find((item) => item.productIdentifier === productIdentifier);
  if (!product) throw new Error('This subscription is not configured.');
  const selected = selection && typeof selection === 'object' ? selection : null;
  if (platform === 'android' && selected?.basePlanId && selected.basePlanId !== product.basePlanId) {
    throw new Error('The selected Google Play offer changed. Refresh prices and try again.');
  }
  // The offer token is tied to one specific product query. A rejected/stale
  // token must fail closed in the native plugin, never fall back to another price.
  const offerToken = platform === 'android' && selected && typeof selected.offerToken === 'string'
    && selected.offerToken.trim() ? selected.offerToken : null;
  const transaction = await NativePurchases.purchaseProduct({
    productIdentifier,
    productType: PURCHASE_TYPE.SUBS,
    ...(platform === 'android' ? { planIdentifier: product.basePlanId, ...(offerToken ? { offerToken } : {}) } : {}),
    appAccountToken: await accountToken(active.user.id),
    autoAcknowledgePurchases: false,
  });
  const verified = await postPurchase(active, transaction);
  await finishVerifiedTransaction(transaction, verified);
  return verified;
}

/** Re-check current native entitlements without showing a store restore dialog. */
export async function syncStorePurchases(session) {
  if (!isNativeApp()) return getStoreEntitlements(session);
  await ensureConfigured();
  const active = await sessionDetails(session);
  // Recover purchases interrupted by an app crash before StoreKit finish / Play acknowledgement.
  const { transactions: unfinished } = await NativePurchases.getUnfinishedTransactions();
  await verifyAndFinishPurchases(active, unfinished);
  const { purchases } = await NativePurchases.getPurchases({
    productType: PURCHASE_TYPE.SUBS,
    onlyCurrentEntitlements: true,
  });
  await verifyAndFinishPurchases(active, purchases);
  return getStoreEntitlements(active);
}

export async function restoreStorePurchases(session) {
  if (!isNativeApp()) throw new Error('Restore purchases is available in the MOVO iOS and Android apps.');
  await ensureConfigured();
  await sessionDetails(session);
  await NativePurchases.restorePurchases();
  const entitlement = await syncStorePurchases(session);
  const activeCount = (entitlement.entitlements || []).filter((item) =>
    ['active', 'grace_period', 'canceled'].includes(item.status) && Date.parse(item.expiresAt) > Date.now()
  ).length;
  return { restoredCount: activeCount, entitlement };
}

export async function manageStoreSubscriptions() {
  if (!isNativeApp()) throw new Error('Subscription management is available in the MOVO iOS and Android apps.');
  await ensureConfigured();
  return NativePurchases.manageSubscriptions();
}

export function isNativePurchasePlatform() {
  return isNativeApp() && ['ios', 'android'].includes(Capacitor.getPlatform());
}
