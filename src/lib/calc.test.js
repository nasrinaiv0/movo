import { evaluate, press } from './calc';

const run = (keys) => keys.reduce(press, '');

test('respects operator precedence and rounds to centavos', () => {
  expect(evaluate('2+3×4')).toBe(14);
  expect(evaluate('10÷3')).toBe(3.33);
  expect(evaluate('100−25.5+')).toBe(74.5);
  expect(Number.isNaN(evaluate('5÷0'))).toBe(true);
});

test('keypad builds expressions like a phone calculator', () => {
  expect(run(['1', '2', '0', '0', '+', '3', '0', '0', '='])).toBe('1500');
  expect(run(['5', '0', '+', '1', '0', '%'])).toBe('50+5');
  expect(run(['8', '×', '+', '2'])).toBe('8+2');
  expect(run(['1', '.', '2', '5', '9'])).toBe('1.25');
  expect(run(['0', '0', '7'])).toBe('7');
  expect(run(['9', '9', '⌫'])).toBe('9');
  expect(run(['+', '4'])).toBe('4');
});
