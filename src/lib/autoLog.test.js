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

test('automation links can carry a reference ID or the raw notification text', () => {
  expect(readLogLink('#log?src=googlepay&amount=250&merchant=Grab&ref=ab-1234').ref).toBe('AB-1234');
  expect(readLogLink('#log?src=notification&amount=500&text=' + encodeURIComponent('You paid PHP 500.00 to Meralco. Ref No. 7781234567')).ref).toBe('7781234567');
});

describe('iPhone Shortcuts recipes and prompts', () => {
  const { shortcutRecipe: recipe, shortcutPrompt: prompt, SHORTCUT_MODES } = require('./autoLog');
  const ORIGIN = 'https://movo.nasrinai.com';

  test.each(SHORTCUT_MODES)('%s: secure POST to MOVO, key only in the header, MOVO\'s own reply', (mode) => {
    const text = prompt(ORIGIN, 'KEY123', mode);
    expect(text).toContain(`${ORIGIN}/api/log`);
    expect(text).toContain('Method: POST');
    expect(text).toContain('Authorization = Bearer KEY123');
    expect(text).toContain('Request Body: JSON');
    expect(text.match(/KEY123/g)).toHaveLength(1);
    expect(text).toContain('Never use Open URLs');
    expect(text).toMatch(/Never write your own “logged”/);
    // Every numbered step in the prompt is the same step MOVO shows on screen.
    recipe(ORIGIN, 'KEY123', mode).steps.forEach((step, i) => expect(text).toContain(`${i + 1}. ${step}`));
  });

  test('bank notifications (automatic): Notification trigger per app, whole text sent, quiet unless MOVO returns a notice', () => {
    const r = recipe(ORIGIN, 'K', 'notifications-automatic');
    expect(r.trigger).toMatch(/iOS 27/);
    expect(r.trigger).toMatch(/Automation → \+ → Notification → App:/);
    expect(r.trigger).toMatch(/Run Immediately → turn off Notify When Run/);
    expect(r.trigger).toMatch(/one automation per app/);
    expect(r.steps).toHaveLength(4);
    expect(r.steps[0]).toMatch(/Shortcut Input › Title.*Shortcut Input › Subtitle.*Shortcut Input › Body/);
    expect(r.steps[1]).toMatch(/text = Text, app = .*source = notification/);
    expect(r.steps[2]).toBe('Get Dictionary Value — Get Value for Key notice in Contents of URL.');
    expect(r.steps[3]).toMatch(/^If — Dictionary Value has any value: Show Notification/);
    const text = prompt(ORIGIN, 'K', 'notifications-automatic');
    expect(text).not.toContain('Choose from Menu');
    expect(text).toMatch(/No menus/);
    expect(text).toMatch(/Do not filter, summarise, split or rewrite it/);
    // The old prompt told the model never to send OTPs, which made it add its own filters; MOVO filters on the server.
    expect(text).not.toMatch(/Never send OTPs/);
  });

  test('bank notifications (Log / Skip): the menu shows the notification, Skip sends nothing', () => {
    const steps = recipe(ORIGIN, 'K', 'notifications').steps.join('\n');
    expect(steps).toMatch(/Choose from Menu — Prompt: Text · Options: Log and Skip/);
    expect(steps).toMatch(/Under Log: Get Contents of URL/);
    expect(steps).toMatch(/Under Skip: no actions \(nothing is sent\)/);
    expect(steps.indexOf('Under Skip')).toBeGreaterThan(steps.indexOf('Under Log: Get Contents of URL'));
  });

  test('Apple Pay: the Transaction trigger\'s own values and an ISO date; automatic is quiet for duplicates', () => {
    const auto = recipe(ORIGIN, 'K', 'automatic');
    expect(auto.trigger).toMatch(/Automation → \+ → Transaction/);
    expect(auto.steps.join(' ')).toMatch(/amount = Shortcut Input › Amount, merchant = Shortcut Input › Merchant, card = Shortcut Input › Card or Pass, source = applepay, occurredAt = Formatted Date/);
    expect(auto.steps[0]).toMatch(/Format Date — .*ISO 8601/);
    expect(auto.steps.join(' ')).toMatch(/Key notice/);
    expect(prompt(ORIGIN, 'K', 'automatic')).not.toContain('Choose from Menu');
    const ask = recipe(ORIGIN, 'K', 'interactive').steps.join(' ');
    expect(ask).toMatch(/Choose from Menu/);
    expect(ask).toMatch(/Key message/);
  });

  test('Siri: dictated sentence with the Siri source, spoken reply, no extra fields', () => {
    const steps = recipe(ORIGIN, 'K', 'voice').steps.join(' ');
    expect(steps).toMatch(/Dictate Text/);
    expect(steps).toMatch(/text = Dictated Text, source = siri_shortcut\./);
    expect(steps).toMatch(/Speak Text — Dictionary Value/);
    expect(prompt(ORIGIN, 'K', 'voice')).toMatch(/Do not add amount or merchant fields/);
    expect(recipe(ORIGIN, 'K', 'voice-interactive').steps.join(' ')).toMatch(/Under Skip: no actions/);
  });

  test('an unknown mode falls back to the bank notifications recipe', () => {
    expect(prompt(ORIGIN, 'K', 'messages')).toMatch(/MOVO Bank Notifications/);
  });
});



test('Siri App Intent links create a reviewable, untrusted expense', () => {
  const entry = readLogLink('#/log?src=siri_shortcut&amount=250.50&merchant=Groceries');
  expect(entry).toMatchObject({ amount: 250.5, merchant: 'Groceries', src: 'siri_shortcut', source: 'Siri', key: '' });
  expect(sameKey(entry.key, '')).toBe(false);
  expect(readLogLink('#/log?src=siri_shortcut&amount=0&merchant=Groceries')).toEqual({ invalid: true });
});
