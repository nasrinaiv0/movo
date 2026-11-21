import handler from '../../api/account/retention';
import * as billing from '../../api/lib/iapSecurity';

jest.mock('../../api/lib/iapSecurity', () => ({
  json: jest.fn((res, status, body) => { res.statusCode = status; res.body = body; return res; }),
  adminClient: jest.fn(() => ({})), rpc: jest.fn(async () => ({})),
}));

const originalEnv = process.env;
beforeEach(() => {
  process.env = { ...originalEnv, CRON_SECRET: 'a'.repeat(40) };
  jest.clearAllMocks();
  billing.json.mockImplementation((res, status, body) => { res.statusCode = status; res.body = body; return res; });
  billing.adminClient.mockReturnValue({});
  billing.rpc.mockResolvedValue({});
});
afterEach(() => { process.env = originalEnv; });
const invoke = async token => {
  const res = { setHeader: jest.fn() };
  await handler({ method: 'GET', headers: { authorization: 'Bearer ' + token } }, res);
  return res;
};

test.each([undefined, 'false', 'TRUE', '1'])('retention rollout %s remains inert even with a valid cron secret', async value => {
  if (value === undefined) delete process.env.MOVO_DATA_RETENTION_ENABLED;
  else process.env.MOVO_DATA_RETENTION_ENABLED = value;
  expect((await invoke('a'.repeat(40))).statusCode).toBe(503);
  expect(billing.adminClient).not.toHaveBeenCalled();
  expect(billing.rpc).not.toHaveBeenCalled();
});

test('enabled retention still requires cron authentication before calling the existing RPC', async () => {
  process.env.MOVO_DATA_RETENTION_ENABLED = 'true';
  expect((await invoke('wrong')).statusCode).toBe(401);
  expect(billing.adminClient).not.toHaveBeenCalled();
  expect((await invoke('a'.repeat(40))).statusCode).toBe(200);
  expect(billing.rpc).toHaveBeenCalledWith({}, 'movo_run_data_retention');
});
