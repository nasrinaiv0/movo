import { ANNUAL_SAVING_PERCENT, annualSavingPercent } from './storeProducts';

test('Annual saves 20% by owner policy when no store prices are known', () => {
  expect(ANNUAL_SAVING_PERCENT).toBe(20);
  expect(annualSavingPercent()).toBe(20);
  expect(annualSavingPercent([{ monthly: null, annual: null }, { monthly: { price: 199 } }])).toBe(20);
});

test('with store prices the figure comes from them, so the claim matches what the store charges', () => {
  // Priced at 80% of twelve months: 199 × 12 × 0.8 = 1,910.40.
  expect(annualSavingPercent([{ monthly: { price: 199 }, annual: { price: 1910.4 } }])).toBe(20);
  // A store set to a different price shows its real saving (the best across plans), never the policy number.
  expect(annualSavingPercent([{ monthly: { price: 349 }, annual: { price: 3490 } }, { monthly: { price: 199 }, annual: { price: 2388 } }])).toBe(17);
  // No real saving: nothing to claim.
  expect(annualSavingPercent([{ monthly: { price: 100 }, annual: { price: 1200 } }])).toBe(0);
  expect(annualSavingPercent([{ monthly: { price: 100 }, annual: { price: 1500 } }])).toBe(0);
});
