import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { restoreNativeStorage, refreshNativeNotifyPermission } from './lib/native';

const container = document.getElementById('root');

if (!container) {
  throw new Error('MOVO could not start because the root element is missing.');
}

const root = createRoot(container);
const render = () => root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// In the iOS app, restore records iOS may have cleared from web storage before the first render. On the web this
// resolves immediately.
Promise.all([restoreNativeStorage(), refreshNativeNotifyPermission()]).catch(() => {}).finally(render);
