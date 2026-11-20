import { speechChunks, startDeviceSpeech, pickVoice, setAudioSessionType } from './deviceSpeech';

describe('device speech fallback', () => {
  let originalSynth;
  let originalUtterance;
  let synth;
  beforeEach(() => {
    originalSynth = window.speechSynthesis;
    originalUtterance = window.SpeechSynthesisUtterance;
    synth = { cancel: jest.fn(), speak: jest.fn(), resume: jest.fn(), paused: true, getVoices: () => [{ lang: 'en-US', name: 'English' }] };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth });
    window.SpeechSynthesisUtterance = class {
      constructor(text) { this.text = text; }
    };
  });
  afterEach(() => {
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: originalSynth });
    window.SpeechSynthesisUtterance = originalUtterance;
  });

  test('splits long responses and removes markdown before reading', () => {
    const chunks = speechChunks('**Hello** ' + 'word '.repeat(90), 120);
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.every(chunk => chunk.length <= 120)).toBe(true);
    expect(chunks[0]).toContain('Hello');
  });

  test('speaks chunks sequentially with language and resumes paused engine', () => {
    const onEnd = jest.fn();
    const controller = startDeviceSpeech('Hello there. ' + 'word '.repeat(55), { language: 'en-US', onEnd });
    expect(controller).toBeTruthy();
    // Nothing was playing, so nothing is cancelled: WebKit drops an utterance spoken right after a cancel.
    expect(synth.cancel).not.toHaveBeenCalled();
    expect(synth.resume).toHaveBeenCalled();
    let iterations = 0;
    while (!onEnd.mock.calls.length && iterations++ < 20) {
      const u = synth.speak.mock.calls.at(-1)[0];
      expect(u.lang).toBe('en-US');
      u.onend();
    }
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(synth.speak.mock.calls.length).toBeGreaterThan(1);
  });

  test('cancel prevents the next utterance and ignores interruption', () => {
    const onError = jest.fn();
    const controller = startDeviceSpeech('word '.repeat(85), { onError });
    const first = synth.speak.mock.calls[0][0];
    controller.cancel();
    first.onerror?.({ error: 'interrupted' });
    first.onend?.();
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  test('reports playback rejection for UI error handling', () => {
    const onError = jest.fn();
    startDeviceSpeech('Test sentence', { onError });
    synth.speak.mock.calls[0][0].onerror({ error: 'not-allowed' });
    expect(onError).toHaveBeenCalledTimes(1);
  });

  test('when something is already speaking, it is cancelled first and the new reply starts a moment later', () => {
    jest.useFakeTimers();
    try {
      synth.speaking = true;
      startDeviceSpeech('Second reply', {});
      expect(synth.cancel).toHaveBeenCalledTimes(1);
      expect(synth.speak).not.toHaveBeenCalled();
      jest.advanceTimersByTime(100);
      expect(synth.speak).toHaveBeenCalledTimes(1);
    } finally { jest.useRealTimers(); }
  });

  test('if the engine never starts, it retries once and then reports it instead of staying silent', () => {
    jest.useFakeTimers();
    try {
      const onError = jest.fn();
      startDeviceSpeech('Hello', { onError });
      expect(synth.speak).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(3600);
      expect(synth.speak).toHaveBeenCalledTimes(2);
      expect(synth.speak.mock.calls[1][0].text).toBe('Hello');
      expect(onError).not.toHaveBeenCalled();
      jest.advanceTimersByTime(3600);
      expect(onError).toHaveBeenCalledWith({ error: 'not-started' });
    } finally { jest.useRealTimers(); }
  });

  test('a synchronous WebKit interruption from watchdog cancel cannot swallow the retry', () => {
    jest.useFakeTimers();
    try {
      const onEnd = jest.fn(); const onError = jest.fn();
      synth.cancel.mockImplementation(() => synth.speak.mock.calls.at(-1)?.[0].onerror({ error: 'interrupted' }));
      startDeviceSpeech('Retry these words', { onEnd, onError });
      jest.advanceTimersByTime(3600);
      expect(synth.speak).toHaveBeenCalledTimes(2);
      expect(onEnd).not.toHaveBeenCalled();
      const retry = synth.speak.mock.calls[1][0];
      retry.onstart(); retry.onend();
      expect(onEnd).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    } finally { jest.useRealTimers(); }
  });

  test('a dropped later chunk is recovered without repeating the already-spoken chunk', () => {
    jest.useFakeTimers();
    try {
      const onStart = jest.fn(); const onError = jest.fn();
      startDeviceSpeech('word '.repeat(55), { onStart, onError });
      const first = synth.speak.mock.calls[0][0];
      first.onstart(); first.onend();
      const second = synth.speak.mock.calls[1][0];
      jest.advanceTimersByTime(3600);
      expect(synth.speak).toHaveBeenCalledTimes(3);
      expect(synth.speak.mock.calls[2][0].text).toBe(second.text);
      synth.speak.mock.calls[2][0].onstart();
      expect(onStart).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    } finally { jest.useRealTimers(); }
  });

  test('cancelling during retry delay prevents subsequent playback', () => {
    jest.useFakeTimers();
    try {
      const controller = startDeviceSpeech('Hello');
      jest.advanceTimersByTime(3500);
      controller.cancel();
      jest.advanceTimersByTime(1000);
      expect(synth.speak).toHaveBeenCalledTimes(1);
    } finally { jest.useRealTimers(); }
  });

  test('a started reply is never retried', () => {
    jest.useFakeTimers();
    try {
      const onStart = jest.fn(); const onError = jest.fn();
      startDeviceSpeech('Hello', { onStart, onError });
      synth.speak.mock.calls[0][0].onstart();
      expect(onStart).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(10000);
      expect(synth.speak).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    } finally { jest.useRealTimers(); }
  });
});

describe('voice choice and audio session', () => {
  const voices = [{ lang: 'en-GB', name: 'Daniel' }, { lang: 'en-US', name: 'Samantha', localService: true }, { lang: 'es-ES', name: 'Monica' }];
  test('uses the app language, then the device language, then English', () => {
    expect(pickVoice(voices, 'es-MX').name).toBe('Monica');
    expect(pickVoice(voices, 'en-US').name).toBe('Samantha');
    // No Filipino voice on the phone: read in English rather than say nothing.
    expect(pickVoice(voices, 'fil', 'fil-PH').lang).toBe('en-US');
    expect(pickVoice(voices, 'fil', 'en-GB').name).toBe('Daniel');
    expect(pickVoice([], 'en-US')).toBeNull();
  });

  test('the reply is spoken with the chosen voice and its language', () => {
    const original = window.speechSynthesis; const OriginalU = window.SpeechSynthesisUtterance;
    const synth = { cancel: jest.fn(), speak: jest.fn(), getVoices: () => voices };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth });
    window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
    try {
      startDeviceSpeech('Kumusta', { language: 'fil' });
      const u = synth.speak.mock.calls[0][0];
      expect(u.voice.lang).toMatch(/^en/);
      expect(u.lang).toBe(u.voice.lang);
    } finally {
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: original });
      window.SpeechSynthesisUtterance = OriginalU;
    }
  });

  test('sets the browser audio session type where supported, and does nothing elsewhere', () => {
    expect(setAudioSessionType('playback')).toBe(false);
    const session = { type: 'auto' };
    Object.defineProperty(navigator, 'audioSession', { configurable: true, value: session });
    try {
      expect(setAudioSessionType('playback')).toBe(true);
      expect(session.type).toBe('playback');
      expect(setAudioSessionType('loud')).toBe(false);
      expect(session.type).toBe('playback');
    } finally { delete navigator.audioSession; }
  });
});
