import { cardFaceFor, cardTypeLabel } from './cardFaces';

test('matches a palette to the institution name', () => {
  expect(cardFaceFor({ institution_name: 'UnionBank' }).glow).toBe('#ff8a1f');
  expect(cardFaceFor({ institution_name: 'BDO Unibank' }).c1).toBe('#1f55c2');
  expect(cardFaceFor({ name: '7-Eleven' }).motif).toBe('stripes');
  expect(cardFaceFor({ institution_name: 'Atome' }).ink).toBe('dark');
});

test('unknown institutions get a stable fallback palette', () => {
  const a = cardFaceFor({ id: 'x1', institution_name: 'Some Credit Union' });
  expect(cardFaceFor({ id: 'x1', institution_name: 'Some Credit Union' })).toBe(a);
  expect(a.c1).toMatch(/^#/);
});

test('type label follows card kind, then account type', () => {
  expect(cardTypeLabel({ cardKind: 'credit', account_type: 'card' })).toBe('Credit');
  expect(cardTypeLabel({ account_type: 'bank' })).toBe('Bank');
  expect(cardTypeLabel({ account_type: 'e_wallet' })).toBe('E-Wallet');
  expect(cardTypeLabel({ account_type: 'card' }, cardFaceFor({ name: 'Atome' }))).toBe('Pay Later');
  expect(cardTypeLabel({})).toBe('Card');
});

test('premium finishes resolve from their style id', () => {
  const { finishOf } = require('./cardFaces');
  expect(finishOf('finish:gold')).toMatchObject({ geo: true, sheen: true, chip: 'gold' });
  expect(finishOf('finish:platinum').chip).toBe('silver');
  expect(finishOf('finish:nope')).toBeNull();
  expect(finishOf('wp-w004')).toBeNull();
});
