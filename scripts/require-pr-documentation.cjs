'use strict';
const { execFileSync } = require('child_process');

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const changedFiles = sha => git('diff-tree', '--no-commit-id', '--name-only', '-r', sha).split('\n').filter(Boolean);
const needsDocumentation = path =>
  /^(src\/|api\/|supabase\/|android\/|ios\/|public\/|scripts\/|\.github\/workflows\/)/.test(path)
  || /^(package\.json|package-lock\.json|vercel\.json|capacitor\.config\.json)$/.test(path);
const documentationFindings = (baseSha, headSha = 'HEAD') => {
  const commits = git('rev-list', '--no-merges', '--reverse', baseSha + '..' + headSha).split('\n').filter(Boolean);
  return commits.flatMap(sha => {
    const files = changedFiles(sha);
    if (!files.some(needsDocumentation)) return [];
    const missing = [];
    if (!files.includes('docs/PR_PROGRESS.md')) missing.push('docs/PR_PROGRESS.md');
    if (!files.some(path => /^docs\/engineering\/updates\/[^/]+\.md$/.test(path))) {
      missing.push('docs/engineering/updates/<dated-change>.md');
    }
    return missing.length ? [{ sha: sha.slice(0, 12), missing }] : [];
  });
};
if (require.main === module) {
  const base = process.env.MOVO_PR_BASE_SHA;
  if (!/^[0-9a-f]{40}$/.test(base || '')) {
    console.error('MOVO_PR_BASE_SHA must be the PR base commit SHA.');
    process.exit(1);
  }
  try {
    const findings = documentationFindings(base);
    if (findings.length) {
      for (const finding of findings) console.error(finding.sha + ' missing: ' + finding.missing.join(', '));
      console.error('Every code-containing PR commit must include both PR progress and a dated engineering update.');
      process.exit(1);
    }
    console.log('Per-commit documentation gate passed for the PR.');
  } catch (error) {
    console.error('Could not verify per-commit documentation: ' + String(error.message || error));
    process.exit(1);
  }
}
module.exports = { documentationFindings, needsDocumentation };

