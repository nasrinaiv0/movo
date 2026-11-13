/**
 * Classify external Supabase Auth errors without ever rendering untrusted error
 * messages, credentials or tokens into MOVO's UI.
 */
export function authErrorCategory(cause) {
  const code = typeof cause?.code === 'string' ? cause.code : '';
  const message = typeof cause?.message === 'string' ? cause.message : '';
  const status = Number(cause?.status);
  const detail = (code + ' ' + message).slice(0, 600).toLowerCase();

  if (/android_auth_browser_unavailable/.test(detail)) return 'android-browser';
  if (/secure_auth_[a-z_]*_failed|secure_auth_storage_native_only|invalid_(?:secure_auth|auth_storage)_(?:key|value)|movonative.{0,80}(?:not implemented|unavailable|not registered)|(?:not implemented|unavailable|not registered).{0,80}movonative/.test(detail)) return 'native-secure-storage';
  if (/invalid.?api.?key|api.?key.?invalid|invalid.?jwt|missing.?api.?key|invalid.?publishable.?key/.test(detail)) {
    return 'invalid-api-key';
  }
  if (/oauth.*not.?configured|oauth_provider_not_supported|provider.*not.?enabled|provider.*disabled|unsupported.?provider/.test(detail)) {
    return 'oauth-not-configured';
  }
  if (status === 429 || /rate.?limit|too.?many.?requests|over_email_send_rate_limit|over_request_rate_limit/.test(detail)) {
    return 'rate-limited';
  }
  if (/email_address_not_authorized|email.?send.?failed|smtp|mail.?provider|email_provider_disabled|otp_disabled|error.?sending.?magic.?link.?email|template.*(invalid|error)|html\/template/.test(detail)) {
    return 'email-delivery';
  }
  if (/otp_expired|otp_disabled_for_user|invalid_otp|token.*expired|expired.*token|invalid.*(code|otp)/.test(detail)) {
    return 'invalid-code';
  }
  if (/failed to fetch|network.?error|network.?request.?failed|load failed|internet.*(not|unavailable)|timeout|timed out/.test(detail)) {
    return 'network';
  }
  return 'unknown';
}
