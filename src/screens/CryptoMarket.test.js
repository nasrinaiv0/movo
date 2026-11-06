import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import CryptoMarket from './CryptoMarket';
import { loadCryptoMarkets, loadCryptoHistory } from '../lib/crypto';
jest.mock('../lib/crypto', () => ({ loadCryptoMarkets: jest.fn(), loadCryptoHistory: jest.fn(), sortCryptoCoins: coins => coins }));
global.IS_REACT_ACT_ENVIRONMENT = true;
test('renders a single watchlist, updates an open price detail and switches to holdings', async () => {
  const coin = { id: 'btc-bitcoin', name: 'Bitcoin', symbol: 'BTC', price: 100, rank: 1, change24h: 2, updatedAt: '2026-11-06T00:00:00Z' };
  loadCryptoMarkets.mockResolvedValue({ coins: [coin] }); loadCryptoHistory.mockResolvedValue({ points: [] });
  const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el);
  await act(async () => root.render(<CryptoMarket c={{ base: 'PHP', prefs: {}, go: jest.fn(), updatePrefs: jest.fn() }} />));
  expect(el.querySelectorAll('.crypto-watchlist')).toHaveLength(1);
  expect(el.querySelectorAll('.crypto-watch-row')).toHaveLength(0);
  await act(async () => el.querySelector('.crypto-row-main').click());
  expect(el.querySelector('.crypto-detail-price').textContent).toContain('100');
  loadCryptoMarkets.mockResolvedValue({ coins: [{ ...coin, price: 125 }] });
  await act(async () => el.querySelector('.screen-header .round-button').click());
  expect(el.querySelector('.crypto-detail-price').textContent).toContain('125');
  await act(async () => el.querySelector('.crypto-back').click());
  await act(async () => el.querySelectorAll('[role="tab"]')[1].click());
  expect(el.querySelector('.crypto-portfolio')).not.toBeNull();
  act(() => root.unmount()); el.remove();
});

test('crypto telemetry follows refresh state and preserves the provider timestamp after failure', async () => {
  const coin = { id: 'btc-bitcoin', name: 'Bitcoin', symbol: 'BTC', price: 100, updatedAt: '2026-11-06T00:00:00Z' };
  loadCryptoMarkets.mockResolvedValue({ coins: [coin, { ...coin, id: 'invalid', updatedAt: 'not-a-date' }] });
  const el = document.createElement('div'); const root = createRoot(el);
  await act(async () => root.render(<CryptoMarket c={{ base: 'PHP', prefs: {}, go: jest.fn() }} />));
  expect(el.querySelector('.market-update time').dateTime).toBe('2026-11-06T00:00:00.000Z');
  let reject;
  loadCryptoMarkets.mockReturnValueOnce(new Promise((resolve, fail) => { reject = fail; }));
  await act(async () => el.querySelector('.market-refresh-button').click());
  expect(el.querySelector('.market-update').classList.contains('is-updating')).toBe(true);
  expect(el.querySelector('.market-refresh-button').disabled).toBe(true);
  await act(async () => reject(new Error('offline')));
  expect(el.querySelector('.market-update').classList.contains('is-updating')).toBe(false);
  expect(el.querySelector('.market-update').textContent).toContain('Refresh unavailable');
  expect(el.querySelector('.market-update time').dateTime).toBe('2026-11-06T00:00:00.000Z');
  expect(el.querySelector('.market-refresh-button').disabled).toBe(false);
  loadCryptoMarkets.mockResolvedValueOnce({ stale: true, coins: [coin] });
  await act(async () => el.querySelector('.market-refresh-button').click());
  expect(el.querySelector('.market-update').classList.contains('is-stale')).toBe(true);
  act(() => root.unmount());
});

test('a previous currency request cannot overwrite the current market or its update time', async () => {
  let resolveOld;
  loadCryptoMarkets.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
  const el = document.createElement('div'); const root = createRoot(el);
  const c = { prefs: {}, go: jest.fn() };
  await act(async () => root.render(<CryptoMarket c={{ ...c, base: 'PHP' }} />));
  loadCryptoMarkets.mockResolvedValueOnce({ coins: [{ id: 'btc-bitcoin', name: 'Bitcoin', symbol: 'BTC', price: 100, updatedAt: '2026-11-06T01:00:00Z' }] });
  await act(async () => root.render(<CryptoMarket c={{ ...c, base: 'USD' }} />));
  await act(async () => resolveOld({ coins: [{ id: 'btc-bitcoin', name: 'Bitcoin', symbol: 'BTC', price: 999, updatedAt: '2026-11-05T00:00:00Z' }] }));
  expect(el.querySelector('.market-update time').dateTime).toBe('2026-11-06T01:00:00.000Z');
  expect(el.querySelector('.crypto-price').textContent).toContain('$100.00');
  act(() => root.unmount());
});
