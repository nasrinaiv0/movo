import products from './store-products.json';

export const STORE_PRODUCTS = Object.entries(products).map(([productIdentifier, value]) => ({
  productIdentifier,
  ...value,
}));

export const STORE_PRODUCT_BY_ID = Object.fromEntries(
  STORE_PRODUCTS.map((product) => [product.productIdentifier, product]),
);
