import { STRINGS } from '../i18n/strings';
import { t, setLanguage, LANGUAGES } from './i18n';

test('every interface string has all translations', () => {
  const codes = LANGUAGES.map(l => l.code).filter(c => c !== 'en');
  Object.entries(STRINGS).forEach(([en, tr]) => codes.forEach(code => expect([en, code, typeof tr[code] === 'string' && tr[code].length > 0]).toEqual([en, code, true])));
});

test('translates with placeholders, falls back to English and sets direction', () => {
  setLanguage('es');
  expect(t('Total Balance')).toBe('Saldo total');
  expect(t("You've spent {amount} today.", { amount: '€5' })).toBe('Hoy has gastado €5.');
  expect(t('Untranslated text')).toBe('Untranslated text');
  setLanguage('ar');
  expect(document.documentElement.dir).toBe('rtl');
  setLanguage('en');
  expect(document.documentElement.dir).toBe('ltr');
});
