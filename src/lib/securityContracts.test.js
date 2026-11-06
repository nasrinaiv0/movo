const fs = require('fs');
const path = require('path');

test('automation fails closed when the v2 idempotency RPC is missing', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../api/log.js'), 'utf8');
  expect(source).toContain("rpc('log_automation_transaction_v2'");
  expect(source).toContain('required v2 migration missing');
  expect(source).not.toContain("rpc('log_automation_transaction',");
});
