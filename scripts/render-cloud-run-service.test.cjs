'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { renderService } = require('./render-cloud-run-service.cjs');
const input = { project: 'movo-example-project', region: 'asia-southeast1',
  image: 'asia-southeast1-docker.pkg.dev/movo-example-project/movo/movo@sha256:' + 'a'.repeat(64),
  serviceAccount: 'movo-runtime@movo-example-project.iam.gserviceaccount.com' };

test('Cloud Run preparation preserves the existing database, private secret references and gated application auth', () => {
  const service = renderService(input), spec = service.spec.template.spec;
  assert.equal(service.metadata.name, 'movo-staging');
  assert.equal(spec.serviceAccountName, input.serviceAccount);
  assert.equal(spec.containers[0].ports[0].containerPort, 8080);
  const env = Object.fromEntries(spec.containers[0].env.map(value => [value.name, value]));
  assert.equal(env.SUPABASE_URL.value, 'https://cjsjmorqvuvvwbfyztiz.supabase.co');
  assert.equal(env.MOVO_STORE_BILLING_ENABLED.value, 'false');
  assert.deepEqual(env.SUPABASE_SERVICE_ROLE_KEY.valueFrom, { secretKeyRef: { name: 'movo-supabase-service-role', key: '1' } });
  assert.equal(env.SUPABASE_SERVICE_ROLE_KEY.value, undefined);
  assert.equal(JSON.stringify(service).includes('allUsers'), false);
  assert.equal(JSON.stringify(service).includes('invoker-iam-disabled'), false);
});

test('Cloud Run preparation rejects unspecified projects, mutable/foreign images and unpinned secrets', () => {
  for (const patch of [{ project: '' }, { service: 'bad/name' }, { region: '' },
    { image: input.image.replace('@sha256:' + 'a'.repeat(64), ':latest') },
    { image: input.image.replace('movo-example-project', 'other-project') },
    { serviceAccount: 'default@other-project.iam.gserviceaccount.com' }, { serviceAccount: 'movo-runtime@spoof@movo-example-project.iam.gserviceaccount.com' },
    { project: input.project + '\n' }, { serviceKeyVersion: 'latest' }]) {
    assert.throws(() => renderService({ ...input, ...patch }));
  }
});
