import { Capacitor } from '@capacitor/core';
import { apiUrl, apiOrigin, appOrigin, isNativeApp, WEB_ORIGIN } from './platform';
import { publicApiOrigin } from './publicApiOrigin.js';

const savedOrigin = process.env.REACT_APP_API_ORIGIN;
beforeEach(() => { delete process.env.REACT_APP_API_ORIGIN; });
afterEach(() => {
  jest.restoreAllMocks();
  if (savedOrigin === undefined) delete process.env.REACT_APP_API_ORIGIN;
  else process.env.REACT_APP_API_ORIGIN = savedOrigin;
});

test('on the web, API calls stay same-origin and links use this site', () => {
  expect(isNativeApp()).toBe(false);
  expect(apiUrl('/api/log')).toBe('/api/log');
  expect(apiUrl('api/nasrinai/chat')).toBe('/api/nasrinai/chat');
  expect(appOrigin()).toBe(window.location.origin);
});

test('a build-time API origin supports an independent host on web and native without changing public links', () => {
  process.env.REACT_APP_API_ORIGIN = 'https://api.movo.example/';
  expect(apiOrigin()).toBe('https://api.movo.example');
  expect(apiUrl('/api/purchases/config?platform=apple')).toBe('https://api.movo.example/api/purchases/config?platform=apple');
  expect(appOrigin()).toBe(window.location.origin);
  jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
  expect(apiUrl('/api/log')).toBe('https://api.movo.example/api/log');
  expect(appOrigin()).toBe(WEB_ORIGIN);
});

test('unsafe API configuration is rejected without exposing credentials or breaking local startup', () => {
  expect(publicApiOrigin('')).toBe('');
  for (const value of ['http://api.example', 'https://name:secret@api.example', 'https://api.example/api', 'https://api.example/?next=evil', 'https://api.example/#fragment', '//api.example', 'https://api.example\\evil', 'https://api.\nexample']) {
    expect(() => publicApiOrigin(value)).toThrow('MOVO API origin must be');
    process.env.REACT_APP_API_ORIGIN = value;
    expect(apiUrl('/api/log')).toBe('/api/log');
  }
});

test('API paths cannot escape the configured origin or access non-API routes', () => {
  process.env.REACT_APP_API_ORIGIN = 'https://api.movo.example';
  for (const value of ['\\evil.example/api/log', '/api/../../owner', '/api/%2e%2e/owner', '/owner', 'https://evil.example/api/log']) {
    expect(() => apiUrl(value)).toThrow('Invalid MOVO API path');
  }
  expect(apiUrl('//api/log')).toBe('https://api.movo.example/api/log');
});

test('in the iOS app, API calls and copied links go to the production site', () => {
  jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
  expect(isNativeApp()).toBe(true);
  expect(apiUrl('/api/log')).toBe(`${WEB_ORIGIN}/api/log`);
  expect(appOrigin()).toBe('https://movo.nasrinai.com');
});
