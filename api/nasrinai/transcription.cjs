'use strict';

const { openRouterConfigured } = require('./openrouter-fallback.cjs');
const OPENROUTER_STT_URL = 'https://openrouter.ai/api/v1/audio/transcriptions';
const DEFAULT_STT_MODEL = 'openai/whisper-large-v3-turbo';
const FORMATS = { 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/mpeg': 'mp3' };

// Both services receive only this clip, never the owner's records or identifiers.
// Do not log audio, provider responses, transcripts or credentials. One fallback
// attempt uses the same existing OpenRouter account and training opt-out as chat.
async function requestTranscript(url, options, timeoutMs, fetchImpl) {
  try {
    const response = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) {
      const failure = await response.json?.().catch(() => null);
      // A configured spending limit is intentional; never bypass it via fallback.
      if (failure?.error === 'budget_reached' || failure?.error?.code === 'budget_reached' || failure?.code === 'budget_reached') {
        return { error: 'transcription_busy', noFallback: true };
      }
      return { error: response.status === 429 ? 'transcription_busy' : 'transcription_unavailable' };
    }
    const result = await response.json();
    if (typeof result?.text !== 'string') return { error: 'transcription_unavailable' };
    // A valid empty transcript is silence; do not send it to another provider.
    return { text: result.text };
  } catch (error) {
    return { error: ['TimeoutError', 'AbortError'].includes(error?.name) ? 'transcription_timeout' : 'transcription_unavailable' };
  }
}

async function transcribeAudio({ audio, mime, nasrinKey, nasrinBase, env = process.env, fetchImpl = globalThis.fetch }) {
  let primary = { error: 'transcription_unavailable' };
  if (nasrinKey) {
    primary = await requestTranscript(nasrinBase + '/v1/transcriptions?name=movo-voice.' + FORMATS[mime], {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + nasrinKey, 'Content-Type': mime, Accept: 'application/json', 'X-Client-Info': 'movo-voice-stt' },
      body: audio
    }, 20000, fetchImpl);
    if (!primary.error || primary.noFallback) return primary;
  }
  if (!openRouterConfigured(env)) return primary;
  const configured = String(env.OPENROUTER_TRANSCRIPTION_MODEL || '').trim();
  const model = configured.length <= 120 && /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._:-]*$/i.test(configured) ? configured : DEFAULT_STT_MODEL;
  const fallback = await requestTranscript(OPENROUTER_STT_URL, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + String(env.OPENROUTER_API_KEY).trim(),
      'Content-Type': 'application/json', Accept: 'application/json',
      'HTTP-Referer': 'https://movo.nasrinai.com', 'X-Title': 'MOVO'
    },
    body: JSON.stringify({ model, input_audio: { data: audio.toString('base64'), format: FORMATS[mime] }, provider: { data_collection: 'deny' } })
  }, 15000, fetchImpl);
  return fallback;
}

module.exports = { transcribeAudio };
