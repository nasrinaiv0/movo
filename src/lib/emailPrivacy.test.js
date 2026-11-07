import { maskEmail } from './emailPrivacy';
test('hides most characters without exposing the full identity', () => {
  expect(maskEmail('nasrin.abubakar@gmail.com')).toBe('na••••@g••••.com');
  expect(maskEmail('a@example.org')).toBe('a••••@e••••.org');
  expect(maskEmail('')).toBe('••••');
  expect(maskEmail('invalid address')).toBe('••••');
});
test('never changes the original authentication address', () => {
  const full = 'test.user+alias@example.com';
  expect(maskEmail(full)).not.toBe(full);
  expect(full).toBe('test.user+alias@example.com');
});
