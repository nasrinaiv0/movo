import React, { useState } from 'react';
import { t as tr } from '../lib/i18n';
import { getStoreEntitlements, isNativePurchasePlatform, manageStoreSubscriptions, restoreStorePurchases } from '../lib/nativePurchases';

/*
 * Restore purchases and Manage subscription, always shown (owner, 2026-11-12) wherever plans appear: the plans
 * panel and Plan & Usage. Neither is ever hidden or greyed out.
 *  - iPhone / Android app: Restore asks the App Store or Google Play to restore, then the server verifies it;
 *    Manage opens the store's own subscription page.
 *  - Website: Restore re-checks this MOVO account's verified plan (purchases made in the apps show up once the
 *    same MOVO account is signed in); Manage offers the App Store and Google Play subscription pages.
 *  - Signed out: Restore asks the person to sign in first, because store purchases are linked to a MOVO account.
 * Cancelling and refunds always happen in the store; MOVO never cancels or changes a subscription itself.
 */
export const STORE_MANAGE_URLS = {
  apple: 'https://apps.apple.com/account/subscriptions',
  google: 'https://play.google.com/store/account/subscriptions?package=com.nasrinai.movo',
};

const activeCount = (result) => (result?.entitlements || []).filter((item) =>
  ['active', 'grace_period', 'canceled'].includes(item.status) && Date.parse(item.expiresAt) > Date.now()).length;

export default function SubscriptionLinks({ session, onSignIn, onRefresh, className = '' }) {
  const native = isNativePurchasePlatform();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [stores, setStores] = useState(false);

  const restore = async () => {
    setMessage('');
    if (!session?.access_token) {
      if (onSignIn) onSignIn(); else setMessage(tr('Sign in to MOVO to link and restore your store purchases.'));
      return;
    }
    setBusy(true);
    try {
      const result = native ? (await restoreStorePurchases(session)).entitlement : await getStoreEntitlements(session);
      await onRefresh?.(result);
      setMessage(activeCount(result)
        ? tr('Your purchases were restored and verified.')
        : native ? tr('No active MOVO subscription was found for this store account.')
          : tr('No active MOVO subscription was found for this account. Purchases made in the iOS or Android app appear here when you sign in with the same MOVO account.'));
    } catch (error) {
      setMessage(error?.message || tr('Could not restore purchases. Please try again.'));
    } finally { setBusy(false); }
  };

  const manage = () => {
    setMessage('');
    if (!native) { setStores(open => !open); return; }
    manageStoreSubscriptions().catch((error) => setMessage(error?.message || tr('Could not open subscription management.')));
  };

  return <div className={`subscription-links ${className}`.trim()}>
    <div className="subscription-links-row">
      <button type="button" className="link-button" disabled={busy} onClick={restore}>{busy ? tr('Please wait…') : tr('Restore purchases')}</button>
      <button type="button" className="link-button" aria-expanded={native ? undefined : stores} onClick={manage}>{tr('Manage subscription')}</button>
    </div>
    {stores && <div className="subscription-links-stores">
      <a href={STORE_MANAGE_URLS.apple} target="_blank" rel="noopener noreferrer">{tr('App Store subscriptions')}</a>
      <a href={STORE_MANAGE_URLS.google} target="_blank" rel="noopener noreferrer">{tr('Google Play subscriptions')}</a>
    </div>}
    {message && <p className="subscription-links-message" role="status" aria-live="polite">{message}</p>}
  </div>;
}
