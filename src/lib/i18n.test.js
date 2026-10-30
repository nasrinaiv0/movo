import { t, setLanguage, loadLanguage } from './i18n';
const { build } = require('../../scripts/i18n-build');
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
