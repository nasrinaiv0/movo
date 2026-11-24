import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { planningSummary } from './usePlanning';
import { convert } from './fx';
import { TransactionRow } from '../components/ui';

global.IS_REACT_ACT_ENVIRONMENT = true;

// Audit 2026-11-23: one record in a currency with no exchange rate turned planning totals invalid.
const rates = { USD: 1, PHP: 58 };
const toBase = (value, from) => convert(value, from || 'PHP', 'PHP', rates);

test('a loan in a currency with no rate counts as 0 instead of breaking net worth', () => {
  const summary = planningSummary({
    accounts: [{ id: 'bank', account_type: 'bank', currency: 'PHP', balance: 1000 }],
    loans: [{ id: 'l1', status: 'active', outstanding_principal: 500, currency: 'XAU' }, { id: 'l2', status: 'active', outstanding_principal: 200, currency: 'PHP' }],
    toBase,
  });
  expect(Number.isFinite(summary.position.netWorth)).toBe(true);
  expect(summary.position.assets).toBe(1000);
  expect(summary.loans.total).toBe(200);
});

test('such a record still shows its own amount and currency in the list', async () => {
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  const t = { id: 'x', merchant: 'Gold dealer', type: 'expense', amount: 0, unconvertible: true, origAmount: 2, origCurrency: 'XAU', currency: 'PHP', date: '2026-11-20T02:00:00Z', accountName: 'Vault' };
  await act(async () => { root.render(<TransactionRow t={t} show refDate={new Date('2026-11-23T00:00:00Z')} />); });
  expect(container.textContent).toMatch(/XAU/);
  expect(container.textContent).not.toMatch(/₱0\.00/);
  await act(async () => root.unmount());
});
