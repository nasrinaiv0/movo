'use strict';
const fs = require('node:fs');
const path = require('node:path');

function renderService({ project, region, image, serviceAccount, service = 'movo-staging', publicKeyVersion = '1', serviceKeyVersion = '1' }) {
  if ([project, region, image, serviceAccount, service, publicKeyVersion, serviceKeyVersion].some(value => typeof value !== 'string' || /\s/.test(value))) throw Error('Cloud Run inputs must be explicit strings without whitespace.');
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project || '') || !/^[a-z]+-[a-z]+[1-9][0-9]?$/.test(region || '')) throw Error('An explicit valid Google Cloud project ID and region are required.');
  if (!/^[a-z](?:[a-z0-9-]{0,47}[a-z0-9])?$/.test(service)) throw Error('Invalid Cloud Run service name.');
  const prefix = region + '-docker.pkg.dev/' + project + '/';
  if (!String(image).startsWith(prefix) || !/^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._/-]*@sha256:[a-f0-9]{64}$/.test(String(image).slice(prefix.length))) throw Error('Use an immutable Artifact Registry image digest in the selected project/region.');
  if (!new RegExp('^[a-z][a-z0-9-]{4,28}[a-z0-9]@' + project + '\\.iam\\.gserviceaccount\\.com$').test(serviceAccount)) throw Error('An explicit runtime service account in the selected project is required.');
  for (const version of [publicKeyVersion, serviceKeyVersion]) if (!/^[1-9][0-9]*$/.test(version)) throw Error('Pin Secret Manager references to numeric versions.');
  const publicEnv = fs.readFileSync(path.join(__dirname, '../.env.production'), 'utf8');
  const supabaseUrl = publicEnv.match(/^REACT_APP_SUPABASE_URL=(https:\/\/[^\s]+)$/m)?.[1];
  if (!supabaseUrl) throw Error('The existing MOVO public database origin is missing.');
  const secret = (name, secretName, key) => ({ name, valueFrom: { secretKeyRef: { name: secretName, key } } });
  return {
    apiVersion: 'serving.knative.dev/v1', kind: 'Service',
    metadata: { name: service, labels: { 'cloud.googleapis.com/location': region }, annotations: { 'run.googleapis.com/ingress': 'all' } },
    spec: { template: {
      metadata: { annotations: { 'autoscaling.knative.dev/minScale': '0', 'autoscaling.knative.dev/maxScale': '2', 'run.googleapis.com/execution-environment': 'gen2' } },
      spec: { serviceAccountName: serviceAccount, containerConcurrency: 8, timeoutSeconds: 90,
        containers: [{ image, ports: [{ containerPort: 8080 }], resources: { limits: { cpu: '1', memory: '1Gi' } },
          env: [{ name: 'NODE_ENV', value: 'production' }, { name: 'MOVO_BIND_HOST', value: '0.0.0.0' },
            { name: 'MOVO_ALLOWED_ORIGINS', value: 'https://movo.nasrinai.com' },
            { name: 'SUPABASE_URL', value: supabaseUrl }, { name: 'MOVO_STORE_BILLING_ENABLED', value: 'false' },
            secret('SUPABASE_ANON_KEY', 'movo-supabase-public-key', publicKeyVersion),
            secret('SUPABASE_SERVICE_ROLE_KEY', 'movo-supabase-service-role', serviceKeyVersion)],
          startupProbe: { httpGet: { path: '/healthz', port: 8080 }, periodSeconds: 10, timeoutSeconds: 2, failureThreshold: 12 },
          livenessProbe: { httpGet: { path: '/healthz', port: 8080 }, periodSeconds: 30, timeoutSeconds: 2, failureThreshold: 3 } }],
      },
    } },
  };
}

if (require.main === module) {
  try {
    const rendered = renderService({ project: process.env.MOVO_GCP_PROJECT, region: process.env.MOVO_GCP_REGION,
      image: process.env.MOVO_GCP_IMAGE, serviceAccount: process.env.MOVO_GCP_SERVICE_ACCOUNT,
      service: process.env.MOVO_GCP_SERVICE || 'movo-staging', publicKeyVersion: process.env.MOVO_GCP_PUBLIC_KEY_VERSION || '1',
      serviceKeyVersion: process.env.MOVO_GCP_SERVICE_KEY_VERSION || '1' });
    process.stdout.write(JSON.stringify(rendered, null, 2) + '\n');
  } catch (failure) { console.error(failure.message); process.exitCode = 1; }
}
module.exports = { renderService };
