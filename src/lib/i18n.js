import { createElement, Fragment } from 'react';
import { STRINGS } from '../i18n/strings';

/*
 * Lightweight translation layer. English text is the key, so untranslated strings fall back to English.
 * `locale` drives number, currency and date formatting; `dir` flips the layout for right-to-left scripts.
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
export const getLanguage = () => current;
export const langInfo = (code) => LANGUAGES.find(l => l.code === code) || LANGUAGES[0];

/** Switches the active language; returns the language record. */
export function setLanguage(code) {
  current = langInfo(code);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = current.code;
    document.documentElement.dir = current.dir;
  }
  return current;
}

/** Translates `text`, replacing {placeholders} with values from `vars`. */
export function t(text, vars) {
  const entry = current.code === 'en' ? null : STRINGS[text];
  let out = (entry && entry[current.code]) || text;
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
