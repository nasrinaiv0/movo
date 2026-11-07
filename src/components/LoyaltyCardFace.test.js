import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import LoyaltyCardFace from './LoyaltyCardFace';

test('merchant reward card displays a small approved logo and points, never peso balance', () => {
  const html = renderToStaticMarkup(<LoyaltyCardFace card={{ type: 'loyalty', name: '7-Eleven', points: '25.5', memberNumber: '12345678', pointsUnit: 'points' }} />);
  expect(html).toContain('loyalty-card-face');
  expect(html).toContain('7-eleven.com.ph');
  expect(html).toContain('25.5');
  expect(html).toContain('•••• 5678');
  expect(html).not.toContain('₱');
});

test('Other card uses the custom label and never fetches an untrusted merchant', () => {
  const html = renderToStaticMarkup(<LoyaltyCardFace card={{ type: 'other', name: 'Unknown Store', cardType: 'Gift club', points: '0' }} />);
  expect(html).toContain('Gift club');
  expect(html).not.toContain('google.com');
  expect(html).toContain('0');
});
