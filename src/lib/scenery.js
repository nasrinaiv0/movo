import { WALLPAPER_THEMES } from './stickers';

/*
 * Background sceneries: any Scenery wallpaper, or the person's own photo, painted behind the whole app with a
 * page-coloured veil on top so text and cards stay readable in light and dark themes.
 */
export const SCENERIES = WALLPAPER_THEMES.filter(t => t.genre === 'Scenery');
export const PHOTO = 'photo';
const KEY = 'movo.scenery.photo.v1';
const MAX_SIDE = 1440;

export const loadSceneryPhoto = () => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } };
/** Returns false when the browser refuses to store the photo (private mode or storage full). */
export const saveSceneryPhoto = (url) => { try { if (url) localStorage.setItem(KEY, url); else localStorage.removeItem(KEY); return true; } catch { return false; } };

/** Image URL for a saved scenery choice, or '' for the plain background. */
export function scenerySrc(id, photo = '') {
  if (!id) return '';
  if (id === PHOTO) return /^data:image\/jpeg;base64,/.test(photo) ? photo : '';
  return SCENERIES.find(s => s.id === id)?.src || '';
}

/** Veil opacity for a visibility setting from 0 (barely there) to 100 (vivid); never fully clear, for legibility. */
export const veilFor = (visibility) => (0.9 - 0.55 * Math.min(100, Math.max(0, Number(visibility) || 0)) / 100).toFixed(2);

/** Downscales a chosen photo to a JPEG that fits comfortably in local storage. */
export function toSceneryPhoto(file, messages) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) { reject(new Error(messages.type)); return; }
    if (file.size > 15 * 1024 * 1024) { reject(new Error(messages.size)); return; }
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      const s = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(messages.read)); };
    img.src = url;
  });
}
