import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import SearchOverlay from './SearchOverlay';

global.IS_REACT_ACT_ENVIRONMENT = true;

const transactions = [
  { id: 'expense-1', merchant: 'Clothes', amount: 50000, currency: 'PHP', type: 'expense', category: 'shopping', accountName: 'Asia United Bank (AUB)', date: '2026-11-05' },
  { id: 'income-1', merchant: 'Cashback', amount: 56, currency: 'PHP', type: 'income', category: 'income', accountName: 'BPI', date: '2026-11-05' },
  { id: 'transfer-1', merchant: 'Savings move', amount: 1000, currency: 'PHP', type: 'transfer', category: 'transfer', accountName: 'BPI', date: '2026-11-05' },
];

test('uses the MOVO mark and a category icon instead of merchant initials for every recent transaction', async () => {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => root.render(<SearchOverlay txs={transactions} show refDate={new Date('2026-11-05T12:00:00Z')} onOpen={() => {}} onClose={() => {}} />));
  const rows = [...el.querySelectorAll('.search-row')];
  expect(rows).toHaveLength(3);
  rows.forEach(row => {
    expect(row.querySelector('.search-result-icon .movo-mark')).not.toBeNull();
    expect(row.querySelector('.search-result-category .movo-icon')).not.toBeNull();
    expect(row.querySelector('.tile.mono')).toBeNull();
  });
  expect(rows[0].querySelector('.search-result-category').classList.contains('tone-amber')).toBe(true);
  expect(rows[1].querySelector('.search-result-category').classList.contains('tone-green')).toBe(true);
  expect(rows[2].querySelector('.search-result-category').classList.contains('tone-gray')).toBe(true);
  await act(async () => root.unmount()); el.remove();
});
