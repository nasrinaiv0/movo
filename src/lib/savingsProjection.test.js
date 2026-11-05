import { estimateSavingsGrowth } from './savingsProjection';

test('estimates compound interest on an existing balance and monthly savings', () => {
  const result = estimateSavingsGrowth(10000, 1000, 12, 12, 'monthly');
  expect(result.months).toBe(12);
  expect(result.totalContributions).toBe(22000);
  expect(result.projectedBalance).toBeGreaterThan(22000);
  expect(result.interestEarned).toBeGreaterThan(0);
});

test('supports quarterly and annual compounding and clamps unsafe inputs', () => {
  const quarterly = estimateSavingsGrowth(10000, 500, 10, 12, 'quarterly');
  const annual = estimateSavingsGrowth(10000, 500, 10, 12, 'annually');
  expect(quarterly.projectedBalance).toBeGreaterThan(annual.projectedBalance);
  expect(estimateSavingsGrowth(-100, -10, 500, 1000).totalContributions).toBe(0);
});
