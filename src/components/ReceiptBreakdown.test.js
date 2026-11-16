import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ReceiptBreakdown from './ReceiptBreakdown';

global.IS_REACT_ACT_ENVIRONMENT = true;
let host, root;
beforeEach(() => { host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });

const receipt = {
  amount: 159, total: 159, tax: 17.04, taxableSales: 141.96, cashTendered: 500,
  change: 341, paymentMethod: 'cash', taxIncluded: true, warnings: [],
  items: [{ quantity: 1, name: 'Chicken meal', total: 159, options: ['1 Regular Fries', '1 Small Coke'] }],
};

test('review shows item modifiers and separately editable tax, tender and change', () => {
  act(() => root.render(<ReceiptBreakdown receipt={receipt} onChange={() => {}} />));
  expect(host.textContent).toContain('Receipt items');
  expect(host.querySelector('input[value="Chicken meal"]')).toBeTruthy();
  expect(host.querySelector('input[value="1 Regular Fries, 1 Small Coke"]')).toBeTruthy();
  expect(host.querySelector('input[value="17.04"]')).toBeTruthy();
  expect(host.querySelector('input[value="500"]')).toBeTruthy();
  expect(host.querySelector('input[value="341"]')).toBeTruthy();
  expect(host.textContent).toContain('not additional expenses');
});

test('cash/change mismatch is highlighted without modifying the expense amount', () => {
  act(() => root.render(<ReceiptBreakdown receipt={{ ...receipt, change: 250 }} onChange={() => {}} />));
  expect(host.querySelector('[role="alert"]')?.textContent).toMatch(/do not match/);
  expect(receipt.amount).toBe(159);
});

test('zero items still presents an add item action', () => {
  act(() => root.render(<ReceiptBreakdown receipt={{ ...receipt, items: [] }} onChange={() => {}} />));
  expect(host.textContent).toContain('Add item');
});
