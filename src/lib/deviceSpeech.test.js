import { speechChunks, startDeviceSpeech } from './deviceSpeech';

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
    expect(synth.cancel).toHaveBeenCalledTimes(1);
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
});
