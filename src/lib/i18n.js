import { createElement, Fragment } from 'react';
import { VERSION } from '../i18n/locales/version';

/*
 * Lightweight translation layer. English text is the key, so anything untranslated falls back to English.
 * Each language's dictionary is a separate chunk loaded on demand (and cached on the device for an instant
 * start next time). `locale` drives number, currency and date formatting; `dir` flips right-to-left scripts.
 */
export const LANGUAGES = [
  { code: 'en', name: 'English', locale: 'en-PH', dir: 'ltr' },
  { code: 'fil', name: 'Filipino', locale: 'fil-PH', dir: 'ltr' },
  { code: 'ar', name: 'العربية', locale: 'ar-u-nu-latn', dir: 'rtl' },
  { code: 'zh', name: '中文（简体）', locale: 'zh-CN', dir: 'ltr' },
  { code: 'es', name: 'Español', locale: 'es-ES', dir: 'ltr' },
  { code: 'it', name: 'Italiano', locale: 'it-IT', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', locale: 'de-DE', dir: 'ltr' },
  { code: 'fr', name: 'Français', locale: 'fr-FR', dir: 'ltr' },
  { code: 'pt', name: 'Português', locale: 'pt-BR', dir: 'ltr' },
  { code: 'ja', name: '日本語', locale: 'ja-JP', dir: 'ltr' },
  { code: 'ko', name: '한국어', locale: 'ko-KR', dir: 'ltr' },
  { code: 'hi', name: 'हिन्दी', locale: 'hi-IN', dir: 'ltr' },
];

export function detectLanguage() {
  try {
    const wanted = (navigator.languages || [navigator.language]).map(l => String(l).toLowerCase());
    for (const w of wanted) {
      const hit = LANGUAGES.find(l => w === l.code || w.startsWith(`${l.code}-`) || (l.code === 'fil' && w.startsWith('tl')));
      if (hit) return hit.code;
    }
  } catch { /* no navigator */ }
  return 'en';
}

let current = LANGUAGES[0];
let dict = null;
const CACHE = 'movo.i18n.cache';
const readCache = (code) => { try { const c = JSON.parse(localStorage.getItem(CACHE)); return c && c.code === code && c.version === VERSION ? c.dict : null; } catch { return null; } };
export const getLanguage = () => current;
export const langInfo = (code) => LANGUAGES.find(l => l.code === code) || LANGUAGES[0];

/** Switches the active language; returns the language record. Uses the cached dictionary when available. */
export function setLanguage(code) {
  const next = langInfo(code);
  if (next.code !== current.code || (!dict && next.code !== 'en')) dict = next.code === 'en' ? null : readCache(next.code);
  current = next;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = current.code;
    document.documentElement.dir = current.dir;
  }
  return current;
}

/** Loads (or refreshes) the active language's dictionary. Resolves true when new text became available. */
export async function loadLanguage(code = current.code) {
  if (code === 'en') return false;
  const mod = await import(`../i18n/locales/${code}.json`);
  const loaded = mod.default || mod;
  if (current.code !== code) return false;
  const changed = dict !== loaded && JSON.stringify(dict || {}).length !== JSON.stringify(loaded).length;
  dict = loaded;
  try { localStorage.setItem(CACHE, JSON.stringify({ code, version: VERSION, dict: loaded })); } catch { /* storage full or blocked */ }
  return changed;
}

/** Translates `text`, replacing {placeholders} with values from `vars`. */
export function t(text, vars) {
  let out = (dict && dict[text]) || text;
  if (vars) Object.keys(vars).forEach(k => { out = out.split(`{${k}}`).join(vars[k]); });
  return out;
}

/**
 * Like t(), but placeholders may be React nodes (links, bold text), so whole sentences stay translatable:
 * rich('Read the {terms} for details.', { terms: <button>Terms</button> })
 */
export function rich(text, vars = {}) {
  return t(text).split(/(\{\w+\})/).filter(Boolean).map((part, i) => {
    const m = /^\{(\w+)\}$/.exec(part);
    return createElement(Fragment, { key: i }, m && vars[m[1]] !== undefined ? vars[m[1]] : part);
  });
}
