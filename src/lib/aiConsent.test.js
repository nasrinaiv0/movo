import { readAIConsent, setAIConsent, watchAIConsent, aiConsentKey } from './aiConsent';

afterEach(() => { jest.restoreAllMocks(); localStorage.clear(); });
test('withdrawal is owner-scoped, immediately observable and clears the stored marker', () => {
  setAIConsent('owner-one', true); setAIConsent('owner-two', true);
  const changed = jest.fn(); const stop = watchAIConsent('owner-one', changed);
  setAIConsent('owner-two', false); expect(changed).not.toHaveBeenCalled();
  setAIConsent('owner-one', false);
  expect(readAIConsent('owner-one')).toBe(false);
  expect(localStorage.getItem(aiConsentKey('owner-one'))).toBeNull();
  expect(changed).toHaveBeenCalledWith(false);
  stop();
});
test('another browser tab can withdraw consent', () => {
  setAIConsent('owner-one', true);
  const changed = jest.fn(); const stop = watchAIConsent('owner-one', changed);
  localStorage.removeItem(aiConsentKey('owner-one'));
  window.dispatchEvent(new StorageEvent('storage', { key: aiConsentKey('owner-one'), newValue: null }));
  expect(changed).toHaveBeenCalledWith(false);
  stop();
});
test('a storage failure still honors grant and withdrawal within this visit', () => {
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  setAIConsent('restricted-owner', true);
  expect(readAIConsent('restricted-owner')).toBe(true);
  setAIConsent('restricted-owner', false);
  expect(readAIConsent('restricted-owner')).toBe(false);
});
