import { LEGAL_VERSION, TERMS_EFFECTIVE_DATE, PRIVACY_EFFECTIVE_DATE, hasAcceptedLegal } from './legalVersion';

test('the accepted version is the later of the two effective dates', () => {
  expect(LEGAL_VERSION).toBe([TERMS_EFFECTIVE_DATE, PRIVACY_EFFECTIVE_DATE].sort().pop().slice(0, 10));
  expect(LEGAL_VERSION).toBe('2026-11-13');
});

test('only an acceptance of the current version (or later) counts', () => {
  expect(hasAcceptedLegal({ legalAccepted: LEGAL_VERSION })).toBe(true);
  expect(hasAcceptedLegal({ legalAccepted: '2026-11-06' })).toBe(false);
  expect(hasAcceptedLegal({ legalAccepted: '2026-11-11' })).toBe(false);
  expect(hasAcceptedLegal({ legalAccepted: '' })).toBe(false);
  expect(hasAcceptedLegal({ legalAccepted: 'yes' })).toBe(false);
  expect(hasAcceptedLegal({ legalAccepted: true })).toBe(false);
  expect(hasAcceptedLegal(null)).toBe(false);
});
