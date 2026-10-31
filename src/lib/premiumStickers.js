import { supabase, supabaseConfigured } from './supabaseClient';

export const PREMIUM_STICKER_BUCKET = 'premium-stickers';
const STORAGE_PREFIX = 'storage:';
const IMAGE_EXT = /\.webp$/i;
const title = value => value.split('-').map(part => part ? part[0].toUpperCase() + part.slice(1) : '').join(' ');
export function isStorageStickerId(id) { return typeof id === 'string' && id.startsWith(STORAGE_PREFIX); }
export function storageStickerPath(id) { return isStorageStickerId(id) ? id.slice(STORAGE_PREFIX.length) : ''; }
export function storageStickerName(path) { return (path.split('/').pop() || '').replace(/\.webp$/i, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
export function storageStickerGenre(path) { return title(path.split('/')[0] || 'Premium'); }

/* Read-only Storage integration. This module never uploads, edits, or deletes Storage objects. */
export async function listPremiumStickers() {
  if (!supabaseConfigured || !supabase) return [];
  const { data: folders, error } = await supabase.storage.from(PREMIUM_STICKER_BUCKET).list('', { limit: 200, sortBy: { column: 'name', order: 'asc' } });
  if (error) throw error;
  const collections = (folders || []).filter(item => item && !item.id && item.name && !item.name.startsWith('.'));
  const results = await Promise.all(collections.map(async folder => {
    const { data: files, error: fileError } = await supabase.storage.from(PREMIUM_STICKER_BUCKET).list(folder.name, { limit: 200, sortBy: { column: 'name', order: 'asc' } });
    if (fileError) throw fileError;
    return (files || []).filter(file => file && file.name && IMAGE_EXT.test(file.name) && file.id).map(file => {
      const path = folder.name + '/' + file.name;
      return { id: STORAGE_PREFIX + path, name: storageStickerName(path), genre: title(folder.name), storagePath: path, storage: true };
    });
  }));
  return results.flat();
}

export async function resolvePremiumStickerUrl(path) {
  if (!path || !supabaseConfigured || !supabase) return '';
  const { data, error } = await supabase.storage.from(PREMIUM_STICKER_BUCKET).createSignedUrl(path, 1800);
  if (error) throw error;
  return data && data.signedUrl ? data.signedUrl : '';
}
