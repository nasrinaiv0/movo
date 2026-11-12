import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { restoreNativeStorage, refreshNativeNotifyPermission } from './lib/native';
import { restoreNativeAutomationKey } from './lib/nativeAutomationKey';
import { migrateLegacyOfflineReadCache } from './lib/offlineReadCache';
import { initialiseFinanceVault, migrateFinanceLocalStorage } from './lib/financeVault';
import { migrateHybridFinanceEncryption } from './lib/hybridFinanceEncryption';
import { migrateLocalAccountQrEncryption } from './lib/accountQrLocalStore';
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

// The customer app MUST have its persistent encryption key and its legacy
// snapshots/journal migrated BEFORE React can read or mutate financial records.
// Never render an empty wallet on vault failure: doing so risks overwriting the
// only surviving copy of un-synced financial records.
function showFinanceVaultBlocked() {
  document.getElementById('movo-splash')?.remove();
  root.render(
    <main role="alert" style={{ maxWidth: 520, margin: '12vh auto', padding: 28, lineHeight: 1.55 }}>
      <h1>Saved financial records are locked</h1>
      <p>MOVO could not safely unlock records stored on this device. Your existing
        offline records have not been deleted.</p>
      <p>Do not uninstall MOVO or clear its app data. Reopen the app after unlocking
        your device, or contact support@nasrinai.com for assistance.</p>
    </main>
  );
}

(async () => {
  try {
    await Promise.all([restoreNativeStorage(), refreshNativeNotifyPermission()]);
    if (!ownerRoute) {
      await initialiseFinanceVault();
      await migrateFinanceLocalStorage();
      await migrateHybridFinanceEncryption();
      await migrateLocalAccountQrEncryption();
    }
    // Automation auth secrets have a separate fail-closed vault. An automation
    // vault error must not prevent the finance data already verified from loading.
    await restoreNativeAutomationKey().catch(() => {});
    render();
    if (!ownerRoute) migrateLegacyOfflineReadCache().catch(() => {});
  } catch {
    if (ownerRoute) render(); // Owner portal does not load customer records.
    else showFinanceVaultBlocked();
  }
})();
