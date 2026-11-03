const { parseMessage } = require('../../api/_lib/messageText');

const now = new Date('2026-10-05T00:00:00Z');
const read = (text, app = 'GCash') => parseMessage(text, { app, now });

describe('bank and e-wallet payment messages', () => {
  test('a GCash QR payment: amount, payee, Philippine date and time, reference, account', () => {
    expect(read('You have paid P5.13 via GCash to PYMY Connect IQ on 10-04-26 03:01:06 AM. Ref. No. 342984713. QRPH Invoice No. 162111.342984713.')).toMatchObject({
      ok: true, type: 'expense', transfer: false, amount: 5.13, currency: 'PHP', merchant: 'PYMY Connect IQ', reference: '342984713', accountHint: 'GCash', occurredAt: '2026-10-03T19:01:06.000Z',
    });
  });

  test('money received is income from the sender; the balance is not taken as the amount', () => {
    expect(read('You have received PHP 1,500.00 of GCash from JUAN D. on 10-04-26 09:15 PM. Your new balance is PHP 2,345.10. Ref. No. 9012345678.')).toMatchObject({
      ok: true, type: 'income', transfer: false, amount: 1500, merchant: 'JUAN D', reference: '9012345678',
    });
  });

  test('sending money is a transfer out; phone numbers are not kept in the name', () => {
    const r = read('You have sent PHP 500.00 to MARIA S. 09171234567 on 10-03-26 1:05 PM. Ref No. 7788990011. Never share your MPIN or OTP.');
    expect(r).toMatchObject({ ok: true, type: 'expense', transfer: true, amount: 500, merchant: 'MARIA S', reference: '7788990011' });
  });

  test('cash in is a transfer into the wallet', () => {
    expect(read('You have successfully cashed in PHP 2,000.00 from BPI to your GCash. Ref. No. 5566778899')).toMatchObject({ ok: true, type: 'income', transfer: true, amount: 2000, merchant: 'BPI' });
  });

  test('a bank card purchase reads the store and the last four digits', () => {
    expect(read('BDO: Your account ending 1234 was debited PHP 1,250.00 for a purchase at SM SUPERMARKET on Oct 3, 2026 7:40 PM.', 'BDO')).toMatchObject({
      ok: true, type: 'expense', amount: 1250, merchant: 'SM SUPERMARKET', accountHint: 'BDO 1234', occurredAt: '2026-10-03T11:40:00.000Z',
    });
  });

  test('one-time codes, log-in alerts and promos are not transactions', () => {
    expect(read('Your OTP is 482913. Do not share this with anyone.')).toEqual({ ok: false, reason: 'not_a_transaction' });
    expect(read('482913 is your GCash verification code.')).toEqual({ ok: false, reason: 'not_a_transaction' });
    expect(read('New log-in to your Maya account from an iPhone.')).toEqual({ ok: false, reason: 'not_a_transaction' });
    expect(read('Get 50% off with promo code SAVE50!')).toEqual({ ok: false, reason: 'not_a_transaction' });
    expect(read('Your GCash balance is PHP 120.00.')).toEqual({ ok: false, reason: 'not_a_transaction' });
  });

  test('a payment message without an amount asks for review instead of guessing', () => {
    expect(read('You have paid via GCash to Store X.')).toEqual({ ok: false, reason: 'amount_missing' });
    expect(read('')).toEqual({ ok: false, reason: 'empty' });
  });
});

describe('app push notifications (title and body joined by the shortcut)', () => {
  const push = (title, body, app) => read(`${title}\n${body}`, app);

  test('short e-wallet pushes with “You’ve” and curly apostrophes', () => {
    expect(push('Payment successful', 'You’ve paid ₱150.00 to Jollibee. Ref No. 1234567890', 'GCash')).toMatchObject({ ok: true, type: 'expense', amount: 150, merchant: 'Jollibee', reference: '1234567890' });
    expect(push('Money received', "You've received ₱1,000.00 from JUAN D.", 'GCash')).toMatchObject({ ok: true, type: 'income', amount: 1000, merchant: 'JUAN D' });
    expect(push('Maya', 'You paid ₱250.00 to MERALCO.', 'Maya')).toMatchObject({ ok: true, type: 'expense', amount: 250, merchant: 'MERALCO', accountHint: 'Maya' });
    expect(push('Maya', 'You received ₱500.00 from Ana R.', 'Maya')).toMatchObject({ ok: true, type: 'income', amount: 500, merchant: 'Ana R' });
  });

  test('a card “was used” alert from a bank app is an expense at the store', () => {
    expect(push('BDO Card Alert', 'Your BDO card ending 1234 was used for PHP 2,500.00 at SM STORE on Oct 3, 2026 7:40 PM.', 'BDO')).toMatchObject({
      ok: true, type: 'expense', amount: 2500, merchant: 'SM STORE', accountHint: 'BDO 1234',
    });
    expect(push('Transaction alert', 'A transaction of PHP 899.00 was made on your card ending 4321 at SHOPEE.', 'UnionBank')).toMatchObject({ ok: true, type: 'expense', amount: 899, merchant: 'SHOPEE', accountHint: 'UnionBank 4321' });
  });

  test('a bill payment confirmation that mentions the amount due is still logged', () => {
    expect(push('Bills payment', 'You have paid PHP 3,200.00 to MERALCO. Amount due: PHP 0.00. Ref No. 55667788', 'GCash')).toMatchObject({ ok: true, type: 'expense', amount: 3200, merchant: 'MERALCO' });
  });

  test('amounts written without a space or with “PHP1,000” still read', () => {
    expect(push('Transfer successful', "You've successfully transferred PHP1,000.00 to MARIA S.", 'BPI')).toMatchObject({ ok: true, type: 'expense', transfer: true, amount: 1000 });
  });

  test('push notifications that are not money movements are ignored', () => {
    expect(push('Security alert', 'New log-in to your GCash account on an iPhone.', 'GCash')).toEqual({ ok: false, reason: 'not_a_transaction' });
    expect(push('GCash', 'Your one-time PIN is 123456. Do not share it.', 'GCash')).toEqual({ ok: false, reason: 'not_a_transaction' });
    expect(push('Limited offer!', 'Get ₱50 cashback when you pay bills today. Chance to win ₱10,000!', 'GCash')).toEqual({ ok: false, reason: 'not_a_transaction' });
    expect(push('GCash', 'Get ₱50 cashback when you pay bills today.', 'GCash')).toEqual({ ok: false, reason: 'not_a_transaction' });
    expect(push('Limited-time offer', 'Cash in now and get up to ₱100 off on load.', 'Maya')).toEqual({ ok: false, reason: 'not_a_transaction' });
    expect(push('Statement ready', 'Your October statement is ready. Total amount due PHP 3,200.00.', 'BPI')).toEqual({ ok: false, reason: 'not_a_transaction' });
  });
});

