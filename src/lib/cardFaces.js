/*
 * Default card faces (used when no sticker is chosen): a solid base, one softly lit sweep and a thin light line.
 * Colours are matched to the institution's name so a BDO card reads blue and a BPI card reads red; only colours
 * are used, never the institution's artwork. Anything unknown gets a calm palette picked from its id.
 *   base: card colour · sweep: the lighter curved panel · glow: the light line · ink: text colour on top
 *   motif: 'sweep' (default), 'stripes' (three diagonal bands) or 'facets' (thin crossing lines)
 */
const P = (base, sweep, glow, extra = {}) => ({ base, sweep, glow, ink: 'light', motif: 'sweep', ...extra });

const BY_NAME = [
  [/union ?bank/i, P('#141416', '#26262a', '#ff8a1f')],
  [/\bbdo\b|banco de oro/i, P('#0b2c78', '#16409c', '#5b9bff')],
  [/\bmaya\b|paymaya/i, P('#06231a', '#0d3a2a', '#3ddc84')],
  [/\bbpi\b|philippine islands/i, P('#8e1118', '#a8161f', '#ff7070')],
  [/metrobank|metropolitan bank/i, P('#0a2a6c', '#123a8f', '#5c97ff', { motif: 'facets' })],
  [/mari ?bank/i, P('#f06a1c', '#f7863a', '#ffe1c2')],
  [/gcash/i, P('#0a3cae', '#1452cc', '#7fb0ff')],
  [/china ?bank|china banking/i, P('#9f111b', '#b51722', '#ff8a8a')],
  [/\bpnb\b|philippine national/i, P('#0c2860', '#14377d', '#d8b45a', { motif: 'facets' })],
  [/7-?eleven|seven ?eleven/i, P('#0b6b3a', '#0e7c44', '#ffffff', { motif: 'stripes', stripes: ['#f08a1e', '#e2232a', '#12a150'] })],
  [/atome/i, P('#f7dbe9', '#fbe9d6', '#ffffff', { ink: 'dark' })],
  [/land ?bank/i, P('#0d5a2c', '#146d37', '#9be37a')],
  [/security bank/i, P('#0c3d73', '#145090', '#7cc4ff')],
  [/\brcbc\b/i, P('#0b3a7a', '#134a98', '#7fb8ff')],
  [/gotyme/i, P('#0f2e5c', '#173f78', '#4fe0c4')],
  [/seabank|sea bank/i, P('#f16422', '#f6813f', '#ffe0c8')],
];

const FALLBACK = [
  P('#16171b', '#26272c', '#8ea7ff'),
  P('#0d2f73', '#16409a', '#6aa2ff'),
  P('#0b3b2e', '#11503e', '#4fd3a0'),
  P('#5a1020', '#74172b', '#ff8fa3'),
  P('#2b1a5c', '#3a2479', '#b49bff'),
];

const BY_BRAND = { blue: FALLBACK[1], red: P('#a1212b', '#b82d37', '#ff9a9a'), teal: P('#0b6b63', '#0f8077', '#7fe6d8'), indigo: FALLBACK[4] };

const hash = (s) => { let h = 2166136261; for (const ch of String(s || '')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

export function cardFaceFor(a = {}) {
  const name = `${a.institution_name || ''} ${a.name || ''}`;
  const hit = BY_NAME.find(([re]) => re.test(name));
  if (hit) return hit[1];
  if (a.brand && BY_BRAND[a.brand] && a.brand !== 'blue') return BY_BRAND[a.brand];
  return FALLBACK[hash(a.id || name) % FALLBACK.length];
}

/** Short type label shown at the top right of a card. */
export function cardTypeLabel(a = {}) {
  if (a.cardKind === 'credit') return 'Credit';
  if (a.cardKind === 'debit') return 'Debit';
  return ({ bank: 'Bank', card: 'Card', e_wallet: 'E-wallet', cash: 'Cash', investment: 'Investment', coupon: 'Coupon', gift_card: 'Gift card', other: 'Other' })[a.account_type] || 'Card';
}
