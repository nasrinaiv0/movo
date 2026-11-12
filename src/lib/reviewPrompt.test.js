import { REVIEW_KEY, noteActiveDay, readReviewState, requestStoreReview, shouldAskForReview, writeReviewState } from './reviewPrompt';

jest.mock('./platform', () => ({ nativePlatform: () => mockPlatform }));
jest.mock('./native', () => ({ MovoNative: { requestReview: (...args) => mockRequestReview(...args) } }));
let mockPlatform = 'ios';
let mockRequestReview;

const memory = () => { const data = {}; return { getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data }; };
const NOW = Date.parse('2026-11-12T10:00:00Z');
const ready = { since: '2026-10-01', lastDay: '2026-11-11', days: 6, asks: [] };

beforeEach(() => { mockPlatform = 'ios'; mockRequestReview = jest.fn().mockResolvedValue({ requested: true }); });

test('counts each calendar day once and remembers the first day', () => {
  let state = readReviewState(memory());
  state = noteActiveDay(state, '2026-11-01');
  state = noteActiveDay(state, '2026-11-01');
  state = noteActiveDay(state, '2026-11-03');
  expect(state).toEqual({ since: '2026-11-01', lastDay: '2026-11-03', days: 2, asks: [] });
  expect(noteActiveDay(state, 'not a day')).toBe(state);
});

test('asks only in the phone apps, after a week, five active days and ten records', () => {
  const ask = (over = {}) => shouldAskForReview({ platform: 'ios', state: ready, records: 12, now: NOW, ...over });
  expect(ask()).toBe(true);
  expect(ask({ platform: 'android' })).toBe(true);
  expect(ask({ platform: 'web' })).toBe(false);
  expect(ask({ records: 9 })).toBe(false);
  expect(ask({ state: { ...ready, days: 4 } })).toBe(false);
  expect(ask({ state: { ...ready, since: '2026-11-09' } })).toBe(false);
  expect(ask({ state: { ...ready, since: '' } })).toBe(false);
});

test('waits 120 days between requests and makes at most three a year', () => {
  const ask = (asks) => shouldAskForReview({ platform: 'ios', state: { ...ready, asks }, records: 50, now: NOW });
  expect(ask(['2026-09-01T00:00:00Z'])).toBe(false);
  expect(ask(['2026-07-01T00:00:00Z'])).toBe(true);
  expect(ask(['2026-01-01T00:00:00Z', '2026-05-01T00:00:00Z', '2026-07-01T00:00:00Z'])).toBe(false);
});

test('bad saved values start fresh instead of breaking', () => {
  const store = memory();
  store.setItem(REVIEW_KEY, '{oops');
  expect(readReviewState(store)).toEqual({ since: '', lastDay: '', days: 0, asks: [] });
  store.setItem(REVIEW_KEY, JSON.stringify({ since: 'x', lastDay: 3, days: -2, asks: ['nope', '2026-01-01T00:00:00Z'] }));
  expect(readReviewState(store)).toEqual({ since: '', lastDay: '', days: 0, asks: ['2026-01-01T00:00:00Z'] });
});

test('records the request and calls the store dialog on the phone; the website never asks', async () => {
  const store = memory();
  writeReviewState(ready, store);
  await expect(requestStoreReview({ storage: store, now: NOW })).resolves.toBe(true);
  expect(mockRequestReview).toHaveBeenCalledTimes(1);
  expect(readReviewState(store).asks).toEqual([new Date(NOW).toISOString()]);
  mockPlatform = 'web';
  await expect(requestStoreReview({ storage: store, now: NOW })).resolves.toBe(false);
  expect(mockRequestReview).toHaveBeenCalledTimes(1);
  mockPlatform = 'android';
  mockRequestReview.mockRejectedValueOnce(new Error('no Play Store'));
  await expect(requestStoreReview({ storage: store, now: NOW })).resolves.toBe(false);
});
