import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import {
  AUTH_CALLBACK, AUTH_TEST_CALLBACK, callbackForAndroidPackage,
  getNativeAuthCallback, readAppUrl,
} from './native';

jest.mock('@capacitor/app', () => ({
  App: { getInfo: jest.fn(), addListener: jest.fn(), getLaunchUrl: jest.fn() },
}));

beforeEach(() => {
  jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
  jest.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
  CapApp.getInfo.mockResolvedValue({ id: 'com.nasrinai.movo' });
});

afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks(); });

test.each([
  ['com.nasrinai.movo', AUTH_CALLBACK],
  ['com.nasrinai.movo.authcheck', AUTH_TEST_CALLBACK],
])('package %s gets its own PKCE return route', async (id, expected) => {
  CapApp.getInfo.mockResolvedValue({ id });
  expect(callbackForAndroidPackage(id)).toBe(expected);
  await expect(getNativeAuthCallback()).resolves.toBe(expected);
});

test('unexpected or unavailable Android package identity never silently uses production callback', async () => {
  CapApp.getInfo.mockResolvedValue({ id: 'com.invalid.app' });
  await expect(getNativeAuthCallback()).rejects.toThrow('android_auth_app_identity_unavailable');
  CapApp.getInfo.mockRejectedValue(new Error('private native error contains data'));
  await expect(getNativeAuthCallback()).rejects.toThrow('android_auth_app_identity_unavailable');
});

test('iOS preserves its original callback and does not query Android package metadata', async () => {
  jest.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios');
  await expect(getNativeAuthCallback()).resolves.toBe(AUTH_CALLBACK);
  expect(CapApp.getInfo).not.toHaveBeenCalled();
});

test('isolated custom callback accepts one code, but never credentials or unsupported log links', () => {
  expect(readAppUrl(AUTH_TEST_CALLBACK + '?code=test-one-time-code')).toEqual({
    kind: 'auth', code: 'test-one-time-code', error: '',
  });
  expect(readAppUrl(AUTH_TEST_CALLBACK + '?access_token=unsafe')).toBeNull();
  expect(readAppUrl(AUTH_TEST_CALLBACK + '?code=one&code=two')).toBeNull();
  expect(readAppUrl('movo-authcheck://log?amount=10')).toBeNull();
});
