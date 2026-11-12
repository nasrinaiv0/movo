import { loyaltyCardStyle, loyaltyLogoUrl, loyaltyTypeLabel } from './loyaltyBranding';
test('unreviewed brands are displayed without remote icons or untrusted URLs', () => {
  expect(loyaltyLogoUrl('Starbucks')).toBe('');
  expect(loyaltyLogoUrl('7-Eleven')).toBe('');
  expect(loyaltyLogoUrl('https://ev.il/?token=secret')).toBe('');
  expect(loyaltyCardStyle('7-Eleven').bg).not.toBe(loyaltyCardStyle('Starbucks').bg);
});
test('card-specific category labels are accurate', () => {
  expect(loyaltyTypeLabel({ type: 'loyalty' })).toBe('Loyalty');
  expect(loyaltyTypeLabel({ type: 'membership' })).toBe('Membership');
  expect(loyaltyTypeLabel({ type: 'rewards' })).toBe('Rewards');
  expect(loyaltyTypeLabel({ type: 'tokens' })).toBe('Tokens');
  expect(loyaltyTypeLabel({ type: 'other', cardType: 'Gift club' })).toBe('Gift club');
});
