/**
 * Structured, deterministic, on-device receipt extraction. Never infer a purchase
 * from cash tendered, change or tax lines. All values are suggestions for review.
 * Keep this independent of OCR so payments and receipts can share the engine.
 */
const AMOUNT_AT_END = /(?:₱|PHP\s*)?(-?(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2})\s*$/i;
const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
const money = line => {
  const m = String(line).match(AMOUNT_AT_END);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) && Math.abs(n) < 1e12 ? round(n) : null;
};
const LABELS = {
  total: /^(?:grand\s*total|(?:eat[\s-]*in|take[\s-]*out|dine[\s-]*in)\s*total|net\s*total|total(?:\s*(?:amount|due|paid|sales))?|amount(?:\s*(?:due|paid|sent|received|transferred))?|you\s*(?:paid|sent|received))\b/i,
  subtotal: /^(?:sub[\s-]*total|items?\s*total)\b/i,
  taxableSales: /^(?:vatable|taxable)\s*sales\b/i,
  vatExemptSales: /^(?:vat\s*exempt|tax\s*exempt)\s*sales\b/i,
  tax: /^(?:vat(?:\s*(?:amount|total|included))?|sales\s*tax|tax(?:es)?|gst)\b/i,
  discount: /^(?:discount|less\s*discount|voucher|promo(?:tion)?\s*discount)\b/i,
  serviceCharge: /^(?:service\s*charge|service\s*fee)\b/i,
  cashTendered: /^(?:cash(?:\s*(?:tendered|received|paid|given))?|amount\s*tendered|tendered)\b/i,
  change: /^(?:change(?:\s*(?:due|given))?|cash\s*change)\b/i,
};
const TABLE_HEADER = /\b(?:qty|quantity)\b.*\b(?:item|description|product)\b/i;
const TABLE_END = /^(?:grand\s*total|(?:eat[\s-]*in|take[\s-]*out)\s*total|sub[\s-]*total|total|cash(?:\s*tendered)?|change|vat|tax|discount|amount\s*due)\b/i;
const IS_ADMIN = /^(?:invoice|serial|order|date|time|tin|vat|cash|change|subtotal|total|price|qty|quantity|payment|receipt|reference|thank|visit|survey|crew|item|number|store|terminal)\b/i;

function extractItems(lines) {
  const header = lines.findIndex(line => TABLE_HEADER.test(line));
  if (header < 0) return [];
  const result = [];
  for (let i = header + 1; i < lines.length && result.length < 60; i += 1) {
    const line = lines[i];
    if (TABLE_END.test(line)) break;
    if (IS_ADMIN.test(line)) continue;
    const detailed = line.match(/^(\d{1,3})\s+(.{2,90}?)\s+((?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2})\s+((?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2})$/);
    if (detailed) {
      const qty = Number(detailed[1]), unitPrice = Number(detailed[3].replace(/,/g, ''));
      const total = Number(detailed[4].replace(/,/g, ''));
      if (qty > 0 && qty <= 999 && Number.isFinite(total) && total >= 0) result.push({ quantity: qty, name: detailed[2].trim(), unitPrice: round(unitPrice), total: round(total), options: [] });
      continue;
    }
    const single = line.match(/^(\d{1,3})\s+(.{2,90}?)\s+((?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2})$/);
    if (single) {
      const qty = Number(single[1]), total = Number(single[3].replace(/,/g, ''));
      if (qty > 0 && qty <= 999 && Number.isFinite(total) && total >= 0) result.push({ quantity: qty, name: single[2].trim(), unitPrice: null, total: round(total), options: [] });
      continue;
    }
    // Combo components with no price (e.g. fries and Coke) belong to the
    // purchased meal. They must not create extra expenses.
    const option = line.match(/^(\d{1,2})\s+(.{2,60})$/);
    if (option && result.length) result[result.length - 1].options.push(option[1] + ' ' + option[2].trim());
  }
  return result;
}

export function parseReceiptDetails(text = '') {
  const lines = String(text).split(/\r?\n/).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 700);
  const values = Object.fromEntries(Object.keys(LABELS).map(key => [key, null]));
  const totalCandidates = [];
  for (const line of lines) {
    const value = money(line);
    if (value === null) continue;
    for (const [key, pattern] of Object.entries(LABELS)) {
      if (!pattern.test(line)) continue;
      // 'Amount tendered' and tax summaries cannot be treated as a purchase total.
      if (key === 'total' && /^(?:amount\s*(?:tendered|given)|total\s*(?:tax|vat|discount))/i.test(line)) continue;
      if (key === 'total') totalCandidates.push(value);
      else if (values[key] === null) values[key] = value;
      break;
    }
  }
  // Last printed total is normally the grand total; never substitute tender/change.
  values.total = totalCandidates.length ? totalCandidates[totalCandidates.length - 1] : null;
  const items = extractItems(lines);
  const warnings = [];
  if (values.total === null || values.total <= 0) warnings.push('Total not found. Enter the actual amount before logging.');
  if (totalCandidates.length > 1 && totalCandidates.some(n => Math.abs(n - values.total) > 0.02)) warnings.push('Multiple different totals found. Check the amount.');
  if (values.cashTendered !== null && values.change !== null && values.total !== null
      && Math.abs(round(values.cashTendered - values.change) - values.total) > 0.02)
    warnings.push('Cash, change and total do not match. Check the receipt.');
  if (items.length && values.total !== null && !values.discount && !values.serviceCharge) {
    const itemSum = round(items.reduce((sum, item) => sum + item.total, 0));
    if (Math.abs(itemSum - values.total) > 0.02) warnings.push('Item prices differ from the printed total. Check missing items or discounts.');
  }
  const taxIncluded = values.tax !== null && values.taxableSales !== null && values.total !== null
    ? Math.abs(round(values.taxableSales + values.tax + (values.vatExemptSales || 0)) - values.total) <= 0.02
    : null;
  const paymentMethod = values.cashTendered !== null ? 'cash'
    : /\b(?:visa|mastercard|amex|credit\s*card|debit\s*card)\b/i.test(text) ? 'card'
      : /\b(?:gcash|maya|shopeepay|grabpay)\b/i.test(text) ? 'wallet' : '';
  // A legal company or order banner may appear before the actual store name.
  const branch = lines.find(s => /\b(?:restaurant|supermarket|pharmacy|grocery|cafe|coffee\s*shop)\b/i.test(s)
    && !/\b(?:corporation|company|taxpayer|customer|address|branch)\b/i.test(s) && !/\d{4,}/.test(s));
  return {
    ...values, items, warnings, taxIncluded, paymentMethod,
    merchantHint: branch ? branch.replace(/\s{2,}/g, ' ').slice(0, 80) : '',
  };
}
