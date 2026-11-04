import { supabase } from './supabaseClient';

export const ACCOUNT_QR_BUCKET = 'movo-account-qrs';
export const ACCOUNT_QR_MAX_BYTES = 1_258_291;
const DATA_URL = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/;
const safeId = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const requireStorage = () => {
  if (!supabase) throw new Error('cloud_storage_unavailable');
  return supabase.storage.from(ACCOUNT_QR_BUCKET);
};
const assertOwnedPath = (userId, path) => {
  if (!safeId(userId) || typeof path !== 'string' || !path.startsWith(`${userId}/`) || path.split('/').length !== 3 || !/^[0-9a-f-]{36}\.png$/i.test(path.split('/')[2])) {
    throw new Error('invalid_account_qr_path');
  }
  return path;
};
const dataUrlToBlob = async (dataUrl) => {
  const match = DATA_URL.exec(dataUrl || '');
  if (!match) throw new Error('invalid_account_qr_image');
  const binary = atob(match[1]);
  if (binary.length > ACCOUNT_QR_MAX_BYTES) throw new Error('account_qr_too_large');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  // Verify the PNG signature rather than trusting the data URL's declared MIME type.
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((byte, i) => bytes[i] === byte)) throw new Error('invalid_account_qr_image');
  return new Blob([bytes], { type: 'image/png' });
};

export async function uploadAccountQr(userId, accountId, dataUrl) {
  if (!safeId(userId) || !safeId(accountId)) throw new Error('invalid_account_qr_owner');
  const blob = await dataUrlToBlob(dataUrl);
  const fileId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : null;
  if (!fileId) throw new Error('secure_random_unavailable');
  const path = `${userId}/${accountId}/${fileId}.png`;
  const { error } = await requireStorage().upload(path, blob, { contentType: 'image/png', cacheControl: '3600', upsert: false });
  if (error) throw error;
  return path;
}

export async function getAccountQrSignedUrl(userId, path, expiresIn = 3600) {
  assertOwnedPath(userId, path);
  const seconds = Math.max(60, Math.min(3600, Number(expiresIn) || 3600));
  const { data, error } = await requireStorage().createSignedUrl(path, seconds);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('account_qr_url_missing');
  return data.signedUrl;
}

export async function removeAccountQr(userId, path) {
  if (!path) return;
  assertOwnedPath(userId, path);
  const { error } = await requireStorage().remove([path]);
  if (error) throw error;
}

export function isAccountQrDataUrl(value) {
  return typeof value === 'string' && DATA_URL.test(value);
}
