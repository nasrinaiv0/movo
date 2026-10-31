/**
 * Institution favicon registry.
 *
 * Keep institution names and official domains here rather than scattering
 * long favicon URLs throughout components. The URL is generated at runtime
 * by getInstitutionFaviconUrl().
 *
 * Favicon endpoint: Google S2 favicons. It may return a site favicon rather
 * than the institution's official brand logo; always provide a UI fallback.
 * This registry is a display aid, not a bank connection or endorsement.
 *
 * Review institution domains before adding entries. Never derive a domain
 * from arbitrary user-entered institution text.
 */

export const INSTITUTION_FAVICONS = {
  // Philippines
  'BDO Unibank': { domain: 'bdo.com.ph', countryCode: 'PH' },
  BPI: { domain: 'bpi.com.ph', countryCode: 'PH' },
  Metrobank: { domain: 'metrobank.com.ph', countryCode: 'PH' },
  'Land Bank of the Philippines': { domain: 'landbank.com', countryCode: 'PH' },
  'Philippine National Bank': { domain: 'pnb.com.ph', countryCode: 'PH' },
  UnionBank: { domain: 'unionbankph.com', countryCode: 'PH' },
  'Security Bank': { domain: 'securitybank.com', countryCode: 'PH' },
  Chinabank: { domain: 'chinabank.ph', countryCode: 'PH' },
  RCBC: { domain: 'rcbc.com', countryCode: 'PH' },
  'Development Bank of the Philippines': { domain: 'dbp.ph', countryCode: 'PH' },
  GCash: { domain: 'gcash.com', countryCode: 'PH', kind: 'e_wallet' },
  Maya: { domain: 'maya.ph', countryCode: 'PH', kind: 'e_wallet' },

  // United States
  Chase: { domain: 'chase.com', countryCode: 'US' },
  'Bank of America': { domain: 'bankofamerica.com', countryCode: 'US' },
  'Wells Fargo': { domain: 'wellsfargo.com', countryCode: 'US' },
  Citibank: { domain: 'citi.com', countryCode: 'US' },
  'Capital One': { domain: 'capitalone.com', countryCode: 'US' },

  // United Kingdom
  Barclays: { domain: 'barclays.co.uk', countryCode: 'GB' },
  'HSBC UK': { domain: 'hsbc.co.uk', countryCode: 'GB' },
  Lloyds: { domain: 'lloydsbank.com', countryCode: 'GB' },
  NatWest: { domain: 'natwest.com', countryCode: 'GB' },
  Monzo: { domain: 'monzo.com', countryCode: 'GB' },
  'Starling Bank': { domain: 'starlingbank.com', countryCode: 'GB' },

  // Canada
  RBC: { domain: 'rbc.com', countryCode: 'CA' },
  'TD Canada Trust': { domain: 'td.com', countryCode: 'CA' },
  Scotiabank: { domain: 'scotiabank.com', countryCode: 'CA' },
  BMO: { domain: 'bmo.com', countryCode: 'CA' },
  CIBC: { domain: 'cibc.com', countryCode: 'CA' },

  // Australia
  'Commonwealth Bank': { domain: 'commbank.com.au', countryCode: 'AU' },
  Westpac: { domain: 'westpac.com.au', countryCode: 'AU' },
  NAB: { domain: 'nab.com.au', countryCode: 'AU' },
  ANZ: { domain: 'anz.com.au', countryCode: 'AU' },

  // India
  'State Bank of India': { domain: 'sbi.co.in', countryCode: 'IN' },
  'HDFC Bank': { domain: 'hdfcbank.com', countryCode: 'IN' },
  'ICICI Bank': { domain: 'icicibank.com', countryCode: 'IN' },
  'Axis Bank': { domain: 'axisbank.com', countryCode: 'IN' },

  // Singapore
  DBS: { domain: 'dbs.com.sg', countryCode: 'SG' },
  OCBC: { domain: 'ocbc.com', countryCode: 'SG' },
  UOB: { domain: 'uob.com.sg', countryCode: 'SG' },
};

const FAVICON_ENDPOINT = 'https://www.google.com/s2/favicons';

/**
 * Return a dynamic favicon URL for a known catalog institution.
 * Unknown/manual names return null rather than guessing a domain.
 *
 * @param {string} institutionName
 * @param {{ size?: number, countryCode?: string }} options
 * @returns {string|null}
 */
export function getInstitutionFaviconUrl(institutionName, { size = 128, countryCode } = {}) {
  if (!institutionName || typeof institutionName !== 'string') return null;

  const entry = INSTITUTION_FAVICONS[institutionName.trim()];
  if (!entry) return null;
  if (countryCode && entry.countryCode && entry.countryCode !== countryCode) return null;

  const safeSize = [16, 32, 48, 64, 128].includes(Number(size)) ? Number(size) : 128;
  const params = new URLSearchParams({ domain: entry.domain, sz: String(safeSize) });
  return `${FAVICON_ENDPOINT}?${params.toString()}`;
}

/** Return the catalog entry for a known institution, or null. */
export function getInstitutionFaviconEntry(institutionName) {
  if (!institutionName || typeof institutionName !== 'string') return null;
  return INSTITUTION_FAVICONS[institutionName.trim()] || null;
}
