import products from './store-products.json';

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

/** The saving to show on Annual: from the store's prices when both periods are known, else the owner's policy. */
export function annualSavingPercent(pairs) {
  const known = (pairs || []).filter(({ monthly, annual }) => monthly?.price > 0 && annual?.price > 0);
  if (!known.length) return ANNUAL_SAVING_PERCENT;
  return Math.max(0, ...known.map(({ monthly, annual }) => Math.round((1 - annual.price / (monthly.price * 12)) * 100)));
}
