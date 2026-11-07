import { supportsAccountQr } from './accountQrEligibility';

test('only banks and e-wallets may carry a payment QR image', () => {
  expect(supportsAccountQr('bank')).toBe(true);
  expect(supportsAccountQr('e_wallet')).toBe(true);
  ['card', 'cash', 'other', 'membership', '', null, undefined].forEach(type => {
    expect(supportsAccountQr(type)).toBe(false);
  });
});
