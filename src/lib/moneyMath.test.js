import { moneyCents, roundMoney, sumMoney } from './moneyMath';

test('rounds decimal ties symmetrically and sums cents without floating-point residue', () => {
  expect(roundMoney(1.005)).toBe(1.01);
  expect(roundMoney(-1.005)).toBe(-1.01);
  expect(sumMoney([0.1, 0.2, -0.3])).toBe(0);
  expect(moneyCents(1e30)).toBeNaN();
  expect(moneyCents(Infinity)).toBeNaN();
});
