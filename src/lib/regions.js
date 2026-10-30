/*
 * Countries and regions: picking one sets the app language, home currency and regional number/date style together.
 * Rows: [ISO country code, language code, currency].
 */
export const COUNTRIES = [
  ['PH', 'en', 'PHP'], ['US', 'en', 'USD'], ['GB', 'en', 'GBP'], ['CA', 'en', 'CAD'], ['AU', 'en', 'AUD'], ['NZ', 'en', 'NZD'], ['SG', 'en', 'SGD'], ['MY', 'en', 'MYR'],
  ['ID', 'en', 'IDR'], ['TH', 'en', 'THB'], ['VN', 'en', 'VND'], ['PK', 'en', 'PKR'], ['BD', 'en', 'BDT'], ['ZA', 'en', 'ZAR'], ['NG', 'en', 'NGN'], ['IE', 'en', 'EUR'],
  ['AE', 'ar', 'AED'], ['SA', 'ar', 'SAR'], ['QA', 'ar', 'QAR'], ['KW', 'ar', 'KWD'], ['BH', 'ar', 'BHD'], ['OM', 'ar', 'OMR'], ['EG', 'ar', 'EGP'], ['MA', 'ar', 'MAD'],
  ['CN', 'zh', 'CNY'], ['TW', 'zh', 'TWD'], ['HK', 'zh', 'HKD'], ['JP', 'ja', 'JPY'], ['KR', 'ko', 'KRW'], ['IN', 'hi', 'INR'],
  ['ES', 'es', 'EUR'], ['MX', 'es', 'MXN'], ['AR', 'es', 'ARS'], ['IT', 'it', 'EUR'], ['DE', 'de', 'EUR'], ['AT', 'de', 'EUR'], ['CH', 'de', 'CHF'],
  ['FR', 'fr', 'EUR'], ['BE', 'fr', 'EUR'], ['BR', 'pt', 'BRL'], ['PT', 'pt', 'EUR'], ['TR', 'en', 'TRY'], ['IL', 'en', 'ILS'], ['SE', 'en', 'SEK'],
  ['NO', 'en', 'NOK'], ['DK', 'en', 'DKK'], ['PL', 'en', 'PLN'],
];

export const countryName = (code, locale = 'en') => { try { return new Intl.DisplayNames([locale], { type: 'region' }).of(code) || code; } catch { return code; } };

/** Regional formatting locale for a language and country, e.g. es + MX → es-MX. */
export function regionalLocale(lang, country) {
  if (!country) return lang.locale;
  const base = lang.code === 'fil' ? 'fil' : lang.code;
  return `${base}-${country}${lang.code === 'ar' ? '-u-nu-latn' : ''}`;
}
