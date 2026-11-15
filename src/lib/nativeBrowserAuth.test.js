import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { MovoNative, openAuthBrowser } from './native';

const authorizeUrl = 'https://cjsjmorqvuvvwbfyztiz.supabase.co/auth/v1/authorize?provider=google';

jest.mock('@capacitor/core', () => ({
  ...jest.requireActual('@capacitor/core'),
  registerPlugin: jest.fn().mockReturnValue({ openGoogleAuthTab: jest.fn() }),
}));
jest.mock('@capacitor/browser', () => ({
  Browser: { open: jest.fn(), close: jest.fn() },
}));

beforeEach(() => {
  jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
  jest.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
  MovoNative.openGoogleAuthTab.mockResolvedValue({ opened: true });
  Browser.open.mockResolvedValue();
});

afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks(); });

test('Android Google opens an Auth Tab when supported', async () => {
  await openAuthBrowser(authorizeUrl, 'google');
  expect(MovoNative.openGoogleAuthTab).toHaveBeenCalledWith({ url: authorizeUrl });
  expect(Browser.open).not.toHaveBeenCalled();
});

test('Android Google falls back to an external Custom Tab when Auth Tab is unavailable', async () => {
  MovoNative.openGoogleAuthTab.mockResolvedValue({ opened: false });
  await openAuthBrowser(authorizeUrl, 'google');
  expect(Browser.open).toHaveBeenCalledWith({ url: authorizeUrl, presentationStyle: 'popover' });
});

test('Android reports a fixed launch failure without exposing callback data', async () => {
  MovoNative.openGoogleAuthTab.mockRejectedValue(new Error('private OAuth state'));
  await expect(openAuthBrowser(authorizeUrl, 'google')).rejects.toMatchObject({
    code: 'android_auth_browser_unavailable',
    message: 'android_auth_browser_unavailable',
  });
  expect(Browser.open).not.toHaveBeenCalled();
});

test('iOS preserves the existing native Browser and rejection behavior', async () => {
  jest.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios');
  Browser.open.mockRejectedValue(new Error('ios-specific-browser-error'));
  await expect(openAuthBrowser(authorizeUrl, 'google')).rejects.toThrow('ios-specific-browser-error');
  expect(MovoNative.openGoogleAuthTab).not.toHaveBeenCalled();
});

test('Android opens other providers through the existing browser path', async () => {
  await openAuthBrowser('https://example.com', 'apple');
  expect(MovoNative.openGoogleAuthTab).not.toHaveBeenCalled();
  expect(Browser.open).toHaveBeenCalledTimes(1);
});
