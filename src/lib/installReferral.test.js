const mockInstallReferrer = jest.fn();
let mockPlatform = 'android';
jest.mock('./native', () => ({ MovoNative: { installReferrer: (...args) => mockInstallReferrer(...args) } }));
jest.mock('./platform', () => ({
  ...jest.requireActual('./platform'),
  nativePlatform: () => mockPlatform,
}));

const { captureInstallReferral, referralFromInstallReferrer } = require('./installReferral');
const { PENDING_REFERRAL_EVENT, pendingReferralCode } = require('./referrals');

const PLAY_REFERRER = 'utm_source=movo_referral&utm_medium=qr&movo_ref=M78038';

beforeEach(() => {
  window.localStorage.clear();
  mockPlatform = 'android';
  mockInstallReferrer.mockReset();
});

test('only a MOVO referral link yields a code', () => {
  expect(referralFromInstallReferrer(PLAY_REFERRER)).toBe('M78038');
  expect(referralFromInstallReferrer('utm_source=movo_referral&movo_ref=m12345')).toBe('M12345');
  expect(referralFromInstallReferrer('utm_source=google-play&utm_medium=organic')).toBeNull();
  expect(referralFromInstallReferrer('utm_source=other&movo_ref=M78038')).toBeNull();
  expect(referralFromInstallReferrer('utm_source=movo_referral&movo_ref=<script>')).toBeNull();
  expect(referralFromInstallReferrer('')).toBeNull();
  expect(referralFromInstallReferrer('x'.repeat(2000))).toBeNull();
  expect(referralFromInstallReferrer(null)).toBeNull();
});

test('on Android the Google Play referrer fills in the friend’s code once, and tells open panels', async () => {
  mockInstallReferrer.mockResolvedValue({ referrer: PLAY_REFERRER });
  const heard = jest.fn();
  window.addEventListener(PENDING_REFERRAL_EVENT, heard);
  await expect(captureInstallReferral()).resolves.toBe('M78038');
  expect(pendingReferralCode()).toBe('M78038');
  expect(heard.mock.calls[0][0].detail).toBe('M78038');
  window.removeEventListener(PENDING_REFERRAL_EVENT, heard);
  // Asked once per install.
  await expect(captureInstallReferral()).resolves.toBeNull();
  expect(mockInstallReferrer).toHaveBeenCalledTimes(1);
});

test('a code from a link the person opened is kept; organic installs keep nothing', async () => {
  window.localStorage.setItem('movo.pendingReferral.v1', 'M11111');
  mockInstallReferrer.mockResolvedValue({ referrer: PLAY_REFERRER });
  await expect(captureInstallReferral()).resolves.toBeNull();
  expect(pendingReferralCode()).toBe('M11111');

  window.localStorage.clear();
  mockInstallReferrer.mockResolvedValue({ referrer: 'utm_source=google-play&utm_medium=organic' });
  await expect(captureInstallReferral()).resolves.toBeNull();
  expect(pendingReferralCode()).toBe('');
});

test('an older app build without the bridge tries again next launch; iPhone and web never ask', async () => {
  mockInstallReferrer.mockRejectedValueOnce(new Error('not implemented'));
  await expect(captureInstallReferral()).resolves.toBeNull();
  mockInstallReferrer.mockResolvedValue({ referrer: PLAY_REFERRER });
  await expect(captureInstallReferral()).resolves.toBe('M78038');

  window.localStorage.clear();
  mockInstallReferrer.mockClear();
  for (const platform of ['ios', 'web', null]) {
    mockPlatform = platform;
    await expect(captureInstallReferral()).resolves.toBeNull();
  }
  expect(mockInstallReferrer).not.toHaveBeenCalled();
});

test('the native bridge and its dependency are declared', () => {
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '..', '..');
  const java = fs.readFileSync(path.join(root, 'android/app/src/main/java/com/nasrinai/movo/MovoNativePlugin.java'), 'utf8');
  expect(java).toMatch(/@PluginMethod\s+public void installReferrer\(PluginCall call\)/);
  expect(java).toContain('InstallReferrerClient.newBuilder(getContext()).build()');
  expect(java).toContain('client.endConnection()');
  expect(fs.readFileSync(path.join(root, 'android/app/build.gradle'), 'utf8'))
    .toMatch(/implementation "com\.android\.installreferrer:installreferrer:\d+\.\d+"/);
});
