import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TransactionRow } from './ui';

const transaction = {
  merchant: 'SM Supermarket',
  type: 'expense',
  amount: 1250,
  currency: 'PHP',
  date: '2026-10-30T02:24:00.000Z',
  method: 'Metrobank'
};

const refDate = new Date('2026-10-30T00:00:00.000Z');

describe('TransactionRow accessibility and balance privacy', () => {
  test('uses the visible transaction details as the accessible name', () => {
    const markup = renderToStaticMarkup(
      <TransactionRow t={transaction} show refDate={refDate} />
    );

    // An incomplete aria-label previously hid the visible date/account from
    // the accessible name, causing WCAG label-content-name-mismatch failures.
    expect(markup).not.toMatch(/class="tx-row"[^>]*aria-label=/);
    expect(markup).toContain('SM Supermarket');
    expect(markup).toContain('Metrobank');
    expect(markup).toContain('1,250.00');
  });

  test('does not render the actual amount when balances are hidden', () => {
    const markup = renderToStaticMarkup(
      <TransactionRow t={transaction} show={false} refDate={refDate} />
    );

    expect(markup).toContain('SM Supermarket');
    expect(markup).toContain('Metrobank');
    expect(markup).not.toContain('1,250.00');
    expect(markup).not.toMatch(/aria-label="[^"]*1,250/);
  });
});
