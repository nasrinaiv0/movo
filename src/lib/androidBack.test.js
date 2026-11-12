const mockListeners = {};
const mockCalls = { minimize: 0 };
jest.mock('@capacitor/app', () => ({ App: {
  addListener: (name, fn) => { mockListeners[name] = fn; return Promise.resolve({ remove: () => { delete mockListeners[name]; } }); },
  minimizeApp: () => { mockCalls.minimize += 1; return Promise.resolve(); }, exitApp: () => Promise.resolve(), getLaunchUrl: () => Promise.resolve(null),
} }));
jest.mock('@capacitor/browser', () => ({ Browser: {} }));
jest.mock('@capacitor/preferences', () => ({ Preferences: {} }));
jest.mock('@capacitor/local-notifications', () => ({ LocalNotifications: {} }));
jest.mock('@capacitor/core', () => ({ registerPlugin: () => ({}), Capacitor: { isNativePlatform: () => global.__platform !== 'web', getPlatform: () => global.__platform } }));

const flush = () => new Promise(r => setTimeout(r, 0));
afterEach(() => { Object.keys(mockListeners).forEach(k => delete mockListeners[k]); mockCalls.minimize = 0; });

test('on Android the back button and gesture go to MOVO’s own Back; with nothing left the app moves to the background', async () => {
  global.__platform = 'android';
  const { listenForAndroidBack } = require('./native');
  const answers = [true, false]; let asked = 0;
  const onBack = () => answers[asked++];
  const stop = listenForAndroidBack(onBack);
  await flush();
  mockListeners.backButton({ canGoBack: true });
  expect(asked).toBe(1);
  expect(mockCalls.minimize).toBe(0);
  mockListeners.backButton({ canGoBack: false });
  expect(mockCalls.minimize).toBe(1);
  stop();
  expect(mockListeners.backButton).toBeUndefined();
});

test('the iPhone app and the website do not take over the Android back button', async () => {
  const { listenForAndroidBack } = require('./native');
  for (const platform of ['ios', 'web']) {
    global.__platform = platform;
    listenForAndroidBack(() => true)();
    await flush();
    expect(mockListeners.backButton).toBeUndefined();
  }
});
