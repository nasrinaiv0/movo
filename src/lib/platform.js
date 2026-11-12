import { Capacitor } from '@capacitor/core';

/*
 * One codebase for the website and the iOS app. On the web every helper here returns what the code used before
 * (same-origin `/api/...`, `window.location.origin`), so the production site is unchanged.
 * Inside the iOS app (Capacitor) the bundled page runs at capacitor://localhost, so server calls and links that
 * people copy go to the production site instead. The app's HTTP goes through Capacitor's native client, so no CORS
 * or origin change is needed on the server.
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

/** URL for a MOVO API path such as `/api/log`: same-origin on the web, the production site in the app. */
export function apiUrl(path) {
  const clean = `/${String(path || '').replace(/^\/+/, '')}`;
  return isNativeApp() ? `${WEB_ORIGIN}${clean}` : clean;
}
