import { readLogLink, parseAmount, sameKey, matchAccount } from './autoLog';

test('parses automation links and rejects bad amounts', () => {
  expect(readLogLink('#log?src=applepay&k=abc&amount=%E2%82%B11%2C234.50&merchant=Jollibee%20QC&card=BPI%20Visa')).toEqual({ amount: 1234.5, merchant: 'Jollibee QC', card: 'BPI Visa', src: 'applepay', source: 'Apple Pay', key: 'abc', ref: '', at: '' });
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

test('the fully automatic Shortcuts prompt logs in the background and notifies without a menu', () => {
  const { shortcutPrompt } = require('./autoLog');
  const text = shortcutPrompt('https://movo.nasrinai.com', 'abc123', 'automatic');
  expect(text).toContain('https://movo.nasrinai.com/api/log');
  expect(text).toContain('Authorization: Bearer abc123');
  expect(text).toContain('Method POST');
  expect(text).toContain('Request Body JSON');
  expect(text).toContain('Show Notification');
  expect(text).toContain('Do not add menus');
  expect(text).not.toContain('Choose from Menu');
  expect(text).toContain('Get Contents of URL');
  expect(text).toContain('never Open URLs');
  expect(text).toMatch(/Amount.*Merchant.*Card/);
});

test('the interactive Shortcuts prompt includes Log / Skip and secure POST logging', () => {
  const { shortcutPrompt } = require('./autoLog');
  const text = shortcutPrompt('https://movo.nasrinai.com', 'abc123', 'interactive');
  expect(text).toContain('https://movo.nasrinai.com/api/log');
  expect(text).toContain('Authorization: Bearer abc123');
  expect(text).toContain('Choose from Menu');
  expect(text).toContain('Log and Skip');
  expect(text).toContain('Under Skip');
  expect(text).toContain('Get Contents of URL');
  expect(text).toContain('never Open URLs');
});

test('automation links can carry a reference ID or the raw notification text', () => {
  expect(readLogLink('#log?src=googlepay&amount=250&merchant=Grab&ref=ab-1234').ref).toBe('AB-1234');
  expect(readLogLink('#log?src=notification&amount=500&text=' + encodeURIComponent('You paid PHP 500.00 to Meralco. Ref No. 7781234567')).ref).toBe('7781234567');
});

test('Siri voice prompt posts the dictated sentence with the Siri source and speaks only confirmed results', () => {
  const { shortcutPrompt } = require('./autoLog');
  const text = shortcutPrompt('https://movo.example', 'k'.repeat(32), 'voice');
  expect(text).toMatch(/Dictate Text/);
  expect(text).toMatch(/source set to siri_shortcut/);
  expect(text).toMatch(/https:\/\/movo\.example\/api\/log/);
  expect(text).toMatch(/never claim it was logged/);
  expect(shortcutPrompt('https://movo.example', 'k'.repeat(32), 'automatic')).toMatch(/Auto MOVO Transactions/);
});
