import { LEGAL_VERSION, TERMS_EFFECTIVE_DATE, PRIVACY_EFFECTIVE_DATE, hasAcceptedLegal, mergeLegalAcceptance, LEGAL_ACCEPTANCE_DATE } from './legalVersion';

test('material same-day changes have an explicit revision tied to the effective date', () => {
  expect(LEGAL_VERSION).toBe([TERMS_EFFECTIVE_DATE, PRIVACY_EFFECTIVE_DATE].sort().pop().slice(0, 10) + '-r2');
  expect(hasAcceptedLegal({ legalAccepted: '2026-11-19' })).toBe(false);
});

test('only the exact current revision counts; unknown future versions cannot waive notice', () => {
  expect(hasAcceptedLegal({ legalAccepted: LEGAL_ACCEPTANCE_DATE, legalAcceptedRevision: LEGAL_VERSION })).toBe(true);
  expect(hasAcceptedLegal({ legalAccepted: '2026-11-06' })).toBe(false);
  expect(hasAcceptedLegal({ legalAccepted: '' })).toBe(false);
  expect(hasAcceptedLegal({ legalAccepted: 'yes' })).toBe(false);
  expect(hasAcceptedLegal({ legalAccepted: true })).toBe(false);
  expect(hasAcceptedLegal(null)).toBe(false);
  expect(hasAcceptedLegal({ legalAccepted: '2099-01-01-r99' })).toBe(false);
});

test('cloud merging cannot replace a current acceptance with an unknown future marker', () => {
  const current = { legalAccepted: LEGAL_ACCEPTANCE_DATE, legalAcceptedRevision: LEGAL_VERSION, legalAcceptedAt: '2026-11-19T13:00:00Z' };
  const future = { legalAccepted: '2099-01-01-r99', legalAcceptedAt: '2099-01-01T00:00:00Z' };
  expect(mergeLegalAcceptance(current, future)).toEqual(current);
  expect(mergeLegalAcceptance(future, current)).toEqual(current);
});

test('acceptance version and time remain paired across devices', () => {
  const olderVersion = { legalAccepted: '2026-11-18', legalAcceptedAt: '2026-11-19T15:00:00Z' };
  const newerVersion = { legalAccepted: '2026-11-19', legalAcceptedAt: '2026-11-19T10:00:00Z' };
  expect(mergeLegalAcceptance(olderVersion, newerVersion)).toEqual({ ...newerVersion, legalAcceptedRevision: '' });
  expect(mergeLegalAcceptance({ legalAccepted: LEGAL_ACCEPTANCE_DATE, legalAcceptedRevision: LEGAL_VERSION, legalAcceptedAt: '2026-11-19T13:00:00Z' },
    { legalAccepted: LEGAL_ACCEPTANCE_DATE, legalAcceptedRevision: LEGAL_VERSION, legalAcceptedAt: '2026-11-19T14:00:00Z' }).legalAcceptedAt).toBe('2026-11-19T14:00:00Z');
});

 test('legacy clients continue accepting the date field while new clients require this revision', () => {
  const oldClientAccepts = prefs => /^\d{4}-\d{2}-\d{2}$/.test(prefs.legalAccepted) && prefs.legalAccepted >= '2026-11-19';
  const accepted = { legalAccepted: LEGAL_ACCEPTANCE_DATE, legalAcceptedRevision: LEGAL_VERSION, legalAcceptedAt: '2026-11-19T12:00:00Z' };
  expect(oldClientAccepts(accepted)).toBe(true);
  expect(hasAcceptedLegal(accepted)).toBe(true);
  expect(hasAcceptedLegal({ legalAccepted: LEGAL_ACCEPTANCE_DATE })).toBe(false);
 });
