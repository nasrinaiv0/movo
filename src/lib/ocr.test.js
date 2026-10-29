import { parseReceipt } from './ocr';

test('reads total, merchant and date from receipt text', () => {
  const text = 'SM SUPERMARKET\nOfficial Receipt\nDate: 10/27/2026\nMilk 120.00\nBread 85.50\nSUBTOTAL 205.50\nTOTAL 1,205.50\nCASH 1,500.00';
  expect(parseReceipt(text)).toEqual({ amount: 1205.5, merchant: 'SM SUPERMARKET', date: '2026-10-27' });
});

test('falls back to the largest amount and ISO dates', () => {
  expect(parseReceipt('Jollibee\n2026-01-05\n1 Chickenjoy 99.00\n2 Spaghetti 120.00')).toEqual({ amount: 120, merchant: 'Jollibee', date: '2026-01-05' });
});

test('guesses categories from merchant names', () => {
  const { guessCategory } = require('./ocr');
  expect(guessCategory('JOLLIBEE QC')).toBe('Food & drinks');
  expect(guessCategory('Petron station 12')).toBe('Transport');
  expect(guessCategory('Unknown merchant')).toBe('Other');
});
