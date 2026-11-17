import { t, setLanguage, loadLanguage, LANGUAGES, detectLanguage, langInfo } from './i18n';
import { regionalLocale } from './regions';
const { build, validateExtraLocale } = require('../../scripts/i18n-build');
const { extract } = require('../../scripts/i18n-extract');

test('every interface string has all 11 translations with matching placeholders', () => {
  const { keys, problems } = build({ write: false });
  expect(problems).toEqual([]);
  const missing = extract().filter(k => !keys.has(k));
  expect(missing).toEqual([]);
});

test('loads a language, translates with placeholders, falls back to English and sets direction', async () => {
  setLanguage('es');
  await loadLanguage('es');
  expect(t('Total Balance')).toBe('Saldo total');
  expect(t("You've spent {amount} today.", { amount: '€5' })).toBe('Hoy has gastado €5.');
  expect(t('Untranslated text')).toBe('Untranslated text');
  setLanguage('ar');
  expect(document.documentElement.dir).toBe('rtl');
  setLanguage('en');
  expect(t('Total Balance')).toBe('Total Balance');
  expect(document.documentElement.dir).toBe('ltr');
});

test('every limited language has offline preview text, a safe locale and an English fallback', () => {
  const { coverage, count } = build({ write: false });
  expect(LANGUAGES).toHaveLength(97);
  const added = LANGUAGES.filter(language => language.preview);
  expect(added.map(language => language.code)).toEqual(
    LANGUAGES.filter(({ code }) => coverage[code] < count).map(language => language.code),
  );
  const core = ['Home', 'Wallet', 'Transactions', 'Menu', 'Settings', 'Language', 'Search', 'Save', 'Cancel', 'Back', 'Income', 'Expense'];
  for (const { code, dir } of added) {
    const lang = setLanguage(code);
    expect(core.some(key => t(key) !== key)).toBe(true);
    expect(document.documentElement.lang).toBe(code);
    expect(document.documentElement.dir).toBe(dir);
    expect(t('Untranslated text')).toBe('Untranslated text');
    const locale = regionalLocale(lang, 'PH');
    expect(new Intl.NumberFormat(locale, { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(124.50)).toBeTruthy();
    expect(new Intl.DateTimeFormat(locale).format(0)).toBeTruthy();
  }
  expect(t('constructor')).toBe('constructor');
  setLanguage('en');
});

test.each([
  ['tl-PH', 'fil'], ['ceb-PH', 'ceb'], ['cmn-Hans-CN', 'zh'], ['arb', 'ar'], ['ar-EG', 'arz'], ['ar-SA', 'ar'],
  ['pa-Guru-IN', 'pa'], ['pa-Arab-PK', 'pnb'], ['ku-Arab-IQ', 'ckb'], ['ku-Latn-TR', 'kmr'],
  ['fa-AF', 'prs'], ['fa-IR', 'fa'], ['ja-JP', 'ja'], ['unknown', 'en'],
])('maps device language %s to %s', (device, expected) => {
  const languages = jest.spyOn(window.navigator, 'languages', 'get').mockReturnValue([device]);
  try { expect(detectLanguage()).toBe(expected); } finally { languages.mockRestore(); }
});

test('loads expanded Cebuano on demand, preserves placeholders and supports offline reuse', async () => {
  localStorage.removeItem('movo.i18n.cache');
  setLanguage('ceb');
  expect(t('Wallet')).toBe('Pitaka');
  expect(t('Total Spent')).toBe('Total Spent');
  expect(await loadLanguage('ceb')).toBe(true);
  expect(t('Total Spent')).toBe('Kinatibuk-ang gasto');
  expect(t("You've spent {amount} today.", { amount: '₱5' })).toBe('Nakagasto ka og ₱5 karon.');
  setLanguage('en');
  expect(t('Total Spent')).toBe('Total Spent');
  setLanguage('ceb');
  expect(t('Total Spent')).toBe('Kinatibuk-ang gasto');
  setLanguage('en');
});

test('rejects unknown, blank, copied source and placeholder-breaking supplemental translations', () => {
  const keys = new Set(['Save', 'MOVO', 'Paid {amount}', 'Home', 'Wallet']);
  const { problems, covered } = validateExtraLocale('ceb', {
    messages: { Save: 'Save', MOVO: 'MOVO', 'Paid {amount}': 'Gibayad {total}', Home: '', Wallet: 'Pitaka', Banned: 'Gidili' },
    unchanged: ['MOVO'],
  }, keys);
  expect(problems).toHaveLength(4);
  expect([...covered]).toEqual(['MOVO', 'Wallet']);
});

test('preview switching does not leak the previous language and keeps the full locale cache', async () => {
  setLanguage('es');
  await loadLanguage('es');
  setLanguage('ceb');
  expect(t('Wallet')).toBe('Pitaka');
  expect(t('Total Balance')).toBe('Kinatibuk-ang balanse');
  expect(t('Total Spent')).toBe('Total Spent');
  expect(await loadLanguage('es')).toBe(false);
  setLanguage('es');
  expect(t('Total Balance')).toBe('Saldo total');
  expect(regionalLocale(langInfo('th'), 'PH')).toBe('th-PH-u-ca-gregory');
  expect(regionalLocale(langInfo('en'), 'PH-invalid')).toBe('en-PH');
  setLanguage('en');
});
