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

  // New Zealand
  'ANZ New Zealand': { domain: 'anz.co.nz', countryCode: 'NZ' },
  'ASB Bank': { domain: 'asb.co.nz', countryCode: 'NZ' },
  'Bank of New Zealand': { domain: 'bnz.co.nz', countryCode: 'NZ' },
  'Kiwibank': { domain: 'kiwibank.co.nz', countryCode: 'NZ' },

  // Malaysia
  Maybank: { domain: 'maybank.com', countryCode: 'MY' },
  'CIMB Bank': { domain: 'cimb.com.my', countryCode: 'MY' },
  'Public Bank': { domain: 'pbebank.com', countryCode: 'MY' },
  'RHB Bank': { domain: 'rhbgroup.com', countryCode: 'MY' },
  'Hong Leong Bank': { domain: 'hlb.com.my', countryCode: 'MY' },
  'AmBank': { domain: 'ambank.com.my', countryCode: 'MY' },

  // Indonesia
  'Bank Central Asia (BCA)': { domain: 'bca.co.id', countryCode: 'ID' },
  'Bank Mandiri': { domain: 'bankmandiri.co.id', countryCode: 'ID' },
  'Bank Rakyat Indonesia (BRI)': { domain: 'bri.co.id', countryCode: 'ID' },
  'Bank Negara Indonesia (BNI)': { domain: 'bni.co.id', countryCode: 'ID' },
  'Bank Syariah Indonesia (BSI)': { domain: 'bankbsi.co.id', countryCode: 'ID' },

  // Thailand
  'Bangkok Bank': { domain: 'bangkokbank.com', countryCode: 'TH' },
  'Kasikornbank (KBank)': { domain: 'kasikornbank.com', countryCode: 'TH' },
  'Siam Commercial Bank (SCB)': { domain: 'scb.co.th', countryCode: 'TH' },
  'Krungthai Bank': { domain: 'krungthai.com', countryCode: 'TH' },
  'Bank of Ayudhya (Krungsri)': { domain: 'krungsri.com', countryCode: 'TH' },

  // Vietnam
  'Vietcombank': { domain: 'vietcombank.com.vn', countryCode: 'VN' },
  'BIDV': { domain: 'bidv.com.vn', countryCode: 'VN' },
  'VietinBank': { domain: 'vietinbank.vn', countryCode: 'VN' },
  'Techcombank': { domain: 'techcombank.com', countryCode: 'VN' },
  'MB Bank': { domain: 'mbbank.com.vn', countryCode: 'VN' },

  // Japan
  'MUFG Bank': { domain: 'bk.mufg.jp', countryCode: 'JP' },
  'SMBC': { domain: 'smbc.co.jp', countryCode: 'JP' },
  'Mizuho Bank': { domain: 'mizuhobank.co.jp', countryCode: 'JP' },
  'Japan Post Bank': { domain: 'jp-bank.japanpost.jp', countryCode: 'JP' },
  'Resona Bank': { domain: 'resonabank.co.jp', countryCode: 'JP' },

  // South Korea
  'KB Kookmin Bank': { domain: 'kbstar.com', countryCode: 'KR' },
  'Shinhan Bank': { domain: 'shinhan.com', countryCode: 'KR' },
  'Hana Bank': { domain: 'kebhana.com', countryCode: 'KR' },
  'Woori Bank': { domain: 'wooribank.com', countryCode: 'KR' },
  'NH Nonghyup Bank': { domain: 'nonghyup.com', countryCode: 'KR' },

  // France
  'BNP Paribas': { domain: 'mabanque.bnpparibas', countryCode: 'FR' },
  'Crédit Agricole': { domain: 'credit-agricole.fr', countryCode: 'FR' },
  'Société Générale': { domain: 'societegenerale.fr', countryCode: 'FR' },
  'Banque Populaire': { domain: 'banquepopulaire.fr', countryCode: 'FR' },
  'La Banque Postale': { domain: 'labanquepostale.fr', countryCode: 'FR' },

  // Germany
  'Deutsche Bank': { domain: 'deutsche-bank.de', countryCode: 'DE' },
  'Commerzbank': { domain: 'commerzbank.de', countryCode: 'DE' },
  'DZ Bank': { domain: 'dzbank.de', countryCode: 'DE' },
  'ING Germany': { domain: 'ing.de', countryCode: 'DE' },
  'DKB': { domain: 'dkb.de', countryCode: 'DE' },
  'N26': { domain: 'n26.com', countryCode: 'DE' },

  // Spain
  'Banco Santander': { domain: 'bancosantander.es', countryCode: 'ES' },
  'BBVA': { domain: 'bbva.es', countryCode: 'ES' },
  'CaixaBank': { domain: 'caixabank.es', countryCode: 'ES' },
  'Banco Sabadell': { domain: 'bancsabadell.com', countryCode: 'ES' },

  // Italy
  'Intesa Sanpaolo': { domain: 'intesasanpaolo.com', countryCode: 'IT' },
  'UniCredit': { domain: 'unicredit.it', countryCode: 'IT' },
  'Banco BPM': { domain: 'bancobpm.it', countryCode: 'IT' },
  'BPER Banca': { domain: 'bper.it', countryCode: 'IT' },

  // Netherlands
  'ING Netherlands': { domain: 'ing.nl', countryCode: 'NL' },
  'Rabobank': { domain: 'rabobank.nl', countryCode: 'NL' },
  'ABN AMRO': { domain: 'abnamro.nl', countryCode: 'NL' },
  'de Volksbank': { domain: 'volksbank.nl', countryCode: 'NL' },

  // Brazil
  'Banco do Brasil': { domain: 'bb.com.br', countryCode: 'BR' },
  'Itaú Unibanco': { domain: 'itau.com.br', countryCode: 'BR' },
  'Bradesco': { domain: 'banco.bradesco', countryCode: 'BR' },
  'Caixa Econômica Federal': { domain: 'caixa.gov.br', countryCode: 'BR' },
  'Nubank': { domain: 'nubank.com.br', countryCode: 'BR' },

  // Mexico
  'BBVA México': { domain: 'bbva.mx', countryCode: 'MX' },
  'Banorte': { domain: 'banorte.com', countryCode: 'MX' },
  'Santander México': { domain: 'santander.com.mx', countryCode: 'MX' },
  'Citibanamex': { domain: 'citibanamex.com', countryCode: 'MX' },
  'Banco Azteca': { domain: 'bancoazteca.com.mx', countryCode: 'MX' },

  // South Africa
  'Standard Bank': { domain: 'standardbank.co.za', countryCode: 'ZA' },
  'First National Bank (FNB)': { domain: 'fnb.co.za', countryCode: 'ZA' },
  'Absa Bank': { domain: 'absa.co.za', countryCode: 'ZA' },
  'Nedbank': { domain: 'nedbank.co.za', countryCode: 'ZA' },
  'Capitec Bank': { domain: 'capitecbank.co.za', countryCode: 'ZA' },

  // United Arab Emirates
  'Emirates NBD': { domain: 'emiratesnbd.com', countryCode: 'AE' },
  'First Abu Dhabi Bank (FAB)': { domain: 'bankfab.com', countryCode: 'AE' },
  'Abu Dhabi Commercial Bank (ADCB)': { domain: 'adcb.com', countryCode: 'AE' },
  'Dubai Islamic Bank': { domain: 'dib.ae', countryCode: 'AE' },

  // Saudi Arabia
  'Saudi National Bank (SNB)': { domain: 'alahli.com', countryCode: 'SA' },
  'Al Rajhi Bank': { domain: 'alrajhibank.com.sa', countryCode: 'SA' },
  'Riyad Bank': { domain: 'riyadbank.com', countryCode: 'SA' },
  'Saudi Awwal Bank (SAB)': { domain: 'sab.com', countryCode: 'SA' },

  // Pakistan
  'Habib Bank Limited (HBL)': { domain: 'hbl.com', countryCode: 'PK' },
  'United Bank Limited (UBL)': { domain: 'ubldigital.com', countryCode: 'PK' },
  'Meezan Bank': { domain: 'meezanbank.com', countryCode: 'PK' },
  'MCB Bank': { domain: 'mcb.com.pk', countryCode: 'PK' },

  // Bangladesh
  'Dutch-Bangla Bank': { domain: 'dutchbanglabank.com', countryCode: 'BD' },
  'BRAC Bank': { domain: 'bracbank.com', countryCode: 'BD' },
  'Eastern Bank PLC': { domain: 'ebl.com.bd', countryCode: 'BD' },
  'The City Bank': { domain: 'thecitybank.com', countryCode: 'BD' },

  // Nigeria
  'Access Bank': { domain: 'accessbankplc.com', countryCode: 'NG' },
  'Zenith Bank': { domain: 'zenithbank.com', countryCode: 'NG' },
  'Guaranty Trust Bank (GTBank)': { domain: 'gtbank.com', countryCode: 'NG' },
  'First Bank of Nigeria': { domain: 'firstbanknigeria.com', countryCode: 'NG' },
  'United Bank for Africa (UBA)': { domain: 'ubagroup.com', countryCode: 'NG' },

  // Ireland
  'AIB': { domain: 'aib.ie', countryCode: 'IE' },
  'Bank of Ireland': { domain: 'bankofireland.com', countryCode: 'IE' },
  'Permanent TSB': { domain: 'ptsb.ie', countryCode: 'IE' },

  // Switzerland
  'UBS': { domain: 'ubs.com', countryCode: 'CH' },
  'PostFinance': { domain: 'postfinance.ch', countryCode: 'CH' },
  'Raiffeisen Switzerland': { domain: 'raiffeisen.ch', countryCode: 'CH' },

  // Sweden
  'Swedbank': { domain: 'swedbank.com', countryCode: 'SE' },
  'SEB': { domain: 'seb.se', countryCode: 'SE' },
  'Handelsbanken': { domain: 'handelsbanken.se', countryCode: 'SE' },
  'Nordea': { domain: 'nordea.com', countryCode: 'SE' },

  // Norway
  'DNB': { domain: 'dnb.no', countryCode: 'NO' },

  // Denmark
  'Danske Bank': { domain: 'danskebank.dk', countryCode: 'DK' },

  // Poland
  'PKO Bank Polski': { domain: 'pkobp.pl', countryCode: 'PL' },
  'Bank Pekao': { domain: 'pekao.com.pl', countryCode: 'PL' },
  'mBank': { domain: 'mbank.pl', countryCode: 'PL' },

  // Turkey
  'Ziraat Bankası': { domain: 'ziraatbank.com.tr', countryCode: 'TR' },
  'İşbank': { domain: 'isbank.com.tr', countryCode: 'TR' },
  'Garanti BBVA': { domain: 'garantibbva.com.tr', countryCode: 'TR' },
  'Akbank': { domain: 'akbank.com', countryCode: 'TR' },

  // Kenya
  'Equity Bank Kenya': { domain: 'equitybankgroup.com', countryCode: 'KE' },
  'KCB Bank Kenya': { domain: 'ke.kcbgroup.com', countryCode: 'KE' },
  'Co-operative Bank of Kenya': { domain: 'co-opbank.co.ke', countryCode: 'KE' },

  // Ghana
  'GCB Bank': { domain: 'gcbbank.com.gh', countryCode: 'GH' },
  'Ecobank Ghana': { domain: 'ecobank.com', countryCode: 'GH' },

  // Egypt
  'National Bank of Egypt': { domain: 'nbe.com.eg', countryCode: 'EG' },
  'Banque Misr': { domain: 'banquemisr.com', countryCode: 'EG' },
  'Commercial International Bank (CIB)': { domain: 'cibeg.com', countryCode: 'EG' },
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
  // Fail closed: remote brand favicons stay disabled until this exact
  // institution/domain has an evidence-backed legal review. Pending entries
  // should render a generic local icon and a readable institution name.
  if (!['APPROVED_POLICY_REVIEW', 'APPROVED_BY_COUNSEL'].includes(entry.reviewStatus)) return null;
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
