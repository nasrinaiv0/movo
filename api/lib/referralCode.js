'use strict';
// Referral codes are "M" + five digits (M78038). When the digit codes run short, the five characters continue
// with 0-9 and A-Z without I and O. Keep in step with src/lib/referrals.js and the SQL check constraint.
const SHORT_CODE = /^M[0-9A-HJ-NP-Z]{5}$/;
// Codes issued before 2026-11-09 (24 hex characters) stay accepted until the short-code migration is applied.
const LEGACY_CODE = /^[a-f0-9]{24}$/;

function normalizeReferralCode(value) {
  if (typeof value !== 'string') return null;
  const code = value.replace(/\s+/g, '').toUpperCase();
  return SHORT_CODE.test(code) ? code : null;
}

/** For the free month: a short code (upper case) or a legacy code (lower case); '' means no code. */
function normalizeTrialCode(value) {
  if (value == null) return '';
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, '');
  if (!trimmed) return '';
  if (LEGACY_CODE.test(trimmed.toLowerCase())) return trimmed.toLowerCase();
  return normalizeReferralCode(trimmed);
}

// Reasons the database can give for not linking a code; anything else is reported as not eligible.
const CLAIM_ERRORS = new Set(['already_referred', 'account_not_new', 'already_purchased', 'invalid_referral_code',
  'own_referral_code', 'too_many_attempts', 'verified_account_required']);

module.exports = { SHORT_CODE, LEGACY_CODE, normalizeReferralCode, normalizeTrialCode, CLAIM_ERRORS };
