import { wordsToNumbers } from './numberWords';
import { parseLogMessage } from './chatLog';

test('spelled-out amounts become digits', () => {
  expect(wordsToNumbers('I buy banana for two pesos')).toBe('I buy banana for 2 pesos');
  expect(wordsToNumbers('lunch one hundred fifty')).toBe('lunch 150');
  expect(wordsToNumbers('rent five thousand')).toBe('rent 5000');
  expect(wordsToNumbers('Bumili ng bigas dalawang daan')).toBe('Bumili ng bigas 200');
  expect(wordsToNumbers('twenty-five for coffee')).toBe('25 for coffee');
  expect(wordsToNumbers('a coffee and a bagel')).toBe('a coffee and a bagel');
});

test('spoken purchases with number words are logged', () => {
  expect(parseLogMessage('I buy banana for two pesos')[0]).toMatchObject({ type: 'expense', amount: 2, currency: 'PHP', merchant: 'Banana' });
});
