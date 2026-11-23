const { decisionPayload, isDecisionAction } = require('../../api/lib/friendChatDecision');
const id='d48c0401-90ee-43c4-9b0e-bac4fbaca001';
const cid='d48c0401-90ee-43c4-9b0e-bac4fbaca002';
test('recipient decision actions reject arbitrary IDs, forged actors, account mapping and payment instructions', () => {
  expect(isDecisionAction('confirm_share_import')).toBe(true);
  expect(isDecisionAction('transfer_money')).toBe(false);
  expect(decisionPayload('decisions', { connectionId: cid, userId: 'someone', accountNumber: 'secret' }))
    .toEqual({ connectionId: cid });
  expect(decisionPayload('accept_share', { connectionId: cid, messageId: id, recipientId: 'forged', amount: 100, cardNumber: 'secret' }))
    .toEqual({ connectionId: cid, messageId: id });
  expect(decisionPayload('confirm_share_import', { connectionId: cid, messageId: id, transactionId: 'spoofed', executePayment: true }))
    .toEqual({ connectionId: cid, messageId: id });
  expect(decisionPayload('accept_share', { connectionId: cid, messageId: 'wrong' })).toEqual({ error: 'shared_transaction_unavailable' });
  expect(decisionPayload('decline_share', { connectionId: 'wrong', messageId: id })).toEqual({ error: 'friend_connection_required' });
  expect(decisionPayload('transfer_money', { connectionId: cid, messageId: id })).toEqual({ error: 'invalid_action' });
});
