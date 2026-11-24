jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
const { createClient } = require('@supabase/supabase-js');
const route = require('../../api/chat');
const id = 'd721116c-f90b-429d-871a-e7f0dd111111';
const cid = 'd721116c-f90b-429d-871a-e7f0dd222222';
const nonce = 'd721116c-f90b-429d-871a-e7f0dd333333';
const makeRes = () => { const res = { setHeader: jest.fn(), status: jest.fn(), json: jest.fn() }; res.status.mockReturnValue(res); return res; };
async function call(method, body, headers = { authorization: 'Bearer valid-token' }) {
  const res = makeRes();
  await route({ method, body, headers }, res);
  return res;
}
let rpc, getUser;
beforeEach(() => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'fixture';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture';
  rpc = jest.fn().mockResolvedValue({ data: { ok: true } });
  getUser = jest.fn().mockResolvedValue({ data: { user: { id, email_confirmed_at: '2026-11-23' } } });
  createClient.mockImplementation(() => ({ rpc, auth: { getUser } }));
});
afterAll(() => ['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY'].forEach(k => delete process.env[k]));

test('never trusts a caller-supplied identity or allows anonymous accounts', async () => {
  expect((await call('GET', null, {})).status).toHaveBeenCalledWith(401);
  expect(rpc).not.toHaveBeenCalled();
  getUser.mockResolvedValueOnce({ data: { user: { id, is_anonymous: true } } });
  expect((await call('GET')).status).toHaveBeenCalledWith(403);
  await call('POST', { action: 'open', connectionId: cid, p_actor: 'attacker', ownerId: 'other' });
  expect(rpc).toHaveBeenCalledWith('movo_friend_chat',
    { p_actor: id, p_action: 'open', p_data: { connectionId: cid } });
});

test('sends only safe transaction snapshot and never raw account metadata', async () => {
  const card = { type: 'expense', amount: 7.4, currency: 'PHP', date: '2026-11-23', category: 'Food',
    accountNumber: 'secret', bank: 'not-shared', transferTarget: 'sensitive' };
  const result = await call('POST', { action: 'send', kind: 'transaction', connectionId: cid, clientId: nonce, card,
    senderId: 'fake', executeTransfer: true });
  expect(result.status).toHaveBeenCalledWith(200);
  expect(rpc).toHaveBeenCalledWith('movo_friend_chat',
    { p_actor: id, p_action: 'send', p_data: { connectionId: cid, clientId: nonce, kind: 'transaction',
      body: '', card: { type: 'expense', amount: 7.4, currency: 'PHP', date: '2026-11-23', category: 'Food' } } });
});

test('returns a correct rejection for blocked/non-friend and rate-limited sends', async () => {
  rpc.mockResolvedValueOnce({ data: { error: 'friend_connection_required' } })
    .mockResolvedValueOnce({ data: { error: 'message_rate_limit' } });
  expect((await call('POST', { action: 'open', connectionId: cid })).status).toHaveBeenCalledWith(404);
  expect((await call('POST', { action: 'send', connectionId: cid, clientId: nonce, kind: 'text', body: 'Hi' })).status).toHaveBeenCalledWith(429);
  expect((await call('POST', { action: 'send', connectionId: cid, clientId: nonce, kind: 'text', body: '<fake>\u202e' })).status).toHaveBeenCalledWith(400);
  expect((await call('POST', { action: 'delete_everyones_ledger' })).status).toHaveBeenCalledWith(400);
});

test('fails closed during a pending database migration', async () => {
  rpc.mockResolvedValueOnce({ error: { code: 'PGRST202' } });
  const res = await call('GET');
  expect(res.status).toHaveBeenCalledWith(503);
  expect(res.json).toHaveBeenCalledWith({ error: 'chat_update_pending' });
  expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
});
