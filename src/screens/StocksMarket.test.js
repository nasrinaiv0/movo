import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import StocksMarket, { formatStocksLastUpdate } from './StocksMarket';
import { TOP_GLOBAL_STOCKS } from '../data/topGlobalStocks';
import { loadStockHistory, loadStockQuote, searchStocks } from '../lib/stocks';

jest.mock('../lib/stocks', () => ({
  loadStockQuote: jest.fn(),
  loadStockHistory: jest.fn(),
  searchStocks: jest.fn()
}));
global.IS_REACT_ACT_ENVIRONMENT = true;

const quote = (symbol, fetchedAt='2026-11-06T00:02:00.000Z') => ({
  quote: { symbol, name: symbol === 'AAPL' ? 'Apple' : symbol, currency: 'USD',
    exchange: 'NASDAQ', price: 123.45, changePercent: -0.02 },
  provider: 'Twelve Data', fetchedAt
});

let root, container;
beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  loadStockHistory.mockResolvedValue({ points: [] });
  loadStockQuote.mockImplementation(symbol => Promise.resolve(quote(symbol)));
  searchStocks.mockResolvedValue([]);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.clearAllMocks();
});

async function renderScreen(c={ prefs: { stockWatchlist: ['AAPL'] }, base: 'USD', go: jest.fn(), setPref: jest.fn() }) {
  await act(async () => {
    root.render(<StocksMarket c={c}/>);
    await new Promise(resolve => setTimeout(resolve, 20));
  });
}

test('shows 100 ranked companies after My Watchlist without 100 automatic quote requests', async () => {
  await renderScreen();
  const watch = container.querySelector('.stock-section:not(.stock-top-global)');
  const directory = container.querySelector('.stock-top-global');
  expect(watch).not.toBeNull();
  expect(directory).not.toBeNull();
  expect(TOP_GLOBAL_STOCKS).toHaveLength(100);
  expect(new Set(TOP_GLOBAL_STOCKS.map(item => item.symbol)).size).toBe(100);
  expect(container.textContent).toContain('100 companies');
  expect(directory.querySelectorAll('.stock-global-row')).toHaveLength(100);
  expect(directory.querySelector('.stock-global-row .stock-global-rank').textContent).toBe('1');
  expect(directory.querySelectorAll('.stock-logo[src*="google.com/s2/favicons"]')).toHaveLength(100);
  expect(loadStockQuote).toHaveBeenCalledTimes(1);
  expect(loadStockQuote).toHaveBeenCalledWith('AAPL', {force:false});
  expect(container.querySelector('.stock-update-copy time').dateTime).toBe('2026-11-06T00:02:00.000Z');
  expect(container.textContent).toContain('Last Update');
  expect(container.textContent).toContain('Quotes load as you browse');
  expect(formatStocksLastUpdate(null)).toBe('Awaiting market data');
  expect(formatStocksLastUpdate('invalid')).toBe('Awaiting market data');
});

test('animates the refresh icon while loading and shows only the provider timestamp after a successful response', async () => {
  await renderScreen();
  let resolve;
  loadStockQuote.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  const refresh = container.querySelector('button[aria-label="Refresh stock quotes"]');
  expect(refresh).not.toBeNull();
  act(() => refresh.click());
  expect(container.querySelector('.stock-refresh-icon.is-loading')).not.toBeNull();
  expect(container.querySelector('button[aria-label="Refreshing stock quotes"]').disabled).toBe(true);
  expect(container.querySelector('.stock-update-copy time').dateTime).toBe('2026-11-06T00:02:00.000Z');
  await act(async () => {
    resolve(quote('AAPL', '2026-11-06T05:45:00.000Z'));
    await new Promise(r => setTimeout(r, 0));
  });
  expect(container.querySelector('.stock-refresh-icon.is-loading')).toBeNull();
  expect(container.querySelector('.stock-update-copy time').dateTime).toBe('2026-11-06T05:45:00.000Z');
  expect(container.querySelector('button[aria-label="Refresh stock quotes"]').disabled).toBe(false);
});

test('opens a ranked company and fetches a quote on demand, not an invented price', async () => {
  await renderScreen();
  const row = container.querySelector('button[aria-label="View Shopify stock details"]');
  expect(row).not.toBeNull();
  await act(async () => {
    row.click();
    await new Promise(resolve => setTimeout(resolve, 20));
  });
  expect(loadStockQuote).toHaveBeenCalledWith('SHOP');
  expect(loadStockHistory).toHaveBeenCalledWith('SHOP', 90);
  expect(container.querySelector('.stock-detail')).not.toBeNull();
  expect(container.textContent).toContain('Shopify');
  expect(container.textContent).toContain('$123.45');
});

test('lazy Top 100 prices show provider-reported value and signed daily percentage only for visible rows', async () => {
  const observers = [];
  const original = global.IntersectionObserver;
  global.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; this.nodes = []; observers.push(this); }
    observe(node) { this.nodes.push(node); }
    disconnect() {}
  };
  try {
    await renderScreen();
    // Visibility is opt-in. The directory does not request quotes for all 100.
    expect(loadStockQuote.mock.calls.map(([symbol]) => symbol)).toEqual(['AAPL']);
    const rank = container.querySelectorAll('.stock-global-row')[2]; // Microsoft
    const target = rank.querySelector('.stock-global-price');
    expect(target.textContent).toBe('——');
    const observer = observers.find(o => o.nodes.includes(target));
    expect(observer).toBeTruthy();
    await act(async () => {
      observer.callback([{ isIntersecting: true }]);
      await new Promise(resolve => setTimeout(resolve, 30));
    });
    expect(loadStockQuote).toHaveBeenCalledWith('MSFT');
    expect(target.querySelector('strong').textContent).toBe('$123.45');
    expect(target.querySelector('small').textContent).toBe('-0.02%');
    expect(target.querySelector('small').classList.contains('down')).toBe(true);
    const privateRow = container.querySelectorAll('.stock-global-row')[7];
    expect(privateRow.querySelector('.stock-global-price strong').textContent).toBe('Private');
    expect(loadStockQuote.mock.calls.map(([symbol]) => symbol)).not.toContain('SPCX');
  } finally { global.IntersectionObserver = original; }
});

test('unavailable price/percentage never default to fabricated zero percent', () => {
  const {formatStockMove} = require('./StocksMarket');
  expect(formatStockMove(null)).toBe('—');
  expect(formatStockMove(undefined)).toBe('—');
  expect(formatStockMove(0)).toBe('0.00%');
  expect(formatStockMove(-1.256)).toBe('-1.26%');
  expect(formatStockMove(1.25)).toBe('+1.25%');
});
