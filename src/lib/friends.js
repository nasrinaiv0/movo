import { apiUrl, appOrigin, isNativeApp } from './platform';
import { MovoNative } from './native';

const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const PENDING_KEY = 'movo.pendingFriendInvite.v1';
let pending = '';

export function friendInviteToken(input) {
  if (typeof input !== 'string') return '';
  const value = input.trim();
  if (TOKEN.test(value)) return value;
  try {
    const link = new URL(value);
    const currentOrigin = appOrigin();
    const allowed = link.origin === 'https://movo.nasrinai.com' || link.origin === currentOrigin;
    const match = /^#invite=([A-Za-z0-9_-]{43})$/.exec(link.hash);
    if (allowed && link.pathname === '/friend' && !link.search && !link.username && !link.password && match) return match[1];
  } catch { /* pasted text can be just an invite token */ }
  return '';
}

export function friendInviteUrl(token) {
  return typeof token === 'string' && TOKEN.test(token) ? `${appOrigin()}/friend#invite=${token}` : '';
}

export function saveFriendInvite(token) {
  pending = typeof token === 'string' && TOKEN.test(token) ? token : '';
  try {
    if (pending) window.sessionStorage.setItem(PENDING_KEY, pending);
    else window.sessionStorage.removeItem(PENDING_KEY);
  } catch { /* allow the active session to continue if browser storage is unavailable */ }
  return pending;
}

export function pendingFriendInvite() {
  if (pending) return pending;
  try { return friendInviteToken(window.sessionStorage.getItem(PENDING_KEY)); } catch { return ''; }
}

export function captureFriendInvite() {
  const match = /^#friend=([A-Za-z0-9_-]{43})$/.exec(window.location.hash);
  if (!match) return pendingFriendInvite();
  saveFriendInvite(match[1]);
  try { window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search); } catch { /* history is optional */ }
  return match[1];
}

export function friendDisplayName(value) {
  const name = Array.from(String(value || '').trim());
  if (!name.length || name.length > 40 || /[\p{Cc}\u202A-\u202E\u2066-\u2069]/u.test(name.join(''))) return '';
  return name.join('');
}

export async function friendsRequest(session, action = 'list', payload = {}, signal) {
  const headers = { Authorization: 'Bearer ' + session.access_token };
  const options = { headers, cache: 'no-store', signal };
  if (action !== 'list') {
    options.method = 'POST';
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify({ ...payload, action });
  }
  const response = await fetch(apiUrl('/api/friends'), options);
  const result = await response.json();
  if (!response.ok) {
    const error = new Error('Friends request failed');
    error.code = result.error;
    throw error;
  }
  return result;
}

export async function copyFriendInvite(url) {
  if (isNativeApp()) return MovoNative.copyFriendInvite({ url });
  return navigator.clipboard.writeText(url);
}

export async function shareFriendInvite(url, title) {
  if (isNativeApp()) {
    await MovoNative.shareFriendInvite({ url });
    return 'shared';
  }
  if (typeof navigator.share === 'function' && (!navigator.canShare || navigator.canShare({ url }))) {
    await navigator.share({ url, title });
    return 'shared';
  }
  await copyFriendInvite(url);
  return 'copied';
}
