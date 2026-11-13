import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { listenForAppUrls } from './native';

jest.mock('@capacitor/app', () => ({
  App: {
    addListener: jest.fn(),
    getLaunchUrl: jest.fn(),
  },
}));
jest.mock('@capacitor/browser', () => ({
  Browser: { close: jest.fn(), open: jest.fn() },
}));

let activeHandler;
let removeListener;

beforeEach(() => {
  activeHandler = null;
  removeListener = jest.fn();
  CapApp.addListener.mockImplementation((_event, handler) => {
    activeHandler = handler;
    return Promise.resolve({ remove: removeListener });
  });
  CapApp.getLaunchUrl.mockResolvedValue({ url: null });
  Browser.close.mockResolvedValue();
  jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
  jest.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

test('Android receives Google OAuth PKCE callback without calling Browser.close', async () => {
  const onAuth = jest.fn();
  const stop = listenForAppUrls({ onAuth });
  const url = 'movo://auth-callback?code=google-one-time-code';
  activeHandler({ url });
  expect(onAuth).toHaveBeenCalledWith({
    kind: 'auth', code: 'google-one-time-code', error: '',
  });
  expect(Browser.close).not.toHaveBeenCalled();
  stop();
  await Promise.resolve();
  expect(removeListener).toHaveBeenCalledTimes(1);
});

test('Android processes the same OAuth code once across intent and launch URL', async () => {
  const url = 'movo://auth-callback?code=one-time-code';
  CapApp.getLaunchUrl.mockResolvedValue({ url });
  const onAuth = jest.fn();
  const stop = listenForAppUrls({ onAuth });
  activeHandler({ url });
  await Promise.resolve();
  expect(onAuth).toHaveBeenCalledTimes(1);
  // A new sign-in attempt must not be blocked by the previous code.
  activeHandler({ url: 'movo://auth-callback?code=next-code' });
  expect(onAuth).toHaveBeenCalledTimes(2);
  expect(Browser.close).not.toHaveBeenCalled();
  stop();
});

test('Android keeps OAuth error callbacks visible and ignores unrelated links', async () => {
  const onAuth = jest.fn();
  const stop = listenForAppUrls({ onAuth });
  activeHandler({ url: 'movo://not-our-callback?code=untrusted' });
  activeHandler({ url: 'movo://auth-callback?error=access_denied' });
  expect(onAuth).toHaveBeenCalledTimes(1);
  expect(onAuth).toHaveBeenCalledWith({
    kind: 'auth', code: '', error: 'access_denied',
  });
  expect(Browser.close).not.toHaveBeenCalled();
  stop();
});

test('iOS retains explicit browser close and deduplicates repeated PKCE callbacks', () => {
  jest.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios');
  const onAuth = jest.fn();
  const stop = listenForAppUrls({ onAuth });
  const url = 'movo://auth-callback?code=ios-code';
  activeHandler({ url });
  activeHandler({ url });
  expect(onAuth).toHaveBeenCalledTimes(1);
  expect(Browser.close).toHaveBeenCalledTimes(1);
  stop();
});

test('removed listeners cannot exchange late launch URLs', async () => {
  let deliverLaunch;
  CapApp.getLaunchUrl.mockImplementation(() => new Promise(resolve => { deliverLaunch = resolve; }));
  const onAuth = jest.fn();
  const stop = listenForAppUrls({ onAuth });
  stop();
  deliverLaunch({ url: 'movo://auth-callback?code=late-code' });
  await Promise.resolve();
  expect(onAuth).not.toHaveBeenCalled();
});
