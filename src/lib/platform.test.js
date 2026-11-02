import { Capacitor } from '@capacitor/core';
import { apiUrl, appOrigin, isNativeApp, oauthAvailable, WEB_ORIGIN } from './platform';

afterEach(() => jest.restoreAllMocks());

test('on the web, API calls stay same-origin and links use this site', () => {
  expect(isNativeApp()).toBe(false);
  expect(apiUrl('/api/log')).toBe('/api/log');
  expect(apiUrl('api/nasrinai/chat')).toBe('/api/nasrinai/chat');
  expect(appOrigin()).toBe(window.location.origin);
  expect(oauthAvailable()).toBe(true);
});

test('in the iOS app, API calls and copied links go to the production site', () => {
  jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
  expect(isNativeApp()).toBe(true);
  expect(apiUrl('/api/log')).toBe(`${WEB_ORIGIN}/api/log`);
  expect(appOrigin()).toBe('https://movo.nasrinai.com');
  expect(oauthAvailable()).toBe(false);
});
