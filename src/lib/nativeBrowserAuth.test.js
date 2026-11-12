import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { openAuthBrowser } from './native';

jest.mock('@capacitor/browser', () => ({
  Browser: { open: jest.fn(), close: jest.fn() },
}));

afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks(); });

test('Android uses the native Browser plugin for a Google OAuth URL', async () => {
  jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
  jest.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
  Browser.open.mockResolvedValue(undefined);
  await openAuthBrowser('https://cjsjmorqvuvvwbfyztiz.supabase.co/auth/v1/authorize?provider=google');
  expect(Browser.open).toHaveBeenCalledWith({
    url: 'https://cjsjmorqvuvvwbfyztiz.supabase.co/auth/v1/authorize?provider=google',
    presentationStyle: 'popover',
  });
});

test('Android Browser launch errors are safely categorized without echoing the OAuth URL', async () => {
  jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
  jest.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
  Browser.open.mockRejectedValue(new Error('a sensitive error with oauth state'));
  await expect(openAuthBrowser('https://google.example/?state=secret')).rejects.toMatchObject({
    code: 'android_auth_browser_unavailable',
    message: 'android_auth_browser_unavailable',
  });
});

test('iOS preserves native Browser rejection behavior', async () => {
  jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
  jest.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios');
  Browser.open.mockRejectedValue(new Error('ios-specific-browser-error'));
  await expect(openAuthBrowser('https://example.com')).rejects.toThrow('ios-specific-browser-error');
});
