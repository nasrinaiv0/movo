jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
const { createClient } = require('@supabase/supabase-js');
const { createHash } = require('node:crypto');
const route = require('../../api/friends');
const id = '2ddc22e5-f113-4a9b-977f-d7b8cdf09f41';
const makeRes = () => {
  const response = { setHeader: jest.fn(), status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response;
};
const call = async (method, body, headers = { authorization: 'Bearer verified-session' }) => {
  const response = makeRes();
  await route({ method, body, headers }, response);
  return response;
};
let rpc;
let getUser;
beforeEach(() => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'fixture';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture';
  rpc = jest.fn().mockResolvedValue({ data: { expiresAt: '2026-11-17T00:00:00Z' } });
  getUser = jest.fn().mockResolvedValue({ data: { user: { id, email_confirmed_at: '2026-11-16T00:00:00Z' } } });
  createClient.mockImplementation(() => ({ rpc, auth: { getUser } }));
});
afterAll(() => ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'].forEach(k => delete process.env[k]));

test('requires verified authentication and ignores a caller-supplied actor', async () => {
  expect((await call('GET', null, {})).status).toHaveBeenCalledWith(401);
  getUser.mockResolvedValueOnce({ data: { user: { id, is_anonymous: true } } });
  expect((await call('GET')).status).toHaveBeenCalledWith(403);
  expect(rpc).not.toHaveBeenCalled();
  await call('GET', { p_actor: 'forged' });
  expect(rpc).toHaveBeenCalledWith('movo_friends', { p_actor: id, p_action: 'list' });
});

test('hashes the randomly issued code and never echoes guessed or caller-supplied tokens from preview', async () => {
  const response = await call('POST', { action: 'create', name: '  Nasrin  ', token: 'forged' });
  const [{ token }] = response.json.mock.calls[0];
  expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(response.status).toHaveBeenCalledWith(200);
  expect(rpc).toHaveBeenLastCalledWith('movo_friends', {
    p_actor: id, p_action: 'create', p_name: 'Nasrin', p_token_hash: createHash('sha256').update(token).digest('hex'),
  });
  rpc.mockResolvedValueOnce({ data: { error: 'invite_unavailable' } });
  const preview = await call('POST', { action: 'preview', token });
  expect(preview.status).toHaveBeenCalledWith(404);
  expect(preview.json).toHaveBeenCalledWith({ error: 'invite_unavailable' });
  expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
});

test('accepts serialized native requests and separates an unavailable migration from authentication', async () => {
  rpc.mockResolvedValueOnce({ error: { code: 'PGRST202' } });
  const result = await call('POST', JSON.stringify({ action: 'directory', p_actor: 'forged' }));
  expect(result.status).toHaveBeenCalledWith(503);
  expect(result.json).toHaveBeenCalledWith({ error: 'friends_update_pending' });
  expect(rpc).toHaveBeenCalledWith('movo_friend_social', { p_actor: id, p_action: 'directory', p_data: {} });
});

test('shares only the selected summary fields and ignores external account and contact data', async () => {
  const result = await call('POST', { action: 'share_summary', connectionId: id, account: 'forged', summary: {
    month: '2026-11', note: ' Track with a weekly review. ', accountNumber: 'hidden',
    totals: { currency: 'PHP', income: 725.998, expenses: 300, email: 'hidden' },
    categories: [{ key: 'Food', percent: 30, merchant: 'hidden' }],
  } });
  expect(result.status).toHaveBeenCalledWith(200);
  expect(rpc).toHaveBeenCalledWith('movo_friend_social', { p_actor: id, p_action: 'share_summary', p_data: {
    connectionId: id, summary: { month: '2026-11', note: 'Track with a weekly review.',
      totals: { currency: 'PHP', income: 726, expenses: 300 }, categories: [{ key: 'Food', percent: 30 }] },
  } });
  expect((await call('POST', { action: 'share_summary', connectionId: id, summary: { month: '2026-11' } })).status).toHaveBeenCalledWith(400);
});

test('a savings rate alone can be shared, as a whole percent from -100 to 100 only', async () => {
  const result = await call('POST', { action: 'share_summary', connectionId: id, summary: { month: '2026-11', savingsRate: -12 } });
  expect(result.status).toHaveBeenCalledWith(200);
  expect(rpc).toHaveBeenLastCalledWith('movo_friend_social', { p_actor: id, p_action: 'share_summary', p_data: {
    connectionId: id, summary: { month: '2026-11', savingsRate: -12 } } });
  for (const savingsRate of [12.5, 101, -101, '20', null]) {
    expect((await call('POST', { action: 'share_summary', connectionId: id, summary: { month: '2026-11', savingsRate } })).status).toHaveBeenCalledWith(400);
  }
});

test('reads and changes only the signed-in owner photo and rejects an invalid image', async () => {
  expect((await call('POST', { action: 'set_avatar', photo: 'data:image/jpeg;base64,/YXNk' })).status).toHaveBeenCalledWith(400);
  await call('POST', { action: 'avatar', ownerId: 'someone else' });
  expect(rpc).toHaveBeenCalledWith('movo_friend_social', { p_actor: id, p_action: 'avatar', p_data: {} });
  const photo = 'data:image/jpeg;base64,/9j/4QAAAAAA/9k=';
  await call('POST', { action: 'set_avatar', photo, ownerId: 'someone else' });
  expect(rpc).toHaveBeenLastCalledWith('movo_friend_social', { p_actor: id, p_action: 'set_avatar', p_data: { photo } });
});
