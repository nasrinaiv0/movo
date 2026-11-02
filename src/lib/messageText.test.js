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
