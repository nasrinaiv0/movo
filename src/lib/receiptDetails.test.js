import { parseReceiptDetails } from './receiptDetails';
import { parseReceipt } from './ocr';

const mcdo = [
  'Your order number is', '166',
  'GOLDEN ARCHES DEVELOPMENT CORPORATION',
  "MCDONALD'S RESTAURANT-DAMOSA",
  'GATEWAY DAVAO BRANCH', 'Invoice # 00560659',
  'Date:11/14/2026 02:41:33',
  'QTY ITEM PRICE TOTAL',
  '1 MA 1CknSE+CCS 159.00 159.00',
  '1 Regular Fries',
  '1 Sml Coke',
  'Eat-In Total 159.00',
  'Cash Tendered 500.00',
  'Change 341.00',
  'Vatable Sales 141.96',
  'VAT 17.04',
  'VAT Exempt Sales 0.00',
  'VAT Exemptions 0.00',
].join('\n');

test('McDonalds 159 meal: item components, included VAT, tender and change do not double charge', () => {
  const d = parseReceiptDetails(mcdo);
  expect(d).toMatchObject({
    total: 159, tax: 17.04, taxableSales: 141.96, vatExemptSales: 0,
    cashTendered: 500, change: 341, taxIncluded: true, paymentMethod: 'cash',
    merchantHint: "MCDONALD'S RESTAURANT-DAMOSA", warnings: [],
  });
  expect(d.items).toEqual([{ quantity: 1, name: 'MA 1CknSE+CCS', unitPrice: 159, total: 159,
    options: ['1 Regular Fries', '1 Sml Coke'] }]);
  const receipt = parseReceipt(mcdo);
  expect(receipt).toMatchObject({
    amount: 159, total: 159, date: '2026-11-14', time: '02:41:33', ref: '00560659',
    merchant: "MCDONALD'S RESTAURANT-DAMOSA", cashTendered: 500, change: 341,
    type: 'expense',
  });
});

test('missing total: never mistake cash tendered, change or VAT for spending', () => {
  for (const bad of [
    'Cafe 99\nCash Tendered 500.00\nChange 341.00\nVAT 17.04',
    'STORE\nAmount Tendered 500.00\nChange 341.00',
    'Market\nInvoice # 11111111\nVAT 17.04\nTaxable sales 141.96',
  ]) {
    expect(parseReceipt(bad).amount).toBe(0);
    expect(parseReceipt(bad).warnings).toContain('Total not found. Enter the actual amount before logging.');
  }
});

test('an explicitly stated payment amount is accepted for digital receipts', () => {
  const r = parseReceipt('GCash\nSent via GCash\nAmount PHP 1,250.00\nSent to: Juan Dela Cruz\nNov 1, 2026 8:15 PM');
  expect(r.amount).toBe(1250);
  expect(r.paymentMethod).toBe('wallet');
  expect(r.items).toEqual([]);
});

test('multiple incompatible totals require review without substituting tendered amount', () => {
  const d = parseReceiptDetails('Store\nSubtotal 100.00\nTotal 100.00\nTotal 80.00\nCash tendered 500.00\nChange 420.00');
  expect(d.total).toBe(80);
  expect(d.warnings).toContain('Multiple different totals found. Check the amount.');
});

test('discounted itemized receipts do not treat discounts as extra charges', () => {
  const d = parseReceiptDetails('MINIMART\nQTY ITEM PRICE TOTAL\n2 Eggs 45.00 90.00\nSubtotal 90.00\nDiscount 10.00\nTOTAL 80.00');
  expect(d.items).toEqual([{ quantity: 2, name: 'Eggs', unitPrice: 45, total: 90, options: [] }]);
  expect(d).toMatchObject({ total: 80, subtotal: 90, discount: 10 });
  expect(d.warnings).toEqual([]);
});
