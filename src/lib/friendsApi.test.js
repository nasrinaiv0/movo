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

test('reads and changes only the signed-in owner photo and rejects an invalid image', async () => {
  expect((await call('POST', { action: 'set_avatar', photo: 'data:image/jpeg;base64,/YXNk' })).status).toHaveBeenCalledWith(400);
  await call('POST', { action: 'avatar', ownerId: 'someone else' });
  expect(rpc).toHaveBeenCalledWith('movo_friend_social', { p_actor: id, p_action: 'avatar', p_data: {} });
  const photo = 'data:image/jpeg;base64,/9j/4QAAAAAA/9k=';
  await call('POST', { action: 'set_avatar', photo, ownerId: 'someone else' });
  expect(rpc).toHaveBeenLastCalledWith('movo_friend_social', { p_actor: id, p_action: 'set_avatar', p_data: { photo } });
});

test('saves only selected dashboard sections and projects nested aggregates', async () => {
  const result = await call('POST', { action: 'share_summary', connectionId: id, summary: {
    month: '2026-11', asOf: '2026-11-17', currency: 'PHP', owner: 'forged',
    sections: { income: 0, flow: [12.126, -50, 100, 0, 0], books: ['private'],
      planning: { bills: 10, debt: 20, owed: 5, accountId: 'secret' }, budgets: { budgets: 2, onTrack: 1, plans: 1, progress: 60 } },
  } });
  expect(result.status).toHaveBeenCalledWith(200);
  expect(rpc).toHaveBeenLastCalledWith('movo_friend_social', { p_actor: id, p_action: 'share_summary', p_data: {
    connectionId: id, summary: { month: '2026-11', asOf: '2026-11-17', currency: 'PHP', sections: {
      income: 0, flow: [12.13, -50, 100, 0, 0], planning: { bills: 10, debt: 20, owed: 5 },
      budgets: { budgets: 2, onTrack: 1, plans: 1, progress: 60 },
    } },
  } });
  expect((await call('POST', { action: 'share_summary', connectionId: id, summary: {
    month: '2026-11', asOf: '2026-11-32', currency: 'PHP', sections: { savings: 70 },
  } })).status).toHaveBeenCalledWith(400);
});

test('editing a share receives only the authenticated owner’s saved snapshot', async () => {
  const select = jest.fn().mockReturnThis();
  const eq = jest.fn().mockReturnThis();
  const own = { month: '2026-11', currency: 'PHP', sections: { income: 0 } };
  const from = jest.fn().mockReturnValue({ select, eq, maybeSingle: async () => ({ data: { snapshot: own } }) });
  createClient.mockImplementation(() => ({ rpc, auth: { getUser }, from }));
  rpc.mockResolvedValueOnce({ data: { sharedWithYou: null, yourShare: true } });
  const result = await call('POST', { action: 'summary', connectionId: id, ownerId: 'forged' });
  expect(from).toHaveBeenCalledWith('movo_friend_summaries');
  expect(eq.mock.calls).toEqual([['connection_id', id], ['owner_id', id]]);
  expect(result.json).toHaveBeenCalledWith({ sharedWithYou: null, yourShare: true, yourSummary: own });
});

test('message reports remain disabled without an explicit reviewed rollout', async () => {
  delete process.env.MOVO_FRIEND_MESSAGE_REPORTS_ENABLED;
  const result = await call('POST', { action: 'report_message', connectionId: id, messageId: id });
  expect(result.status).toHaveBeenCalledWith(503);
  expect(result.json).toHaveBeenCalledWith({ error: 'message_reports_not_configured' });
  expect(rpc).not.toHaveBeenCalled();
});

test('message reporting uses the verified actor and identifiers only, never caller evidence or financial data', async () => {
  process.env.MOVO_FRIEND_MESSAGE_REPORTS_ENABLED = 'true';
  try {
    const result = await call('POST', { action: 'report_message', connectionId: id, messageId: id,
      p_actor: 'forged', body: 'Do not copy', accountId: 'private', card: { amount: 1 } });
    expect(result.status).toHaveBeenCalledWith(200);
    expect(rpc).toHaveBeenCalledWith('movo_friend_workspace', { p_actor: id, p_action: 'report_message', p_data: { connectionId: id, messageId: id } });
    expect((await call('POST', { action: 'report_message', connectionId: id, messageId: 'bad' })).status).toHaveBeenCalledWith(404);
  } finally { delete process.env.MOVO_FRIEND_MESSAGE_REPORTS_ENABLED; }
});

test('directory reads persisted outgoing state for the authenticated owner across sessions', async () => {
  const outgoing = [{ id, handle: 'friend_handle', createdAt: '2026-11-27T00:00:00Z' }];
  rpc.mockImplementation(async (fn) => ({ data: fn === 'movo_friend_social' ? { handle: 'my_handle', requests: [], blocked: [] } : { outgoing } }));
  for (const token of ['device-one', 'device-two']) {
    const result = await call('POST', { action: 'directory', ownerId: 'someone-else' }, { authorization: 'Bearer '+token });
    expect(result.json).toHaveBeenCalledWith(expect.objectContaining({ outgoing, workspaceAvailable: true, messageReportsAvailable: false }));
    expect(rpc).toHaveBeenCalledWith('movo_friend_workspace', { p_actor: id, p_action: 'outgoing_requests', p_data: {} });
  }
});

test('a missing workspace migration preserves basic discovery and marks request status unavailable', async () => {
  rpc.mockImplementation(async (fn) => fn === 'movo_friend_social' ? { data: { handle: 'mine', requests: [], blocked: [] } } : { error: { code: 'PGRST202', message: 'private diagnostic' } });
  const result = await call('POST', { action: 'directory' });
  expect(result.status).toHaveBeenCalledWith(200);
  expect(result.json).toHaveBeenCalledWith({ handle: 'mine', requests: [], blocked: [], outgoing: null, workspaceAvailable: false, messageReportsAvailable: false });
  expect(JSON.stringify(result.json.mock.calls)).not.toContain('private diagnostic');
});

test('erasure denial from the workspace projection does not return stale directory data', async () => {
  rpc.mockImplementation(async (fn) => fn === 'movo_friend_social' ? { data: { handle: 'private', requests: [] } } : { data: { error: 'friend_access_unavailable' } });
  const result = await call('POST', { action: 'directory' });
  expect(result.status).toHaveBeenCalledWith(403);
  expect(result.json).toHaveBeenCalledWith({ error: 'friend_access_unavailable' });
});

test('cancellation projects only a validated request ID and never trusts supplied ownership', async () => {
  const result = await call('POST', { action: 'cancel_request', requestId: id, p_actor: 'forged', recipient: 'forged' });
  expect(result.status).toHaveBeenCalledWith(200);
  expect(rpc).toHaveBeenCalledWith('movo_friend_workspace', { p_actor: id, p_action: 'cancel_request', p_data: { requestId: id } });
  expect((await call('POST', { action: 'cancel_request', requestId: 'invalid' })).status).toHaveBeenCalledWith(404);
});
