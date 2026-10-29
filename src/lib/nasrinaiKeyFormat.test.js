const { classifyNasrinAIKeyFormat } = require('./nasrinaiKeyFormat');

describe('classifyNasrinAIKeyFormat', () => {
  test('recognizes a server-to-server secret without returning credential data', () => {
    const value = 'nss_0123456789ab_' + 'a'.repeat(48);
    const result = classifyNasrinAIKeyFormat(value);
    expect(result).toBe('secret_format');
    expect(result).not.toContain('0123456789ab');
    expect(result).not.toContain('a'.repeat(48));
  });

  test('distinguishes publishable and malformed keys', () => {
    expect(classifyNasrinAIKeyFormat('nsp_0123456789ab')).toBe('publishable_format');
    expect(classifyNasrinAIKeyFormat('nss_bad')).toBe('invalid_format');
    expect(classifyNasrinAIKeyFormat('')).toBe('missing');
  });
});
