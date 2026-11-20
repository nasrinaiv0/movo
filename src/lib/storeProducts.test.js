import { ANNUAL_SAVING_PERCENT, annualSavingPercent, displayStoreProducts, cacheStorePrices } from './storeProducts';

test('all four amounts are visible offline and checkout metadata stays separate', () => {
  localStorage.clear();
  const prices = displayStoreProducts();
  expect(prices.map(p => p.price)).toEqual([99, 950.4, 149, 1430.4]);
  expect(prices.every(p => p.priceSource === 'reference')).toBe(true);
  cacheStorePrices([{ productIdentifier: prices[0].productIdentifier, price: 2.99, priceString: '$2.99', offerToken: 'secret-offer' }]);
  expect(displayStoreProducts()[0]).toMatchObject({ priceString: '$2.99', priceSource: 'cached' });
  expect(localStorage.getItem('movo.store-prices.v1')).not.toContain('secret-offer');
  expect(displayStoreProducts([{ productIdentifier: prices[0].productIdentifier, priceString: '$3.99' }])[0]).toMatchObject({ priceString: '$3.99', priceSource: 'store' });
  localStorage.clear();
});

test('Annual saves 20% by owner policy from the approved PHP reference amounts', () => {
  expect(ANNUAL_SAVING_PERCENT).toBe(20);
  expect(annualSavingPercent([{ monthly: displayStoreProducts()[0], annual: displayStoreProducts()[1] }])).toBe(20);
  expect(annualSavingPercent([{ monthly: null, annual: null }, { monthly: { price: 199, currencyCode: 'PHP', priceSource: 'store' } }])).toBe(0);
});

test('with store prices the figure comes from them, so the claim matches what the store charges', () => {
  // Priced at 80% of twelve months: 199 × 12 × 0.8 = 1,910.40.
  expect(annualSavingPercent([{ monthly: { price: 199, currencyCode: 'PHP', priceSource: 'store' }, annual: { price: 1910.4, currencyCode: 'PHP', priceSource: 'store' } }])).toBe(20);
  // A store set to a different price shows its real saving (the best across plans), never the policy number.
  expect(annualSavingPercent([{ monthly: { price: 349, currencyCode: 'PHP', priceSource: 'store' }, annual: { price: 3490, currencyCode: 'PHP', priceSource: 'store' } }, { monthly: { price: 199, currencyCode: 'PHP', priceSource: 'store' }, annual: { price: 2388, currencyCode: 'PHP', priceSource: 'store' } }])).toBe(17);
  // No real saving: nothing to claim.
  expect(annualSavingPercent([{ monthly: { price: 100, currencyCode: 'PHP', priceSource: 'store' }, annual: { price: 1200, currencyCode: 'PHP', priceSource: 'store' } }])).toBe(0);
  expect(annualSavingPercent([{ monthly: { price: 100, currencyCode: 'PHP', priceSource: 'store' }, annual: { price: 1500, currencyCode: 'PHP', priceSource: 'store' } }])).toBe(0);
});

test('mixed currencies, partial store responses and mixed quote sources never advertise savings', () => {
  const monthly = { price: 99, currencyCode: 'PHP', priceSource: 'reference' };
  expect(annualSavingPercent([{ monthly, annual: { price: 20, currencyCode: 'USD', priceSource: 'store' } }])).toBe(0);
  expect(annualSavingPercent([{ monthly, annual: { price: 950.4, currencyCode: 'PHP', priceSource: 'store' } }])).toBe(0);
});
