import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { restoreNativeStorage, refreshNativeNotifyPermission } from './lib/native';
import { restoreNativeAutomationKey } from './lib/nativeAutomationKey';
import { migrateLegacyOfflineReadCache } from './lib/offlineReadCache';
import { captureReferralFromUrl } from './lib/referrals';
import { installInteractionTracking } from './lib/interaction';

// The owner console (/owner) loads separately; customers never download it.
const OwnerConsole = React.lazy(() => import('./owner/OwnerConsole'));

const container = document.getElementById('root');

if (!container) {
  throw new Error('MOVO could not start because the root element is missing.');
}

// The customer splash is dismissed by App. The owner portal does not render App,
// so remove it here before it can cover or intercept owner controls.
const ownerRoute = window.location.pathname === '/owner' || window.location.pathname.startsWith('/owner/');
if (ownerRoute) document.getElementById('movo-splash')?.remove();
// A friend's download link (?ref=M78038) keeps the code on this device for the free month or Refer MOVO.
else captureReferralFromUrl();

// Passive touch tracking: decorative animation steps aside while the person interacts, and iOS shows :active at once.
installInteractionTracking();

const root = createRoot(container);
const render = () => root.render(
  <React.StrictMode>
    {ownerRoute
      ? <React.Suspense fallback={<div style={{ padding: 32 }}>Loading protected owner access…</div>}><OwnerConsole /></React.Suspense>
      : <App />}
  </React.StrictMode>
);

// In the iOS app, restore records iOS may have cleared from web storage before the first render. On the web this
// resolves immediately.
Promise.all([restoreNativeStorage(), refreshNativeNotifyPermission()])
  .then(() => restoreNativeAutomationKey())
  .catch(() => { /* Native vault failure disables use of the cached automation secret. */ })
  .finally(() => {
    render();
    // Migrate existing plaintext lists after first paint; failed items remain for safe retry.
    // Owner portal is isolated from customer financial storage.
    if (!ownerRoute) migrateLegacyOfflineReadCache().catch(() => {});
  });
