'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const BASE = 'docs/store-compliance';
const COMMON = ['identityRights', 'commercialAssetsAndMarketData', 'legalAndPrivacy', 'ageAndFinancialDeclarations', 'moderationAndAIConsent', 'accountDeletion', 'internationalAvailability', 'metadataAndReviewAccess', 'independentReview'];
const PLATFORM = { apple: ['applePrivacyAndExport', 'appleStoreSetup'], google: ['googleDataSafetyAndFinancial', 'googleStoreSetup'] };
const FINAL = { apple: ['appleSignedDeviceAndLiveBackend','appleStorePurchaseLifecycle'], google: ['googleSignedDeviceAndLiveBackend','googleStorePurchaseLifecycle','androidBinaryAndWear'] };
function sourceFingerprint(root) {
  const tree = execFileSync('git',['ls-tree','-r','-z','HEAD'],{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});
  const excluded = file => file === BASE+'/evidence.json' || file.startsWith(BASE+'/evidence/') || file === 'docs/PR_PROGRESS.md';
  const dirty = execFileSync('git',['diff','--name-only','-z','HEAD','--'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
  const untracked = execFileSync('git',['ls-files','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'});
  if (dirty.length || untracked) throw Error('candidate has uncommitted or untracked changes');
  const records = tree.split('\0').filter(line=>line && !excluded(line.slice(line.indexOf('\t')+1)));
  return crypto.createHash('sha256').update(records.join('\0')).digest('hex');
}
function read(root, file) { return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); }
function metadataGaps(m) {
  const gaps = [];
  if (m?.bundleId !== 'com.nasrinai.movo' || m?.packageName !== 'com.nasrinai.movo') gaps.push('identity');
  if (m?.minimumAge !== 18 || m?.google?.targetAudience !== '18+' || m?.apple?.ageOverride !== '18+') gaps.push('age');
  for (const [platform, fields] of Object.entries({apple:{name:30, subtitle:30, promotionalText:170, keywords:100, description:4000},google:{name:30, shortDescription:80, description:4000}})) {
    for (const [key,max] of Object.entries(fields)) {
      const value = m?.[platform]?.[key];
      if (typeof value !== 'string' || !value.trim() || Array.from(value).length > max || (key === 'keywords' && Buffer.byteLength(value,'utf8') > max)) gaps.push(platform+'.'+key);
    }
  }
  for (const key of ['privacyUrl','termsUrl','deletionUrl','supportUrl']) {
    try { const u = new URL(m?.[key]); if (u.origin !== 'https://movo.nasrinai.com' || u.username || u.password) throw Error(); } catch { gaps.push(key); }
  }
  return gaps;
}
function evidenceGaps(root, e, platform, stage, candidate) {
  if (!Object.hasOwn(PLATFORM,platform) || !['upload','submission'].includes(stage) || !/^[a-f0-9]{64}$/.test(candidate || '')) throw Error('invalid platform, stage or candidate');
  const gaps = [];
  if (e?.schemaVersion !== 1 || e?.candidate !== candidate || e?.bundleId !== 'com.nasrinai.movo') gaps.push('candidate identity');
  const required = [...COMMON, ...PLATFORM[platform], ...(stage === 'submission' ? FINAL[platform] : [])];
  for (const key of required) {
    const r = e?.reviews?.[key];
    try {
      if (r?.status !== 'reviewed' || typeof r.reviewer !== 'string' || !r.reviewer.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(r.reviewedOn || '') || !/^[a-f0-9]{64}$/.test(r.sha256 || '') || typeof r.evidence !== 'string' || !/^docs\/store-compliance\/evidence\/[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(r.evidence)) throw Error();
      const file = path.resolve(root,r.evidence);
      const dir = path.resolve(root,BASE,'evidence');
      if (fs.realpathSync(dir) !== dir || fs.realpathSync(file) !== file || !fs.lstatSync(file).isFile()) throw Error();
      const data = fs.readFileSync(file);
      if (!data.length || crypto.createHash('sha256').update(data).digest('hex') !== r.sha256) throw Error();
    } catch { gaps.push(key); }
  }
  return gaps;
}
function run(root, args) {
  const m = read(root,BASE+'/metadata.json');
  const errors = metadataGaps(m);
  if (errors.length) throw Error('metadata invalid: '+errors.join(', '));
  if (args.length === 1 && args[0] === '--fingerprint') return sourceFingerprint(root);
  if (args.length === 1 && args[0] === '--lint') return 'Metadata structure PASS; no release approval.';
  if (args.length !== 2) throw Error('usage: --lint OR apple|google upload|submission OR --fingerprint');
  const [platform,stage] = args;
  const candidate = sourceFingerprint(root);
  const gaps = evidenceGaps(root,read(root,BASE+'/evidence.json'),platform,stage,candidate);
  if (gaps.length) throw Error('STORE RELEASE HELD: '+gaps.join(', '));
  return 'Evidence structure verified; human authorization and store review still required.';
}
if (require.main === module) { try { console.log(run(path.resolve(__dirname,'..'),process.argv.slice(2))); } catch(e) { console.error(e.message); process.exitCode=1; } }
module.exports = { COMMON, PLATFORM, FINAL, sourceFingerprint, metadataGaps, evidenceGaps, run };
