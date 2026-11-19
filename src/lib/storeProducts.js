import products from './store-products.json';
import { money } from './format';

const PRICE_CACHE = 'movo.store-prices.v1';
const MONTHLY_PHP = { pro: 99, pro_plus: 149 };

/** Display metadata only. Cached and reference amounts cannot start checkout. */
export function displayStoreProducts(current = []) {
  let cached = [];
  try { cached = JSON.parse(localStorage.getItem(PRICE_CACHE)) || []; } catch { /* use published PHP pricing */ }
  if (!Array.isArray(cached)) cached = [];
  return STORE_PRODUCTS.map(item => {
    const fresh = current.find(p => p.productIdentifier === item.productIdentifier && p.priceString);
    if (fresh) return { ...item, ...fresh, priceSource: 'store' };
    const previous = cached.find(p => p.productIdentifier === item.productIdentifier && typeof p.priceString === 'string' && p.priceString.length < 120);
    if (previous) return { ...item, ...previous, priceSource: 'cached' };
    const price = Math.round(MONTHLY_PHP[item.tier] * (item.period === 'annual' ? 12 * 0.8 : 1) * 100) / 100;
    return { ...item, title: item.tier === 'pro' ? 'Pro' : 'Pro+', price, priceString: money(price, 'PHP'), currencyCode: 'PHP', priceSource: 'reference' };
  });
}

export function cacheStorePrices(items) {
  const prices = items.filter(p => STORE_PRODUCT_BY_ID[p.productIdentifier] && typeof p.priceString === 'string').map(p => ({
    productIdentifier: p.productIdentifier, price: p.price, priceString: p.priceString, currencyCode: p.currencyCode
  }));
  if (!prices.length) return;
  try { localStorage.setItem(PRICE_CACHE, JSON.stringify(prices)); } catch { /* reference amounts remain available */ }
}

export const STORE_PRODUCTS = Object.entries(products).map(([productIdentifier, value]) => ({
  productIdentifier,
  ...value,
}));

export const STORE_PRODUCT_BY_ID = Object.fromEntries(
  STORE_PRODUCTS.map((product) => [product.productIdentifier, product]),
);

/*
 * Annual saving (owner, 2026-11-12): the annual plans are priced 20% below twelve monthly payments in both stores
 * (annual = monthly × 12 × 0.8). The plans panel says "Save 20%" on Annual. When the store's own prices are loaded
 * (in the apps), the figure is worked out from them instead, so the claim always matches what the store charges.
 */
export const ANNUAL_SAVING_PERCENT = 20;

/** Compare only matching currencies and equally current price sources. */
export function annualSavingPercent(pairs) {
  const known = (pairs || []).filter(({ monthly, annual }) =>
    Number.isFinite(monthly?.price) && monthly.price > 0 && Number.isFinite(annual?.price) && annual.price > 0 &&
    monthly.currencyCode && monthly.currencyCode === annual.currencyCode && monthly.priceSource === annual.priceSource);
  if (!known.length) return 0;
  return Math.max(0, ...known.map(({ monthly, annual }) => Math.round((1 - annual.price / (monthly.price * 12)) * 100)));
}
