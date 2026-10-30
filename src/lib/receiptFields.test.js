import { findReference, findTime, parseReceipt } from './ocr';

test('reads reference numbers from receipts and payment confirmations', () => {
  expect(findReference('Ref No. 1012 345 678')).toBe('1012');
  expect(findReference('Reference No: 7781234567\nAmount 500.00')).toBe('7781234567');
  expect(findReference('Transaction ID: TXN-88AB12')).toBe('TXN-88AB12');
  expect(findReference('OR No. 004512')).toBe('004512');
  expect(findReference('Thank you for shopping')).toBe('');
});

test('reads the time of day in 12h or 24h form', () => {
  expect(findTime('10/29/2026 3:45 PM')).toBe('15:45:00');
  expect(findTime('Time 09:05:33')).toBe('09:05:33');
  expect(findTime('12:10 am')).toBe('00:10:00');
  expect(findTime('Total 1,439.50')).toBe('');
});

test('parseReceipt returns time and reference with the totals', () => {
  const r = parseReceipt('PUREGOLD PRICE CLUB\n2026-10-29 14:32\nInvoice No. INV-20931\nTOTAL 1,439.50');
  expect(r).toMatchObject({ amount: 1439.5, date: '2026-10-29', time: '14:32:00', ref: 'INV-20931' });
});
