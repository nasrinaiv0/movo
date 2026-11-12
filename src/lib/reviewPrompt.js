import { MovoNative } from './native';
import { nativePlatform } from './platform';

/*
 * Rate MOVO reminder (owner, 2026-11-12). On the iPhone and Android apps MOVO asks the store's own rating dialog to
 * appear (Apple's StoreKit review request, Google Play In-App Review). Both stores require their own dialog: Apple
 * disallows custom review prompts and Google asks apps not to pre-ask "Do you like the app?". So MOVO adds no screen
 * of its own; it only picks a good moment:
 *   - right after the person saves a new record (a moment that went well),
 *   - after at least 7 days with MOVO, on 5 or more different days, with 10 or more records,
 *   - at most once every 120 days and 3 times a year (the stores cap it further and may show nothing).
 * The stores never tell MOVO whether the dialog appeared or what was rated. The counters stay on this device
 * (localStorage `movo.reviewPrompt.v1`) and are never sent anywhere. The website never asks.
 */
export const REVIEW_KEY = 'movo.reviewPrompt.v1';
export const REVIEW_RULES = { minDays: 7, minActiveDays: 5, minRecords: 10, gapDays: 120, maxPerYear: 3 };
const DAY = 86400000;

const isDay = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));

/** Reads the device-only counters; anything unreadable starts fresh. */
export function readReviewState(storage = globalThis.localStorage) {
  try {
    const raw = JSON.parse(storage?.getItem(REVIEW_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return { since: '', lastDay: '', days: 0, asks: [] };
    return {
      since: isDay(raw.since) ? raw.since : '',
      lastDay: isDay(raw.lastDay) ? raw.lastDay : '',
      days: Number.isInteger(raw.days) && raw.days >= 0 ? Math.min(raw.days, 10000) : 0,
      asks: Array.isArray(raw.asks) ? raw.asks.filter(t => !Number.isNaN(Date.parse(t))).slice(-REVIEW_RULES.maxPerYear) : [],
    };
  } catch { return { since: '', lastDay: '', days: 0, asks: [] }; }
}

export function writeReviewState(state, storage = globalThis.localStorage) {
  try { storage?.setItem(REVIEW_KEY, JSON.stringify(state)); } catch { /* private mode or full storage: just ask less */ }
}

/** Counts each calendar day MOVO is opened once. */
export function noteActiveDay(state, day) {
  if (!isDay(day) || state.lastDay === day) return state;
  return { ...state, since: state.since || day, lastDay: day, days: state.days + 1 };
}

/** True when this is a good moment to request the store rating dialog. */
export function shouldAskForReview({ platform, state, records, now = Date.now(), rules = REVIEW_RULES }) {
  if (platform !== 'ios' && platform !== 'android') return false;
  if (!state.since || Date.parse(`${state.since}T00:00:00`) > now - rules.minDays * DAY) return false;
  if (state.days < rules.minActiveDays || records < rules.minRecords) return false;
  const asks = state.asks.map(Date.parse).filter(Number.isFinite);
  if (asks.some(t => t > now - rules.gapDays * DAY)) return false;
  return asks.filter(t => t > now - 365 * DAY).length < rules.maxPerYear;
}

/** Records the request, then asks the store. Resolves false on the web or when the device cannot show it. */
export async function requestStoreReview({ storage = globalThis.localStorage, now = Date.now() } = {}) {
  const platform = nativePlatform();
  if (platform !== 'ios' && platform !== 'android') return false;
  const state = readReviewState(storage);
  writeReviewState({ ...state, asks: [...state.asks, new Date(now).toISOString()].slice(-REVIEW_RULES.maxPerYear) }, storage);
  try { const { requested } = await MovoNative.requestReview(); return !!requested; } catch { return false; }
}
