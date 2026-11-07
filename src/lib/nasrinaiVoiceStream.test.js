const { parseVoiceResponse } = require('../../api/nasrinai/voice-stream.cjs');

describe('NasrinAI voice response decoding', () => {
  const done = { type: 'done', reply: 'Your balance is private.', movo_scope: 'current_user_only' };
  const audio = { type: 'audio', seq: 1, mime: 'audio/mpeg', data: 'YXVkaW8=' };

  test('decodes NDJSON and preserves the final scoped envelope', () => {
    const result = parseVoiceResponse([JSON.stringify(audio), JSON.stringify(done)].join('\n'));
    expect(result.done).toEqual(done);
    expect(result.audioParts).toEqual([{ mime: 'audio/mpeg', data: 'YXVkaW8=' }]);
    expect(result.hasError).toBe(false);
  });

  test('accepts SSE and an event: done marker', () => {
    const sse = [
      'event: audio', 'data: ' + JSON.stringify({ seq: 1, mime: 'audio/mpeg', data: 'YXVkaW8=' }), '',
      'event: done', 'data: ' + JSON.stringify({ reply: 'Okay', movo_scope: 'current_user_only' }), '',
      'data: [DONE]'
    ].join('\n');
    const result = parseVoiceResponse(sse);
    expect(result.done).toMatchObject({ type: 'done', reply: 'Okay' });
    expect(result.audioParts).toHaveLength(1);
  });

  test('accepts a complete JSON reply without discarding its scope', () => {
    const result = parseVoiceResponse(JSON.stringify({ reply: 'Done', movo_scope: 'current_user_only' }));
    expect(result.done).toEqual({ reply: 'Done', movo_scope: 'current_user_only' });
  });

  test('fails closed when only partial events or errors are returned', () => {
    expect(parseVoiceResponse('data: ' + JSON.stringify({ type: 'delta', text: 'incomplete' })).done).toBeNull();
    const result = parseVoiceResponse('data: ' + JSON.stringify({ type: 'error', message: 'secret' }));
    expect(result.hasError).toBe(true);
    expect(result.done).toBeNull();
  });

  test('rejects unsafe audio and keeps the 40-part upper bound', () => {
    const bad = { type: 'audio', data: 'data:javascript', mime: 'text/html' };
    const repeated = Array.from({ length: 50 }, (_, seq) => JSON.stringify({ type: 'audio', seq, data: 'YQ==', mime: 'audio/mpeg' }));
    const result = parseVoiceResponse([...repeated, JSON.stringify(bad), JSON.stringify(done)].join('\n'));
    expect(result.audioParts).toHaveLength(40);
    expect(result.audioParts.every(item => item.mime === 'audio/mpeg')).toBe(true);
  });
});
