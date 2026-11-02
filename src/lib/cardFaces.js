/*
 * Default card faces (used when no sticker is chosen), modelled on the owner's card mockups.
 * Colours are matched to the institution's name (colours only; the logo itself comes from its favicon).
 *   c1 → c2: base gradient (top-left → bottom-right) · glow: light line / highlight colour · ink: text colour
 *   motif: 'sweep' (lit curve) · 'cross' (crossing light beams) · 'rings' (concentric arcs) · 'waves' (soft bands)
 *          · 'stripes' (three diagonal bands) · 'facets' (thin crossing lines) · 'pastel' (soft gradient, dots, wave)
 *   chip: default chip finish · label: type label when the institution implies one (e.g. Pay Later)
 */
const F = (c1, c2, glow, extra = {}) => ({ c1, c2, glow, ink: 'light', motif: 'sweep', chip: 'gold', ...extra });

const BY_NAME = [
  [/union ?bank/i, F('#2b2b30', '#0d0d10', '#ff8a1f')],
  [/\bbdo\b|banco de oro/i, F('#1f55c2', '#0a2363', '#7ab0ff', { spark: '#f5c66b' })],
  [/\bmaya\b|paymaya/i, F('#123f2c', '#03140d', '#4cf294')],
  [/\bbpi\b|philippine islands/i, F('#c42a33', '#6b0a10', '#ff9a9a')],
  [/metrobank|metropolitan bank/i, F('#1c4fb6', '#061b4f', '#63a6ff', { motif: 'cross' })],
  [/gcash/i, F('#2f72f5', '#0a36a3', '#a8ccff', { motif: 'rings' })],
  [/mari ?bank/i, F('#ff9145', '#e4560f', '#ffe2c6', { motif: 'waves' })],
  [/sea ?bank/i, F('#ff8a3d', '#e2520c', '#ffe0c8', { motif: 'waves' })],
  [/china ?bank|china banking/i, F('#c2161f', '#760910', '#ffb0b0', { motif: 'facets' })],
  [/\bpnb\b|philippine national/i, F('#1a438f', '#081b4a', '#d8b45a', { motif: 'facets' })],
  [/7-?eleven|seven ?eleven/i, F('#11804a', '#0a4a2a', '#ffffff', { motif: 'stripes', chip: 'silver', label: 'Merchant', stripes: ['#f08a1e', '#e2232a', '#12a150'] })],
  [/atome/i, F('#f8d2e6', '#fde2c2', '#ffffff', { motif: 'pastel', ink: 'dark', chip: 'silver', label: 'Pay Later', c3: '#dcd8fa' })],
  [/paypal/i, F('#1f56b8', '#0a2258', '#6fb6ff', { chip: 'silver', label: 'Wallet' })],
  [/land ?bank/i, F('#16773c', '#073d1d', '#a6ef7f')],
  [/security bank/i, F('#1a58a0', '#08284f', '#86ccff')],
  [/\brcbc\b/i, F('#1a55a8', '#082552', '#86c0ff', { motif: 'cross' })],
  [/gotyme/i, F('#173f78', '#0a1d3d', '#56e6c9')],
  [/tonik/i, F('#5b2bd6', '#2a0e7a', '#d3b8ff', { motif: 'rings' })],
  [/grab ?pay|\bgrab\b/i, F('#10a85a', '#05592e', '#b6ffd5', { motif: 'waves' })],
  [/shopee/i, F('#ff6a3d', '#d63c13', '#ffd9c7', { motif: 'waves' })],
];

const FALLBACK = [
  F('#2a2b31', '#0f1013', '#9fb3ff'),
  F('#1d4fb3', '#0a2156', '#7aaeff'),
  F('#14523f', '#062a20', '#5fe0ae'),
  F('#7a1830', '#3d0715', '#ff9fb3'),
  F('#3d2a86', '#1a0f45', '#c2adff', { motif: 'rings' }),
];

const BY_BRAND = { red: F('#c0313b', '#6d0e16', '#ffaaaa'), teal: F('#108b80', '#06433e', '#8ff0e2'), indigo: FALLBACK[4] };

const hash = (s) => { let h = 2166136261; for (const ch of String(s || '')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

export function cardFaceFor(a = {}) {
  const name = `${a.institution_name || ''} ${a.name || ''}`;
  const hit = BY_NAME.find(([re]) => re.test(name));
  if (hit) return hit[1];
  if (a.brand && BY_BRAND[a.brand]) return BY_BRAND[a.brand];
  return FALLBACK[hash(a.id || name) % FALLBACK.length];
}

/** Short type label shown at the top right of a card. */
export function cardTypeLabel(a = {}, face) {
  if (a.cardKind === 'credit') return 'Credit';
  if (a.cardKind === 'debit') return 'Debit';
  if (face?.label) return face.label;
  return ({ bank: 'Bank', card: 'Card', e_wallet: 'E-Wallet', cash: 'Cash', investment: 'Investment', coupon: 'Coupon', gift_card: 'Gift card', other: 'Other' })[a.account_type] || 'Card';
}

/*
 * Premium finishes a person can pick in Card Style (stored as the card's style id "finish:<name>").
 * Metallic finishes get a brushed sheen; every finish gets large 3D geometric shapes, placed per card.
 */
export const FINISHES = {
  gold: F('#f6e3a6', '#b7862a', '#fff6d8', { c3: '#e4bf62', ink: 'dark', chip: 'gold', sheen: true, geo: true, name: 'Gold' }),
  platinum: F('#f4f6f9', '#a7aeb9', '#ffffff', { c3: '#d9dee5', ink: 'dark', chip: 'platinum', sheen: true, geo: true, name: 'Platinum' }),
  silver: F('#e3e6ea', '#7f8792', '#ffffff', { c3: '#bfc5cc', ink: 'dark', chip: 'silver', sheen: true, geo: true, name: 'Silver' }),
  gradient: F('#6d5bff', '#ffae5c', '#ffffff', { c3: '#ff5fa2', chip: 'gold', geo: true, name: 'Gradient' }),
};
export const FINISH_PREFIX = 'finish:';
export const finishOf = (styleId) => (typeof styleId === 'string' && styleId.startsWith(FINISH_PREFIX) ? FINISHES[styleId.slice(FINISH_PREFIX.length)] || null : null);
