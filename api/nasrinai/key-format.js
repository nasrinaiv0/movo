// Return only a classification, never the supplied credential or its identifier.
export function classifyNasrinAIKeyFormat(value) {
  const key = String(value || '').trim();
  if (!key) return 'missing';
  if (/^nss_[0-9a-f]{12}_[0-9a-f]{48}$/.test(key)) return 'secret_format';
  if (/^nsp_[0-9a-f]{12}$/.test(key)) return 'publishable_format';
  return 'invalid_format';
}
