/*
 * Effective dates of the Terms of Service and Privacy Policy, and the version a person accepts during setup.
 * When either document changes materially, update its date and explicit revision: the setup gate asks again.
 */
export const TERMS_EFFECTIVE_DATE = '2026-11-19T00:00:00Z';
export const PRIVACY_EFFECTIVE_DATE = '2026-11-19T00:00:00Z';
// A revision distinguishes material changes published on the same day.
export const LEGAL_VERSION = '2026-11-19-r2';
export const LEGAL_ACCEPTANCE_DATE = '2026-11-19';

/** True once these preferences hold an acceptance of the current Terms and Privacy Policy. */
export function hasAcceptedLegal(prefs) {
  return prefs?.legalAccepted === LEGAL_ACCEPTANCE_DATE && prefs?.legalAcceptedRevision === LEGAL_VERSION;
}

/** Keep the accepted version and its timestamp together; unknown future markers
 * must not overwrite a valid current acceptance and create a setup loop. */
export function mergeLegalAcceptance(local = {}, cloud = {}) {
  const candidates = [local, cloud].filter(value => typeof value?.legalAccepted === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(value.legalAccepted));
  const current = candidates.filter(hasAcceptedLegal);
  const selected = (current.length ? current : candidates).sort((a, b) =>
    a.legalAccepted.localeCompare(b.legalAccepted)
    || String(a.legalAcceptedRevision || '').localeCompare(String(b.legalAcceptedRevision || ''))
    || (Date.parse(a.legalAcceptedAt) || 0) - (Date.parse(b.legalAcceptedAt) || 0)).at(-1);
  return { legalAccepted: selected?.legalAccepted || '', legalAcceptedRevision: selected?.legalAcceptedRevision || '', legalAcceptedAt: selected?.legalAcceptedAt || '' };
}
