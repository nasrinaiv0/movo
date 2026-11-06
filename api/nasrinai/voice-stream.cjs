'use strict';

/**
 * NasrinAI voice responses may be newline-delimited JSON, SSE (data: ...), or
 * a complete JSON envelope. Never interpret an unconfirmed partial event as
 * the final scoped response. Audio remains bounded and transient.
 */
function parseVoiceResponse(body) {
  const source = String(body || '');
  const events = [];
  try {
    const parsed = JSON.parse(source);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      if (parsed.type === 'done' || !parsed.type) events.push(parsed);
    } else if (Array.isArray(parsed)) events.push(...parsed);
  } catch { /* Streaming response: parse records below. */ }

  if (!events.length) {
    let eventName = '';
    for (const line of source.split(/\r?\n/).slice(0, 10000)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) {
        if (!trimmed) eventName = '';
        continue;
      }
      if (trimmed.startsWith('event:')) { eventName = trimmed.slice(6).trim(); continue; }
      const payload = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed;
      if (!payload || payload === '[DONE]') continue;
      try {
        const item = JSON.parse(payload);
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          events.push(item.type ? item : { ...item, type: eventName || item.type });
        }
      } catch { /* Ignore untrusted non-JSON lines. */ }
      if (events.length >= 5000) break;
    }
  }

  const hasError = events.some(e => e.type === 'error');
  const done = [...events].reverse().find(e => e.type === 'done') ||
    (events.length === 1 && !events[0].type ? events[0] : null);
  const audioParts = [];
  let audioBytes = 0;
  const audio = events.filter(e => e.type === 'audio' && typeof e.data === 'string')
    .map((item, index) => ({ item, index }))
    .sort((a, b) => (Number.isFinite(a.item.seq) ? a.item.seq : a.index) -
                     (Number.isFinite(b.item.seq) ? b.item.seq : b.index));
  for (const { item } of audio) {
    if (audioParts.length >= 40 || item.data.length > 1500000 ||
        audioBytes + item.data.length > 8000000) break;
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(item.data)) continue;
    audioParts.push({
      mime: typeof item.mime === 'string' && /^audio\/(mpeg|wav|mp4|webm)$/i.test(item.mime) ? item.mime : 'audio/mpeg',
      data: item.data
    });
    audioBytes += item.data.length;
  }
  return { done, audioParts, hasError };
}

module.exports = { parseVoiceResponse };
