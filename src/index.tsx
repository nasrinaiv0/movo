import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');

if (!container) {
  throw new Error('MOVO could not start because the root element is missing.');
}

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
