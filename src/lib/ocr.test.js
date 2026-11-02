import { parseReceipt } from './ocr';

test('reads total, merchant and date from receipt text', () => {
  const text = 'SM SUPERMARKET\nOfficial Receipt\nDate: 10/27/2026\nMilk 120.00\nBread 85.50\nSUBTOTAL 205.50\nTOTAL 1,205.50\nCASH 1,500.00';
  expect(parseReceipt(text)).toMatchObject({ amount: 1205.5, merchant: 'SM SUPERMARKET', date: '2026-10-27' });
});

test('falls back to the largest amount and ISO dates', () => {
  expect(parseReceipt('Jollibee\n2026-01-05\n1 Chickenjoy 99.00\n2 Spaghetti 120.00')).toMatchObject({ amount: 120, merchant: 'Jollibee', date: '2026-01-05' });
});

test('guesses categories from merchant names', () => {
  const { guessCategory } = require('./ocr');
  expect(guessCategory('JOLLIBEE QC')).toBe('Food & drinks');
  expect(guessCategory('Petron station 12')).toBe('Transport');
  expect(guessCategory('Unknown merchant')).toBe('Other');
});

test('reads an e-wallet payment confirmation: recipient, bank, reason, ref, time, fee', () => {
  const text = 'GCash\nSent via GCash\nAmount PHP 1,250.00\nSent to: Juan Dela Cruz\nMessage: Rent share for November\nTransaction Fee: 15.00\nRef No. 1234 567 890123\nNov 1, 2026 8:15 PM\nAccount ****4321';
  expect(parseReceipt(text)).toMatchObject({ amount: 1250, fee: 15, merchant: 'Juan Dela Cruz', reason: 'Rent share for November', bank: 'GCash', date: '2026-11-01', time: '20:15:00', last4: '4321', type: 'expense' });
  expect(parseReceipt(text).ref).toMatch(/^1234/);
});

test('recognises money received and day-first dates', () => {
  const text = 'BPI\nYou received PHP 5,000.00\nReceived from: Maria Santos\nPurpose: Freelance payment\n01 Nov 2026 09:30';
  expect(parseReceipt(text)).toMatchObject({ amount: 5000, merchant: 'Maria Santos', reason: 'Freelance payment', bank: 'BPI', date: '2026-11-01', type: 'income' });
});
