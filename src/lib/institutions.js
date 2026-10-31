import { getInstitutionFaviconUrl } from './institutionFavicons';

export const INSTITUTION_COUNTRIES = ['PH', 'US', 'GB', 'CA', 'AU', 'SG', 'IN'];

export const INSTITUTIONS = [
  { id: 'ph-bdo', country: 'PH', name: 'BDO Unibank', aliases: ['BDO'], kind: 'bank' },
  { id: 'ph-bpi', country: 'PH', name: 'BPI', aliases: ['Bank of the Philippine Islands'], kind: 'bank' },
  { id: 'ph-metrobank', country: 'PH', name: 'Metrobank', aliases: ['Metropolitan Bank and Trust Company'], kind: 'bank' },
  { id: 'ph-landbank', country: 'PH', name: 'Land Bank of the Philippines', aliases: ['LandBank', 'LANDBANK'], kind: 'bank' },
  { id: 'ph-pnb', country: 'PH', name: 'Philippine National Bank', aliases: ['PNB'], kind: 'bank' },
  { id: 'ph-unionbank', country: 'PH', name: 'UnionBank', aliases: ['Union Bank of the Philippines'], kind: 'bank' },
  { id: 'ph-security-bank', country: 'PH', name: 'Security Bank', aliases: [], kind: 'bank' },
  { id: 'ph-chinabank', country: 'PH', name: 'China Banking Corporation (Chinabank)', aliases: ['Chinabank', 'China Bank'], kind: 'bank' },
  { id: 'ph-rcbc', country: 'PH', name: 'RCBC', aliases: ['Rizal Commercial Banking Corporation'], kind: 'bank' },
  { id: 'ph-dbp', country: 'PH', name: 'Development Bank of the Philippines', aliases: ['DBP'], kind: 'bank' },
  { id: 'ph-gcash', country: 'PH', name: 'GCash', aliases: ['G-Xchange'], kind: 'ewallet' },
  { id: 'ph-maya', country: 'PH', name: 'Maya', aliases: ['PayMaya'], kind: 'ewallet' },
  { id: 'us-chase', country: 'US', name: 'Chase', aliases: ['JPMorgan Chase'], kind: 'bank' },
  { id: 'us-bofa', country: 'US', name: 'Bank of America', aliases: ['BofA'], kind: 'bank' },
  { id: 'us-wells', country: 'US', name: 'Wells Fargo', aliases: [], kind: 'bank' },
  { id: 'us-citi', country: 'US', name: 'Citibank', aliases: ['Citi'], kind: 'bank' },
  { id: 'us-capital-one', country: 'US', name: 'Capital One', aliases: [], kind: 'bank' },
  { id: 'gb-barclays', country: 'GB', name: 'Barclays', aliases: [], kind: 'bank' },
  { id: 'gb-hsbc', country: 'GB', name: 'HSBC UK', aliases: ['HSBC'], kind: 'bank' },
  { id: 'gb-lloyds', country: 'GB', name: 'Lloyds Bank', aliases: ['Lloyds'], kind: 'bank' },
  { id: 'gb-natwest', country: 'GB', name: 'NatWest', aliases: [], kind: 'bank' },
  { id: 'gb-monzo', country: 'GB', name: 'Monzo', aliases: [], kind: 'bank' },
  { id: 'gb-starling', country: 'GB', name: 'Starling Bank', aliases: ['Starling'], kind: 'bank' },
  { id: 'ca-rbc', country: 'CA', name: 'RBC Royal Bank', aliases: ['RBC'], kind: 'bank' },
  { id: 'ca-td', country: 'CA', name: 'TD Canada Trust', aliases: ['TD'], kind: 'bank' },
  { id: 'ca-scotia', country: 'CA', name: 'Scotiabank', aliases: [], kind: 'bank' },
  { id: 'ca-bmo', country: 'CA', name: 'BMO Bank of Montreal', aliases: ['BMO'], kind: 'bank' },
  { id: 'ca-cibc', country: 'CA', name: 'CIBC', aliases: [], kind: 'bank' },
  { id: 'au-cba', country: 'AU', name: 'Commonwealth Bank', aliases: ['CommBank', 'CBA'], kind: 'bank' },
  { id: 'au-westpac', country: 'AU', name: 'Westpac', aliases: [], kind: 'bank' },
  { id: 'au-nab', country: 'AU', name: 'NAB', aliases: ['National Australia Bank'], kind: 'bank' },
  { id: 'au-anz', country: 'AU', name: 'ANZ', aliases: [], kind: 'bank' },
  { id: 'sg-dbs', country: 'SG', name: 'DBS / POSB', aliases: ['DBS', 'POSB'], kind: 'bank' },
  { id: 'sg-ocbc', country: 'SG', name: 'OCBC', aliases: [], kind: 'bank' },
  { id: 'sg-uob', country: 'SG', name: 'UOB', aliases: ['United Overseas Bank'], kind: 'bank' },
  { id: 'in-sbi', country: 'IN', name: 'State Bank of India', aliases: ['SBI'], kind: 'bank' },
  { id: 'in-hdfc', country: 'IN', name: 'HDFC Bank', aliases: ['HDFC'], kind: 'bank' },
  { id: 'in-icici', country: 'IN', name: 'ICICI Bank', aliases: ['ICICI'], kind: 'bank' },
  { id: 'in-axis', country: 'IN', name: 'Axis Bank', aliases: ['Axis'], kind: 'bank' },
];

export function searchInstitutions(countryCode, query = '', accountType = 'bank') {
  const q = String(query || '').trim().toLocaleLowerCase();
  const allowedKinds = accountType === 'e_wallet' ? ['ewallet'] : ['bank'];
  return INSTITUTIONS
    .filter(item => item.country === countryCode && allowedKinds.includes(item.kind))
    .filter(item => !q || [item.name, ...item.aliases].some(value => value.toLocaleLowerCase().includes(q)))
    .sort((a, b) => a.name.localeCompare(b.name));
}


export const institutionLogoUrl = (name, options = {}) => getInstitutionFaviconUrl(name, options) || '';
