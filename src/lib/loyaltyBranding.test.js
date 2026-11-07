import { loyaltyCardStyle, loyaltyLogoUrl, loyaltyTypeLabel } from './loyaltyBranding';
test('famous brands use curated compact logos, no merchant-supplied URL', () => {
  expect(loyaltyLogoUrl('Starbucks')).toContain('starbucks.ph');
  expect(loyaltyLogoUrl('7-Eleven')).toContain('7-eleven.com.ph');
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
