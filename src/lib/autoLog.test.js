import { readLogLink, parseAmount, sameKey, matchAccount } from './autoLog';

test('parses automation links and rejects bad amounts', () => {
  expect(readLogLink('#log?src=applepay&k=abc&amount=%E2%82%B11%2C234.50&merchant=Jollibee%20QC&card=BPI%20Visa')).toEqual({ amount: 1234.5, merchant: 'Jollibee QC', card: 'BPI Visa', src: 'applepay', source: 'Apple Pay', key: 'abc' });
  expect(readLogLink('#log?amount=0&merchant=x')).toEqual({ invalid: true });
  expect(readLogLink('#settings')).toBeNull();
  expect(readLogLink('#log?amount=99&merchant=%3Cscript%3E&src=evil').src).toBe('notification');
  expect(readLogLink('#log?amount=99&merchant=%3Cb%3Ehi').merchant).toBe('bhi');
});

test('amount formats and key comparison', () => {
  expect(parseAmount('PHP 99')).toBe(99);
  expect(parseAmount('1.234,50')).toBe(1234.5);
  expect(parseAmount('-500.00')).toBe(500);
  expect(sameKey('abcd', 'abcd')).toBe(true);
  expect(sameKey('abcd', 'abce')).toBe(false);
  expect(sameKey('', '')).toBe(false);
});

test('matches the paying card to an account', () => {
  const accounts = [{ id: '1', name: 'GCash', account_type: 'e_wallet' }, { id: '2', name: 'Metrobank', institution_name: 'Visa', account_type: 'card', mask: '1234' }];
  expect(matchAccount('Metrobank Visa', accounts).id).toBe('2');
  expect(matchAccount('Card ••1234', accounts).id).toBe('2');
  expect(matchAccount('', accounts).id).toBe('2');
  expect(matchAccount('savings account', [...accounts, { id: '3', name: 'BPI Savings', account_type: 'bank' }]).id).toBe('3');
});
