/*
 * Builds one JSON dictionary per language from the catalogue in src/i18n/catalog/*.js.
 * Each catalogue row is [English, fil, ar, zh, es, it, de, fr, pt, ja, ko, hi].
 * Supplemental locale dictionaries live in src/i18n/extra and load on demand.
 * Output: src/i18n/locales/<code>.json and src/i18n/locales/version.js.
 * Fails if a row has a missing translation or mismatched {placeholders}.
 */
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const CODES = ['fil', 'ar', 'zh', 'es', 'it', 'de', 'fr', 'pt', 'ja', 'ko', 'hi'];
const dir = path.join(__dirname, '..', 'src', 'i18n');
const languages = require('../src/i18n/languages.json');
const preview = require('../src/i18n/preview/core.json');
const placeholders = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');

function validateExtraLocale(code, source, keys) {
  const problems = [];
  const covered = new Set();
  const dictionary = source?.messages;
  const unchanged = source?.unchanged ?? [];
  if (!dictionary || typeof dictionary !== 'object' || Array.isArray(dictionary) || !Array.isArray(unchanged)) {
    return { problems: [`Invalid supplemental locale: ${code}`], covered };
  }
  const acceptedUnchanged = new Set(unchanged);
  if (unchanged.length !== acceptedUnchanged.size) problems.push(`Duplicate unchanged key: ${code}`);
  for (const key of unchanged) {
    if (typeof key !== 'string' || !Object.hasOwn(dictionary, key) || dictionary[key] !== key) problems.push(`Invalid unchanged key: ${code} / ${key}`);
  }
  for (const [key, value] of Object.entries(dictionary)) {
    if (!keys.has(key) || typeof value !== 'string' || !value.trim() || placeholders(value) !== placeholders(key)
        || (value.trim().toLowerCase() === key.trim().toLowerCase() && !acceptedUnchanged.has(key))) {
      problems.push(`Invalid supplemental translation: ${code} / ${key}`);
    } else covered.add(key);
  }
  return { problems, covered };
}

function loadCatalog() {
  const rows = [];
  for (const file of fs.readdirSync(path.join(dir, 'catalog')).filter(f => f.endsWith('.js')).sort()) {
    const src = fs.readFileSync(path.join(dir, 'catalog', file), 'utf8').replace(/export default/, 'return');
    rows.push(...new Function(src)().map(r => ({ file, row: r })));
  }
  return rows;
}

function build({ write = true } = {}) {
  const rows = loadCatalog(); const problems = []; const seen = new Map();
  const dicts = Object.fromEntries(CODES.map(c => [c, {}]));
  for (const { file, row } of rows) {
    if (!Array.isArray(row) || row.length !== CODES.length + 1) {
      problems.push(`${file}: row ${rows.indexOf(rows.find(item => item.file === file && item.row === row)) + 1} must be an array with ${CODES.length + 1} entries`);
      continue;
    }
    const [en, ...tr] = row;
    if (typeof en !== 'string' || !en.trim()) { problems.push(`${file}: row has an empty English key`); continue; }
    if (seen.has(en)) problems.push(`${file}: duplicate key "${en}" (also in ${seen.get(en)})`);
    seen.set(en, file);
    CODES.forEach((c, i) => {
      const v = tr[i];
      if (typeof v !== 'string' || !v.trim()) problems.push(`${file}: "${en}" is missing ${c}`);
      else if (placeholders(v) !== placeholders(en)) problems.push(`${file}: "${en}" ${c} placeholders ${placeholders(v)} ≠ ${placeholders(en)}`);
      else dicts[c][en] = v;
    });
  }
  const codes = new Set(languages.map(([code]) => code));
  if (codes.size !== languages.length) problems.push('Duplicate language codes');
  const expected = new Set(['en', ...CODES, ...Object.keys(preview.translations)]);
  for (const [code, name, englishName, locale, direction = 'ltr'] of languages) {
    if (!expected.delete(code) || !name || !englishName || !['ltr', 'rtl'].includes(direction)) problems.push(`Invalid language record: ${code}`);
    try { Intl.getCanonicalLocales([code, locale]); } catch { problems.push(`Invalid locale metadata: ${code} (${locale})`); }
  }
  for (const code of expected) problems.push(`Unregistered dictionary: ${code}`);
  if (new Set(preview.keys).size !== preview.keys.length || preview.keys.some(key => !seen.has(key))) problems.push('Preview translations must reference unique catalogue keys');
  for (const [code, values] of Object.entries(preview.translations)) {
    if (CODES.includes(code) || code === 'en' || values.length !== preview.keys.length) {
      problems.push(`Invalid preview translation row: ${code}`);
      continue;
    }
    if (!values.some((value, index) => value && value !== preview.keys[index])) problems.push(`Preview ${code} lacks translated text`);
    values.forEach((value, index) => {
      if (value !== null && (typeof value !== 'string' || !value.trim() || placeholders(value) !== placeholders(preview.keys[index]))) problems.push(`Invalid preview translation: ${code} / ${preview.keys[index]}`);
    });
  }
  const keys = new Set(seen.keys());
  const expanded = {};
  const files = {};
  const coverage = Object.fromEntries([...codes].map(code => [code, code === 'en' || CODES.includes(code) ? keys.size : 0]));
  const missingByLocale = {};
  const extraDir = path.join(dir, 'extra');
  for (const file of fs.readdirSync(extraDir).filter(f => f.endsWith('.json')).sort()) {
    const code = path.basename(file, '.json');
    if (!Object.hasOwn(preview.translations, code)) {
      problems.push(`Supplemental locale has no registered language preview: ${code}`);
      continue;
    }
    try { files[code] = JSON.parse(fs.readFileSync(path.join(extraDir, file), 'utf8')); }
    catch (error) { problems.push(`Cannot read supplemental locale ${code}: ${error.message}`); }
  }
  for (const [code, values] of Object.entries(preview.translations)) {
    const covered = new Set(preview.keys.filter((key, index) =>
      typeof values[index] === 'string' && values[index].trim().toLowerCase() !== key.trim().toLowerCase()));
    if (Object.hasOwn(files, code)) {
      const result = validateExtraLocale(code, files[code], keys);
      problems.push(...result.problems);
      for (const key of result.covered) covered.add(key);
      if (result.covered.size) expanded[code] = { complete: covered.size === keys.size };
    }
    coverage[code] = covered.size;
    missingByLocale[code] = [...keys].filter(key => !covered.has(key));
  }
  if (write && !problems.length) {
    fs.mkdirSync(path.join(dir, 'locales'), { recursive: true });
    const hash = crypto.createHash('sha1');
    CODES.forEach(c => { const json = JSON.stringify(dicts[c]); hash.update(json); fs.writeFileSync(path.join(dir, 'locales', `${c}.json`), json); });
    hash.update(JSON.stringify(files));
    hash.update(JSON.stringify(preview));
    fs.writeFileSync(path.join(dir, 'locales', 'version.js'), `/* Generated by scripts/i18n-build.js — do not edit. */\nexport const VERSION = '${hash.digest('hex').slice(0, 12)}';\nexport const EXPANDED_LOCALES = ${JSON.stringify(expanded)};\n`);
  }
  return { keys, problems, count: keys.size, coverage, missingByLocale };
}

module.exports = { build, loadCatalog, CODES, validateExtraLocale };
if (require.main === module) {
  const [command, code] = process.argv.slice(2);
  const { problems, count, coverage, missingByLocale } = build({ write: !command });
  if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
  if (command === '--coverage') console.log(JSON.stringify({ total: count, locales: coverage }, null, 2));
  else if (command === '--missing' && Object.hasOwn(missingByLocale, code)) {
    console.log(JSON.stringify(Object.fromEntries(missingByLocale[code].map(key => [key, ''])), null, 2));
  } else if (!command) {
    const complete = Object.values(coverage).filter(translated => translated === count).length;
    console.log(`i18n: ${count} strings, ${complete} complete catalogs and ${languages.length - complete} limited catalogs`);
  } else {
    console.error('Usage: node scripts/i18n-build.js [--coverage | --missing <language-code>]');
    process.exit(1);
  }
}
