import { isInstant, showInstantly } from './motion';

test('after a Back, appearing amounts skip the count-up for a moment, then motion returns', () => {
  const spy = jest.spyOn(performance, 'now');
  spy.mockReturnValue(1000);
  expect(isInstant()).toBe(false);
  showInstantly(500);
  spy.mockReturnValue(1200); expect(isInstant()).toBe(true);
  spy.mockReturnValue(1501); expect(isInstant()).toBe(false);
  spy.mockRestore();
});
