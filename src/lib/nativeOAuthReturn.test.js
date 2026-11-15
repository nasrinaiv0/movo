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

test('Android processes the same OAuth code once across repeated intent events', () => {
  const url = 'movo://auth-callback?code=one-time-code';
  const onAuth = jest.fn();
  const stop = listenForAppUrls({ onAuth });
  activeHandler({ url });
  activeHandler({ url });
  expect(onAuth).toHaveBeenCalledTimes(1);
  // A new sign-in attempt must not be blocked by the previous code.
  activeHandler({ url: 'movo://auth-callback?code=next-code' });
  expect(onAuth).toHaveBeenCalledTimes(2);
  expect(Browser.close).not.toHaveBeenCalled();
  stop();
});

test('Android does not replay a stale no-code launch URL over a fresh Google callback', async () => {
  CapApp.getLaunchUrl.mockResolvedValue({ url: 'movo-authcheck://auth-callback' });
  const onAuth = jest.fn();
  const stop = listenForAppUrls({ onAuth });
  activeHandler({ url: 'movo-authcheck://auth-callback?code=fresh-google-code' });
  await Promise.resolve();
  expect(CapApp.getLaunchUrl).not.toHaveBeenCalled();
  expect(onAuth.mock.calls).toEqual([[{ kind: 'auth', code: 'fresh-google-code', error: '' }]]);
  stop();
});

test('Android delivers the retained cold-start callback when the listener attaches', () => {
  CapApp.addListener.mockImplementationOnce((_event, handler) => {
    handler({ url: 'movo-authcheck://auth-callback?code=cold-start-code' });
    return Promise.resolve({ remove: removeListener });
  });
  const onAuth = jest.fn();
  const stop = listenForAppUrls({ onAuth });
  expect(onAuth.mock.calls).toEqual([[{ kind: 'auth', code: 'cold-start-code', error: '' }]]);
  stop();
});

test('Android reports a fresh callback with no code', () => {
  const onAuth = jest.fn();
  const stop = listenForAppUrls({ onAuth });
  activeHandler({ url: 'movo-authcheck://auth-callback' });
  expect(onAuth.mock.calls).toEqual([[{ kind: 'auth', code: '', error: '' }]]);
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

test('iOS still processes a launch URL if no appUrlOpen event arrives', async () => {
  jest.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios');
  CapApp.getLaunchUrl.mockResolvedValue({ url: 'movo://auth-callback?code=ios-launch-code' });
  const onAuth = jest.fn();
  const stop = listenForAppUrls({ onAuth });
  await Promise.resolve();
  expect(onAuth.mock.calls).toEqual([[{ kind: 'auth', code: 'ios-launch-code', error: '' }]]);
  expect(Browser.close).toHaveBeenCalledTimes(1);
  stop();
});

test('removed iOS listeners cannot exchange late launch URLs', async () => {
  jest.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios');
  let deliverLaunch;
  CapApp.getLaunchUrl.mockImplementation(() => new Promise(resolve => { deliverLaunch = resolve; }));
  const onAuth = jest.fn();
  const stop = listenForAppUrls({ onAuth });
  stop();
  deliverLaunch({ url: 'movo://auth-callback?code=late-code' });
  await Promise.resolve();
  expect(onAuth).not.toHaveBeenCalled();
});
