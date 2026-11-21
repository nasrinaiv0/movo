import { Capacitor } from '@capacitor/core';
import { publicApiOrigin } from './publicApiOrigin.js';

/*
 * One codebase for the website and the iOS app. On the web every helper here returns what the code used before
 * (same-origin `/api/...`, `window.location.origin`), so the production site is unchanged.
 * Inside the app the bundled page uses the production API. A reviewed build-time API origin can move those calls
 * to an independent host. Public web/share/auth origins remain separate. No failed write is replayed elsewhere.
 */
export const WEB_ORIGIN = 'https://movo.nasrinai.com';

export function isNativeApp() {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

/** 'ios' or 'android' inside the app, 'web' otherwise. */
export function nativePlatform() {
  try { return Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web'; } catch { return 'web'; }
}

/** The public origin of MOVO: this site on the web, the production site in the app. */
export function appOrigin() {
  if (isNativeApp() || typeof window === 'undefined') return WEB_ORIGIN;
  return window.location.origin;
}

/** API hosting can move without changing public identity, owner scopes or database endpoints. */
export function apiOrigin() {
  try { return publicApiOrigin(process.env.REACT_APP_API_ORIGIN) || appOrigin(); }
  catch { return appOrigin(); } // bad configuration cannot redirect credentials or stop local startup
}

/** URL for a MOVO API path. Defaults stay compatible; a build-time HTTPS origin is optional. */
export function apiUrl(path) {
  const clean = `/${String(path || '').replace(/^\/+/, '')}`;
  const origin = apiOrigin();
  const url = new URL(clean, origin);
  if (clean.includes('\\') || url.origin !== origin || !/^\/api(?:\/|$)/.test(url.pathname)) throw Error('Invalid MOVO API path.');
  return isNativeApp() || origin !== appOrigin() ? url.href : `${url.pathname}${url.search}${url.hash}`;
}
