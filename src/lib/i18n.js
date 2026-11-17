import { createElement, Fragment } from 'react';
import { EXPANDED_LOCALES, VERSION } from '../i18n/locales/version';
import records from '../i18n/languages.json';
import preview from '../i18n/preview/core.json';

/*
 * Lightweight translation layer. English text is the key, so anything untranslated falls back to English.
 * Dictionaries load on demand and are cached on the device. Bundled core labels are available immediately.
 */
export const LANGUAGES = records.map(([code, name, englishName, locale, dir = 'ltr']) => ({
  code, name, englishName, locale, dir,
  preview: Object.hasOwn(preview.translations, code) && !EXPANDED_LOCALES[code]?.complete,
}));
const byCode = new Map(LANGUAGES.map(language => [language.code, language]));
const previewKeyIndex = new Map(preview.keys.map((key, index) => [key, index]));

function matchLanguage(tag) {
  const [base, ...subtags] = String(tag).toLowerCase().split('-');
  if (base === 'tl') return byCode.get('fil');
  if (base === 'cmn') return byCode.get('zh');
  if (base === 'arb') return byCode.get('ar');
  if (base === 'ar' && subtags.includes('eg')) return byCode.get('arz');
  if (base === 'pa' && (subtags.includes('arab') || subtags.includes('pk'))) return byCode.get('pnb');
  if (base === 'ku') return byCode.get(subtags.includes('arab') || subtags.includes('iq') ? 'ckb' : 'kmr');
  if (base === 'fa' && subtags.includes('af')) return byCode.get('prs');
  return byCode.get(base);
}

export function detectLanguage() {
  try {
    const wanted = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const w of wanted) {
      const hit = matchLanguage(w);
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
export const langInfo = (code) => byCode.get(code) || LANGUAGES[0];

/** Switches the active language; returns the language record. Uses the cached dictionary when available. */
export function setLanguage(code) {
  const next = langInfo(code);
  if (next.code !== current.code) dict = next.code === 'en' ? null : readCache(next.code);
  current = next;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = current.code;
    document.documentElement.dir = current.dir;
  }
  return current;
}

/** Loads (or refreshes) the active language's dictionary. Resolves true when new text became available. */
export async function loadLanguage(code = current.code) {
  if (current.code !== code || code === 'en' || (current.preview && !Object.hasOwn(EXPANDED_LOCALES, code))) return false;
  const loaded = Object.hasOwn(EXPANDED_LOCALES, code)
    ? (await import(`../i18n/extra/${code}.json`)).default.messages
    : (await import(`../i18n/locales/${code}.json`)).default;
  if (current.code !== code) return false;
  const changed = dict !== loaded && JSON.stringify(dict) !== JSON.stringify(loaded);
  dict = loaded;
  try { localStorage.setItem(CACHE, JSON.stringify({ code, version: VERSION, dict: loaded })); } catch { /* storage full or blocked */ }
  return changed;
}

/** Translates `text`, replacing {placeholders} with values from `vars`. */
export function t(text, vars) {
  const previewText = Object.hasOwn(preview.translations, current.code)
    ? preview.translations[current.code][previewKeyIndex.get(text)] : undefined;
  let out = dict && Object.hasOwn(dict, text) ? dict[text] : previewText || text;
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
