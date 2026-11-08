import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
const OwnerConsole = React.lazy(() => import('./owner/OwnerConsole'));
import { restoreNativeStorage, refreshNativeNotifyPermission } from './lib/native';
import { restoreNativeAutomationKey } from './lib/nativeAutomationKey';

const container = document.getElementById('root');

if (!container) {
  throw new Error('MOVO could not start because the root element is missing.');
}

// The customer splash is dismissed by App. The owner portal does not render App,
// so remove it here before it can cover or intercept owner controls.
const ownerRoute = /^\\/owner(?:\\/|$)/.test(window.location.pathname);
if (ownerRoute) document.getElementById('movo-splash')?.remove();

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
  .finally(render);
