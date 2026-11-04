import { groceryLineTotal, groceryTotal } from './grocery';

test('calculates grocery line totals using price times quantity', () => {
  expect(groceryLineTotal(45, 2)).toBe(90);
  expect(groceryLineTotal('56', '3')).toBe(168);
});
test('totals only named grocery items and rounds to cents', () => {
  expect(groceryTotal([{name:'Rice',price:45,quantity:2},{name:'Eggs',price:56,quantity:3},{name:'',price:100,quantity:1}])).toBe(258);
});
test('rejects invalid prices and quantities', () => {
  expect(groceryLineTotal(-1, 2)).toBe(0);
  expect(groceryLineTotal(10, 0)).toBe(0);
});
