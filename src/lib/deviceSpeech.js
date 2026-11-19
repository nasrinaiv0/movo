/**
 * Browser/device speech fallback for text replies. Split long responses to avoid
 * Web Speech engines silently stopping on longer utterances (notably mobile Safari).
 * Called synchronously from Listen taps to retain iOS user activation.
 */
export function speechChunks(text, limit = 200) {
  const cleaned = String(text || '').replace(/```[\s\S]*?```/g, ' ')
    .replace(/[*_#>`|]/g, ' ').replace(/\s+/g, ' ').trim();
  const chunks = [];
  let current = '';
  for (const word of cleaned.split(/\s+/).filter(Boolean)) {
    if (current && current.length + word.length + 1 > limit) {
      chunks.push(current); current = '';
    }
    if (word.length > limit) {
      for (let i = 0; i < word.length; i += limit) chunks.push(word.slice(i, i + limit));
    } else current = current ? current + ' ' + word : word;
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * The voice to read with. Prefers the app language, then the device language, then English, so a language the phone
 * has no voice for (for example Filipino on many iPhones) is read aloud instead of silently skipped. Pure; tested.
 */
export function pickVoice(voices, language = 'en-US', deviceLanguage = '') {
  const list = Array.isArray(voices) ? voices.filter(v => v && typeof v.lang === 'string') : [];
  if (!list.length) return null;
  const norm = value => String(value || '').toLowerCase().replace('_', '-');
  const base = value => norm(value).split('-')[0];
  for (const wanted of [language, deviceLanguage, 'en-US', 'en']) {
    if (!wanted) continue;
    const exact = list.filter(v => norm(v.lang) === norm(wanted));
    const same = exact.length ? exact : list.filter(v => base(v.lang) === base(wanted));
    if (same.length) return same.find(v => v.localService) || same.find(v => v.default) || same[0];
  }
  return list.find(v => v.default) || list[0];
}

/**
 * Ask the browser to treat sound as media playback (or a call, while the mic is on), so the iPhone silent switch does
 * not mute spoken replies. WebKit's Audio Session API (Safari and iOS 16.4+); elsewhere this does nothing. Returns
 * whether the type was applied.
 */
export function setAudioSessionType(type) {
  try {
    const session = typeof navigator !== 'undefined' ? navigator.audioSession : null;
    if (!session || !['auto', 'playback', 'play-and-record', 'ambient', 'transient'].includes(type)) return false;
    session.type = type;
    return true;
  } catch { return false; }
}

const START_TIMEOUT_MS = 3500;

export function startDeviceSpeech(text, { language = 'en-US', onEnd, onError, onStart } = {}) {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  const Utterance = typeof window !== 'undefined' && window.SpeechSynthesisUtterance;
  if (!synth || !Utterance) return null;
  const parts = speechChunks(text);
  if (!parts.length) return null;
  let stopped = false;
  let position = 0;
  let current = null;
  let started = false;
  let announced = false;
  let retried = false;
  let delayedStart = null;
  let watchdog = null;
  const clearWatchdog = () => { if (watchdog) { clearTimeout(watchdog); watchdog = null; } };
  const clearPending = () => { clearWatchdog(); clearTimeout(delayedStart); delayedStart = null; };
  const complete = () => { if (!stopped) { stopped = true; current = null; clearPending(); onEnd?.(); } };
  const fail = (error) => { if (!stopped) { stopped = true; current = null; clearPending(); onError?.(error); } };
  const utter = (textPart) => {
    const utterance = new Utterance(textPart);
    let voices = [];
    try { voices = synth.getVoices?.() || []; } catch { /* voices not loaded yet */ }
    const voice = pickVoice(voices, language, typeof navigator !== 'undefined' ? navigator.language : '');
    if (voice) { utterance.voice = voice; utterance.lang = voice.lang; } else utterance.lang = language;
    utterance.onstart = () => {
      if (current !== utterance || stopped) return;
      started = true; clearWatchdog();
      if (!announced) { announced = true; onStart?.(); }
    };
    utterance.onend = () => { if (current === utterance && !stopped) { clearWatchdog(); next(); } };
    utterance.onerror = (event) => {
      if (current !== utterance || stopped) return;
      if (event?.error === 'canceled' || event?.error === 'interrupted') complete();
      else fail(event);
    };
    return utterance;
  };
  const speakNow = (utterance) => {
    current = utterance; // Hold a strong reference while Safari is speaking.
    synth.speak(utterance);
    if (synth.paused) synth.resume?.();
  };
  // WebKit sometimes drops the first utterance without any event (after a cancel, or when its audio is not ready).
  // If nothing has started after a few seconds, try once more, then report it so the person is not left waiting.
  const armWatchdog = () => {
    clearWatchdog();
    watchdog = setTimeout(() => {
      if (stopped || started || synth.speaking) return;
      if (!retried) {
        retried = true;
        // WebKit may synchronously dispatch interrupted from cancel(). Detach
        // the old utterance before cancelling so it cannot complete the retry.
        current = null;
        try { synth.cancel(); } catch { /* nothing to cancel */ }
        position = Math.max(0, position - 1);
        delayedStart = setTimeout(() => {
          try { next(true); } catch (error) { fail(error); }
        }, 80);
        return;
      }
      fail({ error: 'not-started' });
    }, START_TIMEOUT_MS);
  };
  function next(retry = false) {
    if (stopped) return;
    started = false;
    if (!retry) retried = false;
    if (position >= parts.length) { complete(); return; }
    const utterance = utter(parts[position++]);
    speakNow(utterance);
    if (!started) armWatchdog();
  }
  try {
    // Cancelling and speaking in the same moment makes WebKit drop the new utterance, so only cancel when something is
    // actually playing, and then give the engine a moment before speaking (still inside the tap's activation window).
    if (synth.speaking || synth.pending) {
      synth.cancel();
      delayedStart = setTimeout(() => { try { next(); } catch (error) { fail(error); } }, 80);
    } else next();
  } catch (error) { fail(error); return null; }
  return { cancel: () => {
    if (stopped) return;
    stopped = true;
    current = null;
    clearPending();
    try { synth.cancel(); } catch { /* already stopped */ }
  } };
}
