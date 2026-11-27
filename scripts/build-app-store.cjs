'use strict';
const { execFileSync, spawnSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const env = { ...process.env, CI: 'true', REACT_APP_ASSET_POLICY: 'original-only', GENERATE_SOURCEMAP: 'false', BUILD_PATH: path.join(root, 'build'), PUBLIC_URL: '' };
execFileSync(process.execPath, [path.join(__dirname, 'validate-public-api-origin.cjs')], { cwd: root, env, stdio: 'inherit' });
execFileSync(process.execPath, [path.join(__dirname, 'generate-third-party-notices.cjs')], { cwd: root, env, stdio: 'inherit' });
// CRA can exit zero after its forked type-checker dies. Such a bundle is not a verified release.
const compilation = spawnSync(process.execPath, [require.resolve('react-scripts/scripts/build')], {
  cwd: root, env, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024,
});
process.stdout.write(compilation.stdout || '');
process.stderr.write(compilation.stderr || '');
if (compilation.error || compilation.status !== 0 || /Issues checking service aborted|RpcIpcMessagePortClosedError|heap out of memory|FATAL ERROR:/i.test((compilation.stdout || '') + (compilation.stderr || ''))) {
  throw new Error('App Store build failed or its type-checker aborted; release assets were not prepared.');
}
require('./prepare-app-store-assets.cjs').prepare(root);
execFileSync(process.execPath, [path.join(__dirname, 'build-offline-worker.cjs')], { cwd: root, env, stdio: 'inherit' });
execFileSync(process.execPath, [path.join(__dirname, 'check-app-store-rights.cjs')], { cwd: root, env, stdio: 'inherit' });
