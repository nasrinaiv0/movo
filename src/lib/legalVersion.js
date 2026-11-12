/*
 * Effective dates of the Terms of Service and Privacy Policy, and the version a person accepts during setup.
 * When either document's text changes, bump its date here: everyone is asked to accept again before MOVO opens.
 */
export const TERMS_EFFECTIVE_DATE = '2026-11-13T00:00:00Z';
export const PRIVACY_EFFECTIVE_DATE = '2026-11-13T00:00:00Z';
export const LEGAL_VERSION = [TERMS_EFFECTIVE_DATE, PRIVACY_EFFECTIVE_DATE].sort().pop().slice(0, 10);

/** True once these preferences hold an acceptance of the current Terms and Privacy Policy. */
export function hasAcceptedLegal(prefs) {
  const accepted = String(prefs?.legalAccepted || '');
  return /^\d{4}-\d{2}-\d{2}$/.test(accepted) && accepted >= LEGAL_VERSION;
}
