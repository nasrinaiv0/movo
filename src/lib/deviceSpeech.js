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

export function startDeviceSpeech(text, { language = 'en-US', onEnd, onError } = {}) {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  const Utterance = typeof window !== 'undefined' && window.SpeechSynthesisUtterance;
  if (!synth || !Utterance) return null;
  const parts = speechChunks(text);
  if (!parts.length) return null;
  let stopped = false;
  let position = 0;
  let current = null;
  const complete = () => { if (!stopped) { stopped = true; current = null; onEnd?.(); } };
  const fail = (error) => { if (!stopped) { stopped = true; current = null; onError?.(error); } };
  const next = () => {
    if (stopped) return;
    if (position >= parts.length) { complete(); return; }
    const utterance = new Utterance(parts[position++]);
    utterance.lang = language;
    try {
      const voices = synth.getVoices?.() || [];
      const lang = language.toLowerCase();
      const voice = voices.find(v => v.lang?.toLowerCase() === lang) ||
        voices.find(v => v.lang?.toLowerCase().split('-')[0] === lang.split('-')[0]);
      if (voice) utterance.voice = voice;
    } catch { /* The default voice is fine if voices are not loaded. */ }
    current = utterance; // Hold a strong reference while Safari is speaking.
    utterance.onend = () => { if (current === utterance) next(); };
    utterance.onerror = (event) => {
      if (current !== utterance || stopped) return;
      if (event?.error === 'canceled' || event?.error === 'interrupted') complete();
      else fail(event);
    };
    synth.speak(utterance);
    if (synth.paused) synth.resume?.();
  };
  try {
    synth.cancel();
    next();
  } catch (error) { fail(error); return null; }
  return { cancel: () => {
    if (stopped) return;
    stopped = true;
    current = null;
    try { synth.cancel(); } catch { /* already stopped */ }
  } };
}
