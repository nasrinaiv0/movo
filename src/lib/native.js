import { registerPlugin } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Preferences } from '@capacitor/preferences';
import { LocalNotifications } from '@capacitor/local-notifications';
import { isNativeApp } from './platform';

/*
 * iOS app services. Every function here is a no-op (or returns the web answer) outside the app, so the website
 * behaves exactly as before. MovoNative is MOVO's own Swift plugin (ios/App/App/MovoNativePlugin.swift).
 */
export const MovoNative = registerPlugin('MovoNative');
export const AUTH_CALLBACK = 'movo://auth-callback';

/* ---------- Storage: iOS may clear a web view's storage, so MOVO's keys are mirrored to native Preferences. ---------- */
const KEEP = /^(movo\.|sb-)/;
let mirrored = false;

/** Before the app renders: restore MOVO keys missing from localStorage, then mirror every later write. */
export async function restoreNativeStorage(storage = typeof window !== 'undefined' ? window.localStorage : null) {
  if (!isNativeApp() || !storage || mirrored) return;
  mirrored = true;
  try {
    const { keys } = await Preferences.keys();
    for (const key of keys) {
      if (!KEEP.test(key) || storage.getItem(key) !== null) continue;
      const { value } = await Preferences.get({ key });
      if (value !== null && value !== undefined) storage.setItem(key, value);
    }
  } catch { /* the web copy stays the working copy */ }
  const proto = Object.getPrototypeOf(storage);
  const { setItem, removeItem, clear } = proto;
  proto.setItem = function mirroredSet(key, value) {
    setItem.call(this, key, value);
    if (this === storage && KEEP.test(String(key))) Preferences.set({ key: String(key), value: String(value) }).catch(() => {});
  };
  proto.removeItem = function mirroredRemove(key) {
    removeItem.call(this, key);
    if (this === storage && KEEP.test(String(key))) Preferences.remove({ key: String(key) }).catch(() => {});
  };
  proto.clear = function mirroredClear() {
    clear.call(this);
    if (this === storage) Preferences.clear().catch(() => {});
  };
}

/* ---------- Links: movo://auth-callback (sign-in return) and movo://log?… (payment links) ---------- */

/** Parse a movo:// URL into what the app should do with it. Pure, so it is unit-tested. */
export function readAppUrl(url) {
  let parsed;
  try { parsed = new URL(url); } catch { return null; }
  if (parsed.protocol !== 'movo:') return null;
  const route = `${parsed.hostname}${parsed.pathname}`.replace(/\/+$/, '');
  const params = new URLSearchParams(parsed.search || '');
  const hash = new URLSearchParams((parsed.hash || '').replace(/^#/, ''));
  if (route === 'auth-callback') {
    const error = params.get('error_description') || params.get('error') || hash.get('error_description') || hash.get('error');
    return { kind: 'auth', code: params.get('code') || '', error: error || '' };
  }
  if (route === 'log') return { kind: 'log', hash: `#/log?${params.toString()}` };
  return null;
}

/** Listen for movo:// links. `onAuth({ code, error })` finishes sign-in; log links reuse the web #/log handler. */
export function listenForAppUrls({ onAuth } = {}) {
  if (!isNativeApp()) return () => {};
  const handle = ({ url }) => {
    const link = readAppUrl(url);
    if (!link) return;
    if (link.kind === 'auth') { Browser.close().catch(() => {}); onAuth?.(link); }
    if (link.kind === 'log') window.location.hash = link.hash;
  };
  const pending = CapApp.addListener('appUrlOpen', handle);
  CapApp.getLaunchUrl().then(launch => { if (launch?.url) handle(launch); }).catch(() => {});
  return () => { pending.then(h => h.remove()).catch(() => {}); };
}

/** Open a sign-in page in the system browser sheet (Google refuses sign-in inside embedded web views). */
export async function openAuthBrowser(url) {
  await Browser.open({ url, presentationStyle: 'popover' });
}

/* ---------- Notifications ---------- */
let notifyPermission = 'default';

export async function refreshNativeNotifyPermission() {
  if (!isNativeApp()) return notifyPermission;
  try { const { display } = await LocalNotifications.checkPermissions(); notifyPermission = display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'default'; } catch { /* keep the last answer */ }
  return notifyPermission;
}
export const nativeNotifyPermission = () => notifyPermission;

export async function requestNativeNotify() {
  try { const { display } = await LocalNotifications.requestPermissions(); notifyPermission = display === 'granted' ? 'granted' : 'denied'; } catch { notifyPermission = 'denied'; }
  return notifyPermission;
}

/** A stable positive 31-bit id per tag, so a repeated alert replaces itself instead of stacking. */
export function notificationId(tag = '') {
  let h = 7;
  for (const ch of String(tag)) h = (h * 31 + ch.charCodeAt(0)) % 2147483647;
  return h || 1;
}

export async function showNativeNotification(title, body, tag) {
  if (notifyPermission !== 'granted') return false;
  try { await LocalNotifications.schedule({ notifications: [{ id: notificationId(tag || title), title, body }] }); return true; } catch { return false; }
}

/* ---------- Face ID / Touch ID ---------- */
export async function nativeBiometricStatus() {
  try { return await MovoNative.biometricStatus(); } catch { return { available: false, type: 'none' }; }
}
export async function nativeAuthenticate(reason) {
  try { const { success } = await MovoNative.authenticate({ reason }); return !!success; } catch { return false; }
}


// Keychain-backed device credential helpers. Server/RLS authorization remains mandatory.
// Only the allowlisted automationKey is accepted by the Swift implementation.
// Never call these in browsers: an absent native plugin is NOT a secure-storage fallback.
export async function setNativeAutomationKey(value) {
  if (!isNativeApp()) throw new Error('Native secure storage is unavailable on the web.');
  if (typeof value !== 'string' || !/^[a-f0-9]{32}$/i.test(value)) throw new Error('Invalid device key.');
  await MovoNative.secureSet({ key: 'automationKey', value });
}
export async function getNativeAutomationKey() {
  if (!isNativeApp()) return null;
  const result = await MovoNative.secureGet({ key: 'automationKey' });
  return result?.value ?? null;
}
export async function removeNativeAutomationKey() {
  if (!isNativeApp()) throw new Error('Native secure storage is unavailable on the web.');
  await MovoNative.secureRemove({ key: 'automationKey' });
}
