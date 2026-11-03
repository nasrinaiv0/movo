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

test('a card named after its bank logs to that bank account', () => {
  const accounts = [
    { id: 'bpi-card', name: 'BPI', institution_name: 'BPI', account_type: 'card' },
    { id: 'bpi-bank', name: 'BPI', institution_name: 'BPI', account_type: 'bank' },
    { id: 'gt-card', name: 'GoTyme Bank', institution_name: 'GoTyme Bank', account_type: 'card', mask: '2829' },
    { id: 'gt-bank', name: 'GoTyme Bank', institution_name: 'GoTyme Bank', account_type: 'bank' },
  ];
  expect(matchAccount('BPI Visa', accounts).id).toBe('bpi-bank');
  expect(matchAccount('GoTyme Bank Debit', accounts).id).toBe('gt-bank');
  expect(matchAccount('Card ••2829', accounts).id).toBe('gt-card'); // the exact last 4 digits still name the card
  expect(matchAccount('Unknown', accounts).id).toBe('bpi-bank');
});

test('the fully automatic Shortcuts prompt logs in the background and notifies without a menu', () => {
  const { shortcutPrompt } = require('./autoLog');
  const text = shortcutPrompt('https://movo.nasrinai.com', 'abc123', 'automatic');
  expect(text).toContain('https://movo.nasrinai.com/api/log');
  expect(text).toContain('Authorization: Bearer abc123');
  expect(text).toContain('Method POST');
  expect(text).toContain('Request Body JSON');
  expect(text).toContain('Format Date');
  expect(text).toContain('Get Value for Key message');
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
  expect(text).toMatch(/source = siri_shortcut/);
  expect(text).toMatch(/Speak Text/);
  expect(text).toMatch(/https:\/\/movo\.example\/api\/log/);
  expect(text).toMatch(/never claim it was logged/);
  expect(shortcutPrompt('https://movo.example', 'k'.repeat(32), 'automatic')).toMatch(/Auto MOVO Transactions/);
});

test('bank notifications recipe: Notification trigger, title and body sent as text with Log / Skip', () => {
  const { shortcutRecipe: recipe, shortcutPrompt: prompt } = require('./autoLog');
  const r = recipe('https://movo.nasrinai.com', 'KEY123', 'notifications');
  expect(r.trigger).toMatch(/Automation → \+ → Notification → choose the app/);
  expect(r.steps.join(' ')).toMatch(/Shortcut Input › Title/);
  expect(r.steps.join(' ')).toMatch(/text = Text, app = .*source = notification/);
  expect(r.steps.join(' ')).toMatch(/Choose from Menu/);
  expect(r.steps.join(' ')).toMatch(/Under Skip: Stop This Shortcut/);
  expect(r.steps.join(' ')).toMatch(/Authorization: Bearer KEY123/);
  expect(prompt('https://movo.nasrinai.com', 'KEY123', 'notifications')).toMatch(/rejects OTPs, promotions and non-financial alerts/);
});


test('notification interactive and automatic recipes have distinct confirmation behavior', () => {
  const { shortcutRecipe: recipe, shortcutPrompt: prompt } = require('./autoLog');
  const interactive = recipe('https://movo.example', 'KEY123', 'notifications');
  expect(interactive.steps.join(' ')).toMatch(/Choose from Menu/);
  expect(interactive.steps.join(' ')).toMatch(/Under Skip: Stop This Shortcut/);
  expect(interactive.steps.join(' ')).toMatch(/source = notification/);
  const automatic = prompt('https://movo.example', 'KEY123', 'notifications-automatic');
  expect(automatic).toContain('Do not add menus');
  expect(automatic).not.toContain('Choose from Menu');
  expect(automatic).toContain('success value');
  expect(automatic).toContain('retain eligible failures for review');
});

test('Siri interactive recipe confirms before posting and Skip sends nothing', () => {
  const { shortcutRecipe: recipe, shortcutPrompt: prompt } = require('./autoLog');
  const r = recipe('https://movo.example', 'KEY123', 'voice-interactive');
  expect(r.steps.join(' ')).toMatch(/Dictate Text/);
  expect(r.steps.join(' ')).toMatch(/Choose from Menu/);
  expect(r.steps.join(' ')).toMatch(/Under Skip: Stop This Shortcut/);
  expect(r.steps.join(' ')).toMatch(/source = siri_shortcut/);
  expect(prompt('https://movo.example', 'KEY123', 'voice-interactive')).toMatch(/never announce a save/i);
});
